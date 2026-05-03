'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * OAuth Callback Page
 *
 * After Google auth, InsForge redirects back here with ?insforge_code=...
 * The SDK client (created via createClient) automatically detects that param
 * on initialization and exchanges the code for a session in the background.
 *
 * We poll getCurrentUser() until the session is ready, then redirect to /dashboard.
 * If 10 seconds pass without a session, we redirect to /login with an error.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    async function waitForSession() {
      const insforge = createClient()
      const deadline = Date.now() + 10_000  // 10-second timeout
      const interval = 300                   // poll every 300ms

      while (Date.now() < deadline) {
        const { data: { user } } = await insforge.auth.getCurrentUser()
        if (user) {
          // Use type assertion to access the internal tokenManager
          const session = (insforge as any).tokenManager?.getSession()
          if (session?.accessToken) {
            // Set a manual cookie so the Middleware can see the session immediately
            document.cookie = `insforge_access_token=${session.accessToken}; path=/; max-age=3600; SameSite=Lax`
          }
          router.replace('/dashboard')
          return
        }
        await new Promise(r => setTimeout(r, interval))
      }

      // Timed out — send back to login with error hint
      router.replace('/login?error=oauth_timeout')
    }

    waitForSession()
  }, [router])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'var(--c-navy-950)', gap: 20,
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 60% at 50% 40%, rgba(212,160,23,0.09) 0%, transparent 65%)',
      }} />

      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        {/* Spinner */}
        <div className="anim-spin" style={{
          width: 52, height: 52, borderRadius: '50%', margin: '0 auto 24px',
          border: '3px solid rgba(255,255,255,0.08)',
          borderTopColor: 'var(--c-gold-400)',
        }} />
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#f8fafc', marginBottom: 8 }}>
          Signing you in…
        </p>
        <p style={{ fontSize: 14, color: 'var(--c-slate-500)' }}>
          Completing Google authentication, please wait.
        </p>
      </div>
    </div>
  )
}
