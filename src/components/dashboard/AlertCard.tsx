'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, AlertCircle } from 'lucide-react'

interface AlertCardProps {
  alert: {
    id: string
    severity: string
    type: string
    title: string
    description: string | null
    amount: number | null
    created_at: string
    status: string
  }
}

export default function AlertCard({ alert }: AlertCardProps) {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [acknowledged, setAcknowledged] = useState(alert.status !== 'pending')
  const [showConfirm, setShowConfirm] = useState(false)

  const isRed = alert.severity === 'red'

  const cardBg     = isRed ? 'rgba(239,68,68,0.07)'   : 'rgba(245,158,11,0.07)'
  const cardBorder = isRed ? 'rgba(239,68,68,0.2)'    : 'rgba(245,158,11,0.2)'
  const iconBg     = isRed ? 'rgba(239,68,68,0.12)'   : 'rgba(245,158,11,0.1)'
  const iconBorder = isRed ? 'rgba(239,68,68,0.25)'   : 'rgba(245,158,11,0.22)'
  const iconColor  = isRed ? '#f87171'                : '#fbbf24'
  const labelColor = isRed ? '#f87171'                : '#fbbf24'

  async function acknowledge() {
    if (isRed && confirmText !== 'I understand') return
    setLoading(true)
    const insforge = createClient()
    await insforge.database.from('alerts').update({
      status: 'acknowledged',
      acknowledged_at: new Date().toISOString(),
    }).eq('id', alert.id)
    setAcknowledged(true)
    setLoading(false)
    setShowConfirm(false)
  }

  return (
    <div style={{
      borderRadius: 16, padding: '20px 22px',
      background: cardBg, border: `1px solid ${cardBorder}`,
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{ display: 'flex', gap: 14 }}>
        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: iconBg, border: `1px solid ${iconBorder}`, marginTop: 2,
        }}>
          {isRed
            ? <AlertCircle size={19} color={iconColor} />
            : <AlertTriangle size={19} color={iconColor} />
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: labelColor, background: isRed ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${cardBorder}`, borderRadius: 5, padding: '2px 8px',
            }}>
              {alert.severity} alert
            </span>
            <span style={{ fontSize: 12, color: 'var(--c-slate-500)' }}>{formatDate(alert.created_at)}</span>
            {acknowledged && (
              <span style={{
                marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#4ade80',
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: 5, padding: '2px 8px',
              }}>
                ✓ Acknowledged
              </span>
            )}
          </div>

          {/* Title & body */}
          <p style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>{alert.title}</p>
          {alert.description && (
            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--c-slate-400)', marginBottom: 4 }}>{alert.description}</p>
          )}
          {alert.amount && (
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', fontFamily: 'var(--font-display)' }}>{formatCurrency(alert.amount)}</p>
          )}

          {/* Action */}
          {!acknowledged && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {!showConfirm ? (
                <button onClick={() => setShowConfirm(true)} className="btn btn-sm" style={{
                  background: isRed ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                  color: iconColor,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 8,
                }}>
                  Acknowledge
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {isRed && (
                    <div>
                      <p style={{ fontSize: 12, color: '#fca5a5', marginBottom: 8 }}>
                        Type <strong style={{ color: '#f8fafc' }}>&quot;I understand&quot;</strong> to confirm
                      </p>
                      <input
                        type="text"
                        value={confirmText}
                        onChange={e => setConfirmText(e.target.value)}
                        placeholder="I understand"
                        className="input"
                        style={{ maxWidth: 240, padding: '9px 12px', fontSize: 13 }}
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={acknowledge}
                      disabled={loading || (isRed && confirmText !== 'I understand')}
                      className="btn btn-sm"
                      style={{
                        background: isRed ? '#ef4444' : '#d97706',
                        color: 'white', border: 'none', borderRadius: 8,
                        opacity: (loading || (isRed && confirmText !== 'I understand')) ? 0.45 : 1,
                      }}
                    >
                      {loading ? 'Saving…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => { setShowConfirm(false); setConfirmText('') }}
                      className="btn btn-ghost btn-sm"
                      style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
