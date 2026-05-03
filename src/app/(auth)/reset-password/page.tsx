'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const insforge = createClient()
    const { error } = await insforge.auth.sendResetPasswordEmail({ email })
    if (error) { setError(error.message) } else { setSent(true) }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px', background: 'var(--c-navy-950)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, height: 600, pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(212,160,23,0.09) 0%, transparent 65%)',
      }} />

      <div className="anim-fade-up" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 8 }} className="text-gold">
            KelliWorks
          </div>
          <p style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--c-slate-500)', fontWeight: 600 }}>
            Client Financial Portal
          </p>
        </div>

        <div className="glass-card" style={{ borderRadius: 24, padding: '36px 32px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(232,197,71,0.4), transparent)',
          }} />

          {sent ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div className="anim-float" style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 12 }}>
                Check your inbox
              </h1>
              <p style={{ color: 'var(--c-slate-400)', lineHeight: 1.65, marginBottom: 28, fontSize: 14 }}>
                We sent a reset link to <strong style={{ color: '#f8fafc' }}>{email}</strong>
              </p>
              <a href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--c-gold-400)' }}>
                ← Back to sign in
              </a>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>
                  Reset your password
                </h1>
                <p style={{ fontSize: 14, color: 'var(--c-slate-400)', lineHeight: 1.5 }}>
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleReset} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label htmlFor="email" style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-slate-300)' }}>
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="input"
                  />
                </div>

                {error && (
                  <div role="alert" style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                    borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                    fontSize: 13, color: '#fca5a5',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', flexShrink: 0 }} />
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn btn-gold"
                  style={{ width: '100%', padding: '14px 24px', fontSize: 15, borderRadius: 12 }}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span className="anim-spin" style={{ width: 16, height: 16, border: '2px solid rgba(2,4,15,0.3)', borderTopColor: 'var(--c-navy-950)', borderRadius: '50%', display: 'inline-block' }} />
                      Sending…
                    </span>
                  ) : 'Send reset link'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <a href="/login" style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-gold-400)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  ← Back to sign in
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
