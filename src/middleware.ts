import { createServerClient } from '@supabase/ssr'; 
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const path = request.nextUrl.pathname;

  // Allow public static assets and device API endpoints
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api/device') ||
    path === '/favicon.ico'
  ) {
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Standalone / Demo Mode when Supabase is not configured
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: any[]) {
        cookiesToSet.forEach(({ name, value }: { name: string; value: string }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: any }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Fetch authenticated user from Supabase Session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    !path.startsWith('/login') &&
    !path.startsWith('/auth/callback') &&
    !path.startsWith('/access-pending')
  ) {
    // Unauthenticated user attempting to access protected route -> redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && path === '/login') {
    // Authenticated user attempting to access login page -> redirect to dashboard
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
