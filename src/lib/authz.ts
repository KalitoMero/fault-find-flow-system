import api from '@/lib/apiClient';

/**
 * Checks if the current user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const data = await api.get('/api/auth/me');
    return data.roles?.includes('admin') || false;
  } catch {
    return false;
  }
}

/**
 * Throws an error if the current user is not an admin
 */
export async function requireAdminOrThrow(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error("forbidden");
  }
}
