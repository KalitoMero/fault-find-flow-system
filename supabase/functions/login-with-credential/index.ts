import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { credential, password } = await req.json();

    console.log('Login attempt with credential:', credential);

    // Initialize Supabase admin client
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

    // Initialize Supabase client for authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Try to find user by personal_number or username
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, personal_number, username')
      .or(`personal_number.eq.${credential},username.eq.${credential}`)
      .maybeSingle();

    if (profileError || !profile) {
      console.log('Profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Profile found for user:', profile.id);

    // Get email from auth.users
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id);

    if (userError || !user?.email) {
      console.log('User not found in auth:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Attempting sign in with email:', user.email);

    // Try to sign in with email and password
    const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (signInError) {
      console.log('Sign in error:', signInError);
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sign in successful');

    return new Response(
      JSON.stringify({ 
        session: data.session,
        user: data.user 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in login-with-credential:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
