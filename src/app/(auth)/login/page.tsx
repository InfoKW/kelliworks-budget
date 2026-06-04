'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShaderAnimation } from '@/components/ui/shader-animation'
import { Button, Card, Divider, Input } from '@/components/ui'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const redirecting = useRef(false)

  // Show error from URL param (e.g. after OAuth redirect)
  useEffect(() => {
    if (searchParams.get('error') === 'not_registered') {
      setError('This account has not been set up. Please contact your KelliWorks advisor to get access.')
    }
  }, [searchParams])

  // Redirect already-logged-in users (run once on mount only)
  useEffect(() => {
    async function checkUser() {
      const insforge = createClient()
      const { data: { user } } = await insforge.auth.getCurrentUser()
      if (user && !redirecting.current) {
        redirecting.current = true
        const { data: profile } = await insforge.database
          .from('profiles').select('role').eq('id', user.id).single()
        const dest = profile?.role === 'admin' ? '/admin' : '/dashboard'
        router.replace(dest)
      }
    }
    checkUser()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const insforge = createClient()
    const { error: signInError } = await insforge.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await insforge.auth.getCurrentUser()
    const { data: profile } = await insforge.database
      .from('profiles').select('role').eq('id', user!.id).single()

    // Block anyone not pre-added by an admin
    if (!profile) {
      await insforge.auth.signOut()
      setError('This account has not been set up. Please contact your KelliWorks advisor to get access.')
      setLoading(false)
      return
    }

    redirecting.current = true
    const dest = profile.role === 'admin' ? '/admin' : '/dashboard'
    router.push(dest)
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
  }

  const busy = loading || googleLoading

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px', position: 'relative', overflow: 'hidden', background: '#000',
    }}>
      <ShaderAnimation />
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

        <Card accent padding="32px 32px 36px" style={{ boxShadow: 'var(--shadow-premium)' }}>

          {/* Heading */}
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 19, fontWeight: 700, color: 'var(--c-navy-950)', textAlign: 'center', marginBottom: 24 }}>
            Sign in to your account
          </h1>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={busy}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '13px 20px', borderRadius: 12, marginBottom: 24, cursor: busy ? 'not-allowed' : 'pointer',
              background: '#ffffff', border: '1px solid var(--c-slate-300)',
              color: 'var(--c-slate-800)', fontSize: 15, fontWeight: 600, transition: 'all 0.2s ease',
              opacity: busy ? 0.6 : 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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

          <Divider label="or sign in with email" style={{ marginBottom: 24 }} />

          {/* Email / password form */}
          <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Input
              id="email"
              type="email"
              label="Email address"
              autoComplete="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null) }}
              required
              placeholder="you@example.com"
            />

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
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null) }}
                required
                placeholder="••••••••"
                className="input"
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

            <Button
              type="submit"
              variant="gold"
              size="lg"
              loading={loading}
              disabled={googleLoading}
              style={{ marginTop: 4, width: '100%', borderRadius: 12 }}
            >
              Sign in
            </Button>
          </form>
        </Card>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
          Secure &amp; Encrypted · Powered by KelliWorks
        </p>
      </div>
    </div>
  )
}
