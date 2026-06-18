'use client'

import { useState } from 'react'
import { PlaidLink } from 'react-plaid-link'
import { Plus, RefreshCw, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  plaidItemId: string
  institutionName: string | null
}

type SyncResult = {
  added: { account_id: string; name: string }[]
  removed: { account_id: string; name: string }[]
}

export default function PlaidAddAccountsButton({ plaidItemId, institutionName }: Props) {
  const [step, setStep] = useState<'idle' | 'loading' | 'ready' | 'syncing' | 'done'>('idle')
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openPrompt() {
    setShowPrompt(true)
  }

  async function launchLink() {
    setStep('loading')
    setError(null)
    try {
      const res = await fetch('/api/plaid/update-mode/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaid_item_id: plaidItemId, account_selection_enabled: true }),
      })
      const data = await res.json()
      if (!res.ok || !data.link_token) throw new Error(data.error ?? 'Could not open account selector')
      setLinkToken(data.link_token)
      // Store for OAuth redirect resume
      sessionStorage.setItem('plaid_link_token', data.link_token)
      sessionStorage.setItem('plaid_oauth_mode', `accounts:${plaidItemId}`)
      setStep('ready')
    } catch (err: any) {
      setError(err.message)
      setStep('idle')
    }
  }

  async function onSuccess(
    _publicToken: string,
    metadata: { accounts: { id: string; name: string; mask: string; type: string; subtype: string }[] }
  ) {
    setStep('syncing')
    setLinkToken(null)
    try {
      const res = await fetch('/api/plaid/update-mode/sync-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaid_item_id: plaidItemId, accounts: metadata.accounts }),
      })
      const data = await res.json()
      setResult(data)
      setStep('done')
    } catch {
      setError('Account sync failed. Please try again.')
      setStep('idle')
    }
  }

  function onExit() {
    setLinkToken(null)
    setStep('idle')
  }

  function reset() {
    setStep('idle')
    setLinkToken(null)
    setResult(null)
    setError(null)
    setShowPrompt(false)
  }

  // ── Done state ────────────────────────────────────────────────────────────────
  if (step === 'done' && result) {
    const hasChanges = result.added.length > 0 || result.removed.length > 0

    return (
      <div style={{
        padding: '14px 16px', borderRadius: 10,
        background: '#f0fdf4', border: '1px solid #bbf7d0',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={15} color="#16a34a" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
            {hasChanges ? 'Accounts updated' : 'No changes made'}
          </span>
        </div>
        {result.added.length > 0 && (
          <p style={{ fontSize: 12, color: '#15803d', margin: 0 }}>
            Added: {result.added.map(a => a.name).join(', ')}
          </p>
        )}
        {result.removed.length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--c-slate-500)', margin: 0 }}>
            Removed: {result.removed.map(a => a.name).join(', ')}
          </p>
        )}
        <button
          onClick={reset}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#16a34a', textAlign: 'left', padding: 0, fontWeight: 600 }}
        >
          Done
        </button>
      </div>
    )
  }

  // ── Prompt expanded ───────────────────────────────────────────────────────────
  if (showPrompt) {
    return (
      <div style={{
        padding: '14px 16px', borderRadius: 10,
        background: 'var(--c-slate-50)', border: '1px solid var(--c-slate-200)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-navy-950)', marginBottom: 4 }}>
              Add or remove accounts
            </p>
            <p style={{ fontSize: 12, color: 'var(--c-slate-500)', lineHeight: 1.6, maxWidth: 340, margin: 0 }}>
              Choose which accounts at {institutionName ?? 'this bank'} to share. You can add new accounts or
              remove ones you no longer want tracked. Only selected accounts will sync going forward.
            </p>
          </div>
          <button
            onClick={() => setShowPrompt(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-slate-400)', padding: 2 }}
          >
            <ChevronUp size={14} />
          </button>
        </div>

        <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: 'var(--c-slate-500)', lineHeight: 1.8 }}>
          <li>Your credentials are entered directly with {institutionName ?? 'your bank'} — we never see them.</li>
          <li>Removing an account stops future syncing but preserves your history.</li>
          <li>New accounts are refreshed immediately after you save.</li>
        </ul>

        {error && (
          <p style={{ fontSize: 12, color: 'var(--c-red-500)', margin: 0 }}>{error}</p>
        )}

        {/* PlaidLink is rendered but invisible until ready — button below triggers launch */}
        {step === 'ready' && linkToken ? (
          <PlaidLink
            token={linkToken}
            onSuccess={onSuccess}
            onExit={onExit}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: 'var(--c-navy-950)', color: 'white', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Plus size={13} /> Open Account Selector
          </PlaidLink>
        ) : (
          <button
            onClick={launchLink}
            disabled={step === 'loading' || step === 'syncing'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: 'var(--c-navy-950)', color: 'white', border: 'none',
              cursor: step === 'loading' || step === 'syncing' ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: step === 'loading' || step === 'syncing' ? 0.6 : 1,
              alignSelf: 'flex-start',
            }}
          >
            <RefreshCw
              size={13}
              style={{ animation: step === 'loading' || step === 'syncing' ? 'spin 0.8s linear infinite' : 'none' }}
            />
            {step === 'syncing' ? 'Saving…' : step === 'loading' ? 'Loading…' : 'Select Accounts'}
          </button>
        )}
      </div>
    )
  }

  // ── Idle — collapsed trigger ──────────────────────────────────────────────────
  return (
    <button
      onClick={openPrompt}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'none', border: '1px solid var(--c-slate-200)',
        borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
        fontSize: 11, fontWeight: 600, color: 'var(--c-slate-500)',
        fontFamily: 'inherit',
      }}
    >
      <Plus size={11} />
      Add / remove accounts
      <ChevronDown size={11} />
    </button>
  )
}
