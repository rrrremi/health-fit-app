import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect routes
  if (!user && request.nextUrl.pathname.startsWith('/protected')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Admin route protection
  if (request.nextUrl.pathname.startsWith('/protected/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/protected/workouts', request.url))
    }
  }
  
  // Redirect authenticated users away from auth pages
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/protected/workouts', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Exclude Next.js internals and all typical static asset extensions from middleware
    // to prevent intercepting requests for CSS/JS chunks and other static files.
    '/((?!api|_next/static|_next/image|favicon.ico|site.webmanifest|manifest.json|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff|woff2|ttf|eot)$).*)',
  ],
}
