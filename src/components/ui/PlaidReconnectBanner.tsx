'use client'

import { useState } from 'react'
import { PlaidLink } from 'react-plaid-link'
import { AlertTriangle, Clock, WifiOff, RefreshCw, X, ArrowRight } from 'lucide-react'
import Link from 'next/link'

type ItemStatus = 'login_required' | 'pending_expiration' | 'pending_disconnect' | 'error'

interface BrokenItem {
  id: string
  item_id: string
  institution_name: string | null
  item_status: ItemStatus
  consent_expiration_time: string | null
}

interface Props {
  items: BrokenItem[]
}

const CONFIG: Record<ItemStatus, {
  icon: React.ElementType
  color: string
  bg: string
  border: string
  badge: string
  badgeBg: string
  badgeBorder: string
  headline: (name: string | null) => string
  body: (name: string | null, expiry: string | null) => string
  cta: string
  urgency: number // higher = more urgent
}> = {
  login_required: {
    icon: WifiOff,
    color: '#dc2626',
    bg: '#fff1f2',
    border: '#fecdd3',
    badge: 'Action Required',
    badgeBg: '#fee2e2',
    badgeBorder: '#fca5a5',
    headline: (name) => `${name ?? 'Your bank'} needs to be reconnected`,
    body: (name) =>
      `Your connection to ${name ?? 'your bank'} has been interrupted. Transactions are no longer syncing. Reconnect now to restore automatic tracking.`,
    cta: 'Reconnect Now',
    urgency: 3,
  },
  error: {
    icon: AlertTriangle,
    color: '#dc2626',
    bg: '#fff1f2',
    border: '#fecdd3',
    badge: 'Connection Error',
    badgeBg: '#fee2e2',
    badgeBorder: '#fca5a5',
    headline: (name) => `There's a problem with your ${name ?? 'bank'} connection`,
    body: (name) =>
      `We're having trouble accessing ${name ?? 'your bank'}. This may be a temporary issue — try reconnecting to resolve it.`,
    cta: 'Fix Connection',
    urgency: 2,
  },
  pending_disconnect: {
    icon: Clock,
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
    badge: 'Expiring Soon',
    badgeBg: '#fef3c7',
    badgeBorder: '#fcd34d',
    headline: (name) => `Your ${name ?? 'bank'} access expires in 7 days`,
    body: (name, expiry) => {
      const date = expiry ? new Date(expiry).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'soon'
      return `Your authorization for ${name ?? 'your bank'} will expire on ${date}. Re-authorize before then to avoid any interruption to transaction syncing.`
    },
    cta: 'Re-authorize',
    urgency: 1,
  },
  pending_expiration: {
    icon: Clock,
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
    badge: 'Expiring Soon',
    badgeBg: '#fef3c7',
    badgeBorder: '#fcd34d',
    headline: (name) => `Your ${name ?? 'bank'} access expires in 7 days`,
    body: (name, expiry) => {
      const date = expiry ? new Date(expiry).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'soon'
      return `Your consent for ${name ?? 'your bank'} will expire on ${date}. Re-authorize now to maintain uninterrupted access to your transactions.`
    },
    cta: 'Re-authorize',
    urgency: 1,
  },
}

function ReconnectButton({ item, cta, color }: { item: BrokenItem; cta: string; color: string }) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function launch() {
    if (linkToken) return
    setLoading(true)
    try {
      const res = await fetch('/api/plaid/update-mode/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaid_item_id: item.id }),
      })
      const data = await res.json()
      if (res.ok && data.link_token) {
        setLinkToken(data.link_token)
        // Store for OAuth redirect resume
        sessionStorage.setItem('plaid_link_token', data.link_token)
        sessionStorage.setItem('plaid_oauth_mode', `update:${item.id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  async function onSuccess(_token: string, metadata: any) {
    console.log('[Plaid] reconnect onSuccess link_session_id:', metadata?.link_session_id, '| item:', item.id)
    await fetch('/api/plaid/update-mode/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plaid_item_id: item.id }),
    })
    setDone(true)
    setLinkToken(null)
  }

  if (done) {
    return (
      <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>
        Reconnected ✓
      </span>
    )
  }

  if (linkToken) {
    return (
      <PlaidLink
        token={linkToken}
        onSuccess={onSuccess}
        onExit={(_err: unknown, metadata: any) => { console.log('[Plaid] reconnect onExit link_session_id:', metadata?.link_session_id); setLinkToken(null) }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 18px', borderRadius: 99, fontSize: 13, fontWeight: 700,
          background: color, color: 'white', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          boxShadow: `0 2px 8px ${color}40`,
        }}
      >
        {cta}
      </PlaidLink>
    )
  }

  return (
    <button
      onClick={launch}
      disabled={loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 18px', borderRadius: 99, fontSize: 13, fontWeight: 700,
        background: color, color: 'white', border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        whiteSpace: 'nowrap', opacity: loading ? 0.6 : 1,
        boxShadow: `0 2px 8px ${color}40`,
      }}
    >
      <RefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
      {loading ? 'Loading…' : cta}
    </button>
  )
}

export default function PlaidReconnectBanner({ items }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = items.filter(i => !dismissed.has(i.id))
  if (visible.length === 0) return null

  // Sort by urgency descending so most critical shows first
  const sorted = [...visible].sort(
    (a, b) => (CONFIG[b.item_status]?.urgency ?? 0) - (CONFIG[a.item_status]?.urgency ?? 0)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map(item => {
        const cfg = CONFIG[item.item_status]
        if (!cfg) return null
        const Icon = cfg.icon

        return (
          <div
            key={item.id}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 16,
              padding: '16px 20px', borderRadius: 14,
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              position: 'relative',
            }}
          >
            {/* Icon */}
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'white', border: `1px solid ${cfg.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={18} color={cfg.color} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                  color: cfg.color, background: cfg.badgeBg,
                  border: `1px solid ${cfg.badgeBorder}`,
                  padding: '2px 8px', borderRadius: 99,
                }}>
                  {cfg.badge}
                </span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-navy-950)', marginBottom: 4, lineHeight: 1.4 }}>
                {cfg.headline(item.institution_name)}
              </p>
              <p style={{ fontSize: 13, color: 'var(--c-slate-500)', lineHeight: 1.6, marginBottom: 14, maxWidth: 560 }}>
                {cfg.body(item.institution_name, item.consent_expiration_time)}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <ReconnectButton item={item} cta={cfg.cta} color={cfg.color} />
                <Link
                  href="/connectors"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 13, fontWeight: 600, color: cfg.color,
                    textDecoration: 'none', opacity: 0.75,
                  }}
                >
                  Manage connections <ArrowRight size={12} />
                </Link>
              </div>
            </div>

            {/* Dismiss — only for non-critical states */}
            {item.item_status !== 'login_required' && item.item_status !== 'error' && (
              <button
                onClick={() => setDismissed(prev => new Set([...prev, item.id]))}
                title="Dismiss"
                style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--c-slate-300)', padding: 2,
                  display: 'flex', alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
