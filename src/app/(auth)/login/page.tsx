'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShaderAnimation } from '@/components/ui/shader-animation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const redirecting = useRef(false)

  useEffect(() => {
    if (redirecting.current) return

    async function checkUser() {
      const insforge = createClient()
      const { data: { user } } = await insforge.auth.getCurrentUser()
      if (user && !redirecting.current) {
        redirecting.current = true
        // Sync cookie if found on client
        const session = (insforge as any).tokenManager?.getSession()
        if (session?.accessToken) {
          document.cookie = `insforge_access_token=${session.accessToken}; path=/; max-age=3600; SameSite=Lax`
        }
        router.replace('/dashboard')
      }
    }
    checkUser()
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const insforge = createClient()
    const { error } = await insforge.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function handleGoogleLogin() {
    setError(null)
    setGoogleLoading(true)
    const insforge = createClient()
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error } = await insforge.auth.signInWithOAuth({ provider: 'google', redirectTo })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
    // On success the SDK auto-redirects the browser to Google — nothing else needed
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px', position: 'relative', overflow: 'hidden', background: '#000',
    }}>
      {/* Shader background */}
      <ShaderAnimation />

      {/* Dark overlay so the card stays readable */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', pointerEvents: 'none', zIndex: 1 }} />

      <div className="anim-fade-up" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 2 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 8, color: 'var(--c-gold-500)' }}>
            KelliWorks
          </div>
          <p style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            Client Financial Portal
          </p>
        </div>

        {/* Card */}
        <div className="glass-card" style={{ borderRadius: 24, padding: '36px 32px', position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-premium)' }}>
          {/* Top accent line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: 'linear-gradient(90deg, transparent, var(--c-gold-400), transparent)',
            borderRadius: '24px 24px 0 0',
          }} />

          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 700, color: 'var(--c-navy-950)', textAlign: 'center', marginBottom: 28 }}>
            Sign in to your account
          </h1>

          {/* ── Google OAuth ──────────────────────────── */}
          <button
            type="button"
            id="google-login-btn"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '13px 20px', borderRadius: 12, marginBottom: 24, cursor: 'pointer',
              background: '#ffffff', border: '1px solid var(--c-slate-300)',
              color: 'var(--c-slate-800)', fontSize: 15, fontWeight: 600, transition: 'all 0.2s ease',
              opacity: (googleLoading || loading) ? 0.6 : 1,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            {googleLoading ? (
              <span className="anim-spin" style={{ width: 18, height: 18, border: '2px solid var(--c-slate-200)', borderTopColor: 'var(--c-slate-600)', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.712A5.419 5.419 0 013.682 9c0-.593.102-1.17.282-1.712V4.956H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.044l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.956L3.964 6.288C4.672 4.161 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            {googleLoading ? 'Redirecting to Google…' : 'Continue with Google'}
          </button>

          {/* ── Divider ──────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--c-slate-200)' }} />
            <span style={{ fontSize: 12, color: 'var(--c-slate-500)', fontWeight: 500 }}>or sign in with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--c-slate-200)' }} />
          </div>

          {/* ── Email / password form ─────────────────── */}
          <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label htmlFor="email" style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-slate-700)' }}>
                Email address
              </label>
              <input
                id="email" type="email" autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@example.com" className="input"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label htmlFor="password" style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-slate-700)' }}>
                  Password
                </label>
                <a href="/reset-password" style={{ fontSize: 12, color: 'var(--c-gold-600)', fontWeight: 500 }}>
                  Forgot password?
                </a>
              </div>
              <input
                id="password" type="password" autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••" className="input"
              />
            </div>

            {error && (
              <div role="alert" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 10,
                background: '#fef2f2', border: '1px solid #fecaca',
                fontSize: 13, color: '#991b1b',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', flexShrink: 0 }} />
                {error}
              </div>
            )}

            <button
              type="submit"
              id="email-login-btn"
              disabled={loading || googleLoading}
              className="btn btn-gold"
              style={{ marginTop: 4, width: '100%', padding: '14px 24px', fontSize: 15, borderRadius: 12 }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className="anim-spin" style={{ width: 16, height: 16, border: '2px solid rgba(2,4,15,0.3)', borderTopColor: 'var(--c-navy-950)', borderRadius: '50%', display: 'inline-block' }} />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
          Secure &amp; Encrypted · Powered by KelliWorks
        </p>
      </div>
    </div>
  )
}
