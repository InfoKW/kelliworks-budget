'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Trash2, AlertTriangle } from 'lucide-react'

interface Props {
  clientId: string
  clientEmail: string
  clientName: string
}

export default function ClientActionsMenu({ clientId, clientEmail, clientName }: Props) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [inputEmail, setInputEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function openModal() {
    setMenuOpen(false)
    setInputEmail('')
    setError(null)
    setModalOpen(true)
  }

  function closeModal() {
    if (loading) return
    setModalOpen(false)
    setInputEmail('')
    setError(null)
  }

  async function handleDelete() {
    if (inputEmail !== clientEmail) {
      setError('Email does not match. Please retype the client email exactly.')
      return
    }
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/admin/clients/${clientId}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong')
      setLoading(false)
      return
    }
    router.push('/admin/clients')
    router.refresh()
  }

  const confirmed = inputEmail === clientEmail

  return (
    <>
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setMenuOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 38, height: 38, borderRadius: 10, border: '1px solid var(--c-slate-200)',
            background: 'var(--c-slate-100)', cursor: 'pointer', color: 'var(--c-slate-600)',
          }}
        >
          <MoreVertical size={16} />
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
            background: 'white', border: '1px solid var(--c-slate-200)', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: 160, overflow: 'hidden',
          }}>
            <button
              type="button"
              onClick={openModal}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: 'var(--c-red-500)', textAlign: 'left',
              }}
            >
              <Trash2 size={13} />
              Delete Client
            </button>
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(2,6,23,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--c-surface)', borderRadius: 20,
              border: '1px solid var(--c-slate-200)',
              boxShadow: '0 24px 56px -8px rgba(0,0,0,0.18)',
              width: '100%', maxWidth: 460, overflow: 'hidden',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '24px 28px 20px', borderBottom: '1px solid var(--c-slate-100)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <AlertTriangle size={18} color="var(--c-red-500)" />
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--c-navy-950)', lineHeight: 1 }}>Delete Client</h2>
                <p style={{ fontSize: 13, color: 'var(--c-slate-500)', marginTop: 4 }}>This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{
                padding: '14px 16px', borderRadius: 10,
                background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
                fontSize: 13, color: '#991b1b', lineHeight: 1.6,
              }}>
                Deleting <strong>{clientName}</strong> will permanently remove their account,
                all budgets, transactions, and alerts. They will immediately lose access to the client portal.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-slate-700)' }}>
                  Type <span style={{ fontFamily: 'monospace', color: 'var(--c-red-500)' }}>{clientEmail}</span> to confirm
                </label>
                <input
                  type="email"
                  value={inputEmail}
                  onChange={e => { setInputEmail(e.target.value); setError(null) }}
                  placeholder={clientEmail}
                  autoComplete="off"
                  className="input"
                  style={{ borderColor: error ? 'var(--c-red-500)' : undefined }}
                />
              </div>

              {error && (
                <p style={{ fontSize: 13, color: '#991b1b', padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca' }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  style={{
                    padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: 'var(--c-slate-100)', border: '1px solid var(--c-slate-200)',
                    color: 'var(--c-slate-600)', cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!confirmed || loading}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: confirmed && !loading ? 'var(--c-red-500)' : 'rgba(239,68,68,0.3)',
                    color: 'white', border: 'none',
                    cursor: confirmed && !loading ? 'pointer' : 'not-allowed',
                  }}
                >
                  {loading ? (
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} />
                  ) : (
                    <Trash2 size={13} />
                  )}
                  {loading ? 'Deleting…' : 'Delete permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
