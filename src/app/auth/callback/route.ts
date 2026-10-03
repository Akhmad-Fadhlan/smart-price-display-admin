import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const userEmail = userData.user.email || '';

          // 1. Check user role in public.users table
          const { data: dbUser } = await supabase
            .from('users')
            .select('role')
            .eq('id', userData.user.id)
            .maybeSingle();

          let role = dbUser?.role;

          // 2. Check public.admin_allowlist and sync role if pending or missing
          const { data: allowlist } = await supabase
            .from('admin_allowlist')
            .select('role')
            .ilike('email', userEmail)
            .maybeSingle();

          if (allowlist?.role && allowlist.role !== 'pending') {
            role = allowlist.role;
            // Upsert into public.users table with allowed role
            await supabase.from('users').upsert({
              id: userData.user.id,
              email: userEmail,
              name: userData.user.user_metadata?.full_name || userEmail,
              avatar_url: userData.user.user_metadata?.avatar_url || null,
              role: allowlist.role,
              updated_at: new Date().toISOString(),
            });
          }

          if (!role || role === 'pending') {
            return NextResponse.redirect(`${origin}/access-pending`);
          }
        }
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return user to login if auth exchange failed
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
