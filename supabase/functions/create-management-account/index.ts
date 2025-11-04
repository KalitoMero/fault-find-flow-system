import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    )

    // Verify that the requesting user is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Keine Autorisierung')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Ungültiger Benutzer')
    }

    // Check if user has admin role
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    
    const isAdmin = roles?.some(r => r.role === 'admin')
    if (!isAdmin) {
      throw new Error('Keine Berechtigung')
    }

    const { username, password, name } = await req.json()

    // Validate input
    if (!username || !password || !name) {
      throw new Error('Benutzername, Passwort und Name sind erforderlich')
    }

    const normalizedUsername = username.trim().toLowerCase()
    const email = `${normalizedUsername}@internal.local`

    // Check if username already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('username', normalizedUsername)
      .maybeSingle()

    if (existingProfile) {
      throw new Error('Dieser Benutzername ist bereits vergeben')
    }

    // Create user with admin API (bypasses email validation)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password.trim(),
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: name.trim(),
        username: normalizedUsername
      }
    })

    if (createError) throw createError
    if (!newUser.user) throw new Error('Benutzer konnte nicht erstellt werden')

    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        username: normalizedUsername,
        name: name.trim()
      })
      .eq('id', newUser.user.id)

    if (profileError) throw profileError

    // Upsert management role (handle_new_user trigger creates employee role first)
    // Delete existing roles first to avoid unique constraint violation
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', newUser.user.id)

    // Insert new management role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'management'
      })

    if (roleError) {
      console.error('Role insert error:', roleError)
      throw roleError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        username: normalizedUsername,
        userId: newUser.user.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Ein Fehler ist aufgetreten'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
