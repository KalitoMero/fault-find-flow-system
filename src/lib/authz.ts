import { supabase } from "@/integrations/supabase/client";

/**
 * Checks if the current user has admin role via server-side RPC
 * @returns Promise<boolean> - true if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { data, error } = await (supabase as any).rpc("is_admin");
    if (error) {
      console.error("Admin check error:", error);
      return false;
    }
    return !!data;
  } catch (error) {
    console.error("Unexpected error in isAdmin:", error);
    return false;
  }
}

/**
 * Throws an error if the current user is not an admin
 * @throws Error with message "forbidden" if user is not admin
 */
export async function requireAdminOrThrow(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error("forbidden");
  }
}
