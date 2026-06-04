'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, UserPlus, Eye, EyeOff, Copy, Check, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button, Input } from '@/components/ui'

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function AddClientModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState(() => generatePassword())
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleOpen() {
    setFullName('')
    setEmail('')
    setPassword(generatePassword())
    setShowPassword(false)
    setCopied(false)
    setError(null)
    setSuccess(false)
    setOpen(true)
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
    if (success) router.refresh()
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, email, password }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong')
      return
    }

    setSuccess(true)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className="btn btn-gold"
        style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 7 }}
      >
        <UserPlus size={14} />
        Add Client
      </button>

      {/* Backdrop + modal */}
      {open && (
        <div
          onClick={handleClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(2,6,23,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 460,
              background: 'var(--c-surface)',
              borderRadius: 20, overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
              border: '1px solid var(--c-slate-200)',
              position: 'relative',
            }}
          >
            {/* Gold accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: 'linear-gradient(90deg, transparent, var(--c-gold-400), transparent)',
            }} />

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '24px 28px 0',
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-navy-950)', fontFamily: 'var(--font-sans)' }}>
                  Add New Client
                </h2>
                <p style={{ fontSize: 13, color: 'var(--c-slate-500)', marginTop: 3 }}>
                  Create a client account and share their credentials.
                </p>
              </div>
              <button
                onClick={handleClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-slate-400)', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 28px 28px' }}>
              {!success ? (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <Input
                    id="client-name"
                    label="Full Name"
                    placeholder="Jane Smith"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    autoComplete="off"
                  />

                  <Input
                    id="client-email"
                    label="Email Address"
                    type="email"
                    placeholder="client@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(null) }}
                    required
                    autoComplete="off"
                  />

                  {/* Password with show/hide + copy */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-slate-700)' }}>
                        Temporary Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setPassword(generatePassword())}
                        style={{ fontSize: 11, color: 'var(--c-gold-600)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Regenerate
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="input"
                        style={{ paddingRight: 80, fontFamily: 'monospace', letterSpacing: showPassword ? '0.04em' : '0.12em' }}
                      />
                      <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-slate-400)', padding: 4 }}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          type="button"
                          onClick={copyPassword}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--c-green-500)' : 'var(--c-slate-400)', padding: 4 }}
                        >
                          {copied ? <Check size={15} /> : <Copy size={15} />}
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--c-slate-400)', lineHeight: 1.5 }}>
                      Copy this password and share it with the client. They can reset it via "Forgot password?" after signing in.
                    </p>
                  </div>

                  {error && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '12px 14px', borderRadius: 10,
                      background: '#fef2f2', border: '1px solid #fecaca',
                      fontSize: 13, color: '#991b1b',
                    }}>
                      <AlertCircle size={15} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
                      {error}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={handleClose}
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="gold"
                      size="md"
                      loading={loading}
                      style={{ flex: 1 }}
                    >
                      <UserPlus size={14} />
                      Create Client
                    </Button>
                  </div>
                </form>
              ) : (
                /* Success state */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingTop: 8, textAlign: 'center' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CheckCircle2 size={26} color="#16a34a" />
                  </div>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-navy-950)', marginBottom: 6 }}>
                      Client created!
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--c-slate-500)', lineHeight: 1.6 }}>
                      <strong style={{ color: 'var(--c-navy-950)' }}>{fullName || email}</strong> has been added.<br />
                      Share their email and temporary password so they can log in.
                    </p>
                  </div>

                  {/* Credentials summary */}
                  <div style={{
                    width: '100%', padding: '14px 16px', borderRadius: 10,
                    background: 'var(--c-slate-100)', border: '1px solid var(--c-slate-200)',
                    textAlign: 'left',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--c-slate-500)', fontWeight: 600 }}>Email</span>
                      <span style={{ fontSize: 12, color: 'var(--c-navy-950)', fontWeight: 700 }}>{email}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--c-slate-500)', fontWeight: 600 }}>Temp Password</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--c-navy-950)', fontWeight: 700, fontFamily: 'monospace' }}>{password}</span>
                        <button
                          type="button"
                          onClick={copyPassword}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--c-green-500)' : 'var(--c-slate-400)' }}
                        >
                          {copied ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <Button variant="gold" size="md" onClick={handleClose} style={{ width: '100%' }}>
                    Done
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
