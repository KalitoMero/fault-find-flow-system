import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user is authenticated and is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError || !roles?.some(r => r.role === 'admin')) {
      throw new Error('Forbidden: Admin access required');
    }

    const { action, data } = await req.json();

    switch (action) {
      case 'list': {
        // List all employees with their auth info
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('*');
        if (profilesError) throw profilesError;

        const { data: userRoles, error: rolesError } = await supabaseAdmin
          .from('user_roles')
          .select('user_id, role');
        if (rolesError) throw rolesError;

        const employees = profiles.map((profile: any) => {
          const authUser = users.find((u: any) => u.id === profile.id);
          const roles = userRoles.filter((r: any) => r.user_id === profile.id);

          return {
            id: profile.id,
            name: profile.name,
            departmentId: profile.department_id || '',
            personalNumber: profile.personal_number,
            isTeamLeader: roles.some((r: any) => r.role === 'teamleader'),
            isAdmin: roles.some((r: any) => r.role === 'admin'),
            account: authUser ? {
              username: authUser.email?.split('@')[0] || '',
              email: authUser.email || '',
              password: '********'
            } : undefined
          };
        });

        return new Response(JSON.stringify({ employees }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create': {
        const { name, departmentId, email, password, personalNumber, isTeamLeader, isAdmin } = data;

        // Create auth user (handle_new_user trigger will create the profile automatically)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('User creation failed');

        // Update profile with department and personal number (profile already exists from trigger)
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            department_id: departmentId,
            personal_number: personalNumber
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;

        // Assign roles
        const rolesToInsert: any[] = [];
        if (isAdmin) rolesToInsert.push({ user_id: authData.user.id, role: 'admin' });
        if (isTeamLeader) rolesToInsert.push({ user_id: authData.user.id, role: 'teamleader' });
        if (!isAdmin && !isTeamLeader) {
          rolesToInsert.push({ user_id: authData.user.id, role: 'employee' });
        }

        if (rolesToInsert.length > 0) {
          const { error: rolesError } = await supabaseAdmin
            .from('user_roles')
            .insert(rolesToInsert);

          if (rolesError) throw rolesError;
        }

        return new Response(JSON.stringify({ success: true, userId: authData.user.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update': {
        const { id, name, departmentId, personalNumber, isTeamLeader, isAdmin } = data;

        // Update profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            name,
            department_id: departmentId,
            personal_number: personalNumber
          })
          .eq('id', id);

        if (profileError) throw profileError;

        // Update roles - delete all existing roles first
        const { error: deleteRolesError } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', id);

        if (deleteRolesError) throw deleteRolesError;

        // Insert new roles
        const rolesToInsert: any[] = [];
        if (isAdmin) rolesToInsert.push({ user_id: id, role: 'admin' });
        if (isTeamLeader) rolesToInsert.push({ user_id: id, role: 'teamleader' });
        if (!isAdmin && !isTeamLeader) {
          rolesToInsert.push({ user_id: id, role: 'employee' });
        }

        if (rolesToInsert.length > 0) {
          const { error: insertRolesError } = await supabaseAdmin
            .from('user_roles')
            .insert(rolesToInsert);

          if (insertRolesError) throw insertRolesError;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        const { id } = data;

        // Delete auth user (profile and roles will cascade)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (deleteError) throw deleteError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
