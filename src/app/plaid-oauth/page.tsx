'use client'

/**
 * Plaid OAuth Redirect Page
 *
 * OAuth institutions (Chase, Wells Fargo, Bank of America, etc.) redirect the user
 * OUT of the app to complete authentication at the bank, then redirect back here
 * with ?oauth_state_id=... in the URL.
 *
 * Flow:
 *  1. User opens Plaid Link and selects an OAuth institution
 *  2. Plaid redirects the user to the bank's OAuth page (leaves the app)
 *  3. Bank redirects back to this page with oauth_state_id in the URL
 *  4. We resume Link using the original link token (stored in sessionStorage) +
 *     the current URL as receivedRedirectUri — Plaid's SDK auto-completes the handshake
 *  5. onSuccess fires → we call exchange-token (new link) or update-mode/complete (reconnect)
 *  6. User lands back on /connectors
 *
 * sessionStorage keys written by connectors/page.tsx, PlaidReconnectBanner, PlaidAddAccountsButton:
 *   plaid_link_token  — the link token used to open Link
 *   plaid_oauth_mode  — 'connect' | 'update:{plaid_item_id}' | 'accounts:{plaid_item_id}'
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlaidLink } from 'react-plaid-link'

// ── Inner component: mounts the hook and auto-opens when ready ────────────────
function OAuthResume({
  token,
  receivedRedirectUri,
  onSuccess,
  onExit,
}: {
  token: string
  receivedRedirectUri: string
  onSuccess: (publicToken: string, metadata: any) => void
  onExit: (error: unknown, metadata: any) => void
}) {
  const { open, ready } = usePlaidLink({ token, receivedRedirectUri, onSuccess, onExit })

  useEffect(() => {
    if (ready) open()
  }, [ready, open])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--c-bg)', gap: 16,
    }}>
      <div className="anim-spin" style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '3px solid var(--c-slate-200)',
        borderTopColor: 'var(--c-gold-500)',
      }} />
      <p style={{ fontSize: 15, color: 'var(--c-slate-500)' }}>
        Completing bank authorization…
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PlaidOAuthPage() {
  const router = useRouter()
  const [state, setState] = useState<{
    token: string
    mode: string
    redirectUri: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('plaid_link_token')
    const mode  = sessionStorage.getItem('plaid_oauth_mode') ?? 'connect'

    if (!token) {
      setError('Your session has expired. Please go back and try connecting your bank again.')
      return
    }

    // Clear immediately — one-time use
    sessionStorage.removeItem('plaid_link_token')
    sessionStorage.removeItem('plaid_oauth_mode')

    setState({ token, mode, redirectUri: window.location.href })
  }, [])

  async function onSuccess(publicToken: string, metadata: any) {
    console.log('[Plaid] OAuth onSuccess link_session_id:', metadata?.link_session_id, '| institution:', metadata?.institution?.name)
    const mode = state?.mode ?? 'connect'

    if (mode === 'connect') {
      await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_token: publicToken,
          institution_name: metadata?.institution?.name ?? null,
          institution_id: metadata?.institution?.institution_id ?? null,
          link_session_id: metadata?.link_session_id ?? null,
        }),
      })
    } else {
      // 'update:{itemId}' or 'accounts:{itemId}'
      const itemId = mode.split(':')[1]
      await fetch('/api/plaid/update-mode/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaid_item_id: itemId }),
      })
    }

    router.replace('/connectors')
  }

  function onExit(_error: unknown, metadata: any) {
    console.log('[Plaid] OAuth onExit link_session_id:', metadata?.link_session_id)
    router.replace('/connectors')
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--c-bg)', gap: 16, padding: '0 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-navy-950)' }}>
          Session Expired
        </p>
        <p style={{ fontSize: 13, color: 'var(--c-slate-500)', maxWidth: 360 }}>
          {error}
        </p>
        <button
          onClick={() => router.replace('/connectors')}
          className="btn btn-outline btn-sm"
        >
          Back to Connectors
        </button>
      </div>
    )
  }

  if (!state) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--c-bg)',
      }}>
        <div className="anim-spin" style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid var(--c-slate-200)',
          borderTopColor: 'var(--c-gold-500)',
        }} />
      </div>
    )
  }

  return (
    <OAuthResume
      token={state.token}
      receivedRedirectUri={state.redirectUri}
      onSuccess={onSuccess}
      onExit={onExit}
    />
  )
}
