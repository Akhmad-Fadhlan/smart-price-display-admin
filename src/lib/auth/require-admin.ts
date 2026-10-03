import { AppError } from '../http/errors';
import { createServerSupabaseClient } from '../supabase/server';
import { store } from '../storage/store';

export async function requireAdmin() {
  const supabaseServer = await createServerSupabaseClient();

  if (supabaseServer) {
    const {
      data: { user },
      error,
    } = await supabaseServer.auth.getUser();

    if (error || !user) {
      throw new AppError('UNAUTHENTICATED', 401, 'Anda harus login terlebih dahulu');
    }

    // 1. Check user role in public.users table
    const { data: dbUser } = await supabaseServer
      .from('users')
      .select('id, email, role')
      .eq('id', user.id)
      .single();

    let userRole = dbUser?.role;

    // 2. Fallback check: query public.admin_allowlist if dbUser is missing or role is pending
    if (!userRole || userRole === 'pending') {
      const { data: allowlist } = await supabaseServer
        .from('admin_allowlist')
        .select('role')
        .ilike('email', user.email || '')
        .maybeSingle();

      if (allowlist?.role) {
        userRole = allowlist.role;
      }
    }

    if (!userRole || !['owner', 'admin'].includes(userRole)) {
      throw new AppError('FORBIDDEN', 403, 'Akses khusus Admin / Owner. Email Anda belum mendapat hak akses admin.');
    }

    return { user: { id: user.id, email: user.email, role: userRole } };
  }

  // Standalone / Demo fallback mode when Supabase is not configured
  return { user: { id: 'usr-admin-1', email: 'admin@email.com', role: 'owner' } };
}
