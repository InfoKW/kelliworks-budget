import { createClient } from './server'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const sessionToken = request.cookies.get('insforge_access_token')?.value

  const insforge = await createClient()

  // Verify session
  const { data: { user } } = await insforge.auth.getCurrentUser()

  // Define route types
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password')
  const isClientRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/budget') || pathname.startsWith('/transactions') || pathname.startsWith('/alerts') || pathname.startsWith('/settings')
  const isAdminRoute = pathname.startsWith('/admin')

  // Redirect if no user and trying to access protected routes
  if (!user && (isClientRoute || isAdminRoute) && !sessionToken) {
    if (pathname !== '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Redirect if user and trying to access auth routes
  if (user && isAuthRoute && !pathname.startsWith('/auth/callback')) {
    if (pathname !== '/dashboard') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}
