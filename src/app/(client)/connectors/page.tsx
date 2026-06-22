'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PlaidLink } from 'react-plaid-link'
import { Link2, ShieldCheck, Zap, ArrowRight, Building2, ShoppingBag, Globe, Lock, Plus, RefreshCw, Trash2, AlertTriangle } from 'lucide-react'
import PlaidAddAccountsButton from '@/components/ui/PlaidAddAccountsButton'
import { motion } from 'framer-motion'

export default function ConnectorsPage() {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [plaidItems, setPlaidItems] = useState<{ id: string; item_id: string; institution_name: string | null; last_synced_at: string | null; item_status: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  // Update mode state: maps plaid_item_id → link token for reconnect flow
  const [updateTokens, setUpdateTokens] = useState<Record<string, string>>({})
  const [reconnecting, setReconnecting] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/plaid/create-link-token', { method: 'POST' })
        const data = await res.json()
        if (!res.ok || !data.link_token) {
          setLinkError(data.error ?? 'Could not initialise Plaid. Check your API credentials.')
        } else {
          setLinkToken(data.link_token)
          // Store for OAuth redirect resume — survives page navigation to bank OAuth
          sessionStorage.setItem('plaid_link_token', data.link_token)
          sessionStorage.setItem('plaid_oauth_mode', 'connect')
        }

        const insforge = createClient()
        const { data: { user } } = await insforge.auth.getCurrentUser()
        if (user) {
          const { data: items } = await insforge.database
            .from('plaid_items').select('id, item_id, institution_name, last_synced_at, item_status').eq('user_id', user.id)
          setPlaidItems(items ?? [])
        }
      } catch (err: any) {
        setLinkError(err?.message ?? 'Could not reach Plaid. Check your API credentials.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/plaid/sync-transactions', { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        setSyncResult(`${json.synced} transaction${json.synced !== 1 ? 's' : ''} synced`)
      } else {
        setSyncResult(json.error ?? 'Sync failed')
      }
    } catch {
      setSyncResult('Sync failed')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncResult(null), 5000)
    }
  }

  async function handleDisconnect(itemId: string) {
    if (!confirm('Disconnect this bank account? This will remove all linked data.')) return
    setDisconnecting(itemId)
    try {
      await fetch('/api/plaid/disconnect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      })
      setPlaidItems(prev => prev.filter(i => i.item_id !== itemId))
    } finally {
      setDisconnecting(null)
    }
  }

  async function refreshLinkToken() {
    try {
      const res = await fetch('/api/plaid/create-link-token', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.link_token) {
        setLinkToken(data.link_token)
        sessionStorage.setItem('plaid_link_token', data.link_token)
        sessionStorage.setItem('plaid_oauth_mode', 'connect')
      }
    } catch {}
  }

  async function handleReconnect(itemId: string) {
    setReconnecting(itemId)
    try {
      const res = await fetch('/api/plaid/update-mode/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaid_item_id: itemId }),
      })
      const data = await res.json()
      if (res.ok && data.link_token) {
        setUpdateTokens(prev => ({ ...prev, [itemId]: data.link_token }))
        // Store for OAuth redirect resume
        sessionStorage.setItem('plaid_link_token', data.link_token)
        sessionStorage.setItem('plaid_oauth_mode', `update:${itemId}`)
      }
    } finally {
      setReconnecting(null)
    }
  }

  async function onUpdateSuccess(_publicToken: string, itemId: string, metadata?: { link_session_id?: string }) {
    console.log('[Plaid] update mode onSuccess link_session_id:', metadata?.link_session_id, '| item:', itemId)
    // No token re-exchange needed — access_token is unchanged after update mode.
    // Just clear the error state in our DB.
    await fetch('/api/plaid/update-mode/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plaid_item_id: itemId }),
    })
    setUpdateTokens(prev => { const n = { ...prev }; delete n[itemId]; return n })
    setPlaidItems(prev => prev.map(i => i.id === itemId ? { ...i, item_status: 'good' } : i))
  }

  async function onPlaidSuccess(publicToken: string, metadata: { institution: { name: string; institution_id: string } | null; link_session_id: string }) {
    console.log('[Plaid] onSuccess link_session_id:', metadata.link_session_id, '| institution:', metadata.institution?.name)
    const exchangeRes = await fetch('/api/plaid/exchange-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        public_token: publicToken,
        institution_name: metadata.institution?.name ?? null,
        institution_id: metadata.institution?.institution_id ?? null,
        link_session_id: metadata.link_session_id,
      }),
    })
    if (exchangeRes.ok) {
      setSyncing(true)
      setSyncResult('Syncing transactions…')
      try {
        const syncRes = await fetch('/api/plaid/sync-transactions', { method: 'POST' })
        const syncJson = await syncRes.json()
        if (syncRes.ok) {
          setSyncResult(`${syncJson.synced} transaction${syncJson.synced !== 1 ? 's' : ''} synced`)
        }
      } catch {
        // Non-fatal — data will sync via daily cron
      } finally {
        setSyncing(false)
      }
    }
    window.location.reload()
  }

  function onPlaidExit(_error: unknown, metadata: { link_session_id?: string }) {
    console.log('[Plaid] onExit link_session_id:', metadata?.link_session_id)
    // Token is consumed when modal opens — fetch a fresh one so Connect Bank works again
    setLinkToken(null)
    refreshLinkToken()
  }

  return (
    <div className="container-page anim-fade-up" style={{ padding: '40px 0' }}>
      <header style={{ marginBottom: 40 }}>
        <div className="section-label" style={{ marginBottom: 12 }}>Bridge Secure</div>
        <h1 style={{ fontSize: 40 }}>Affiliate Connectors</h1>
        <p style={{ color: 'var(--c-slate-500)', marginTop: 8, maxWidth: 600 }}>
          Securely link your accounts to automate transaction matching and gain deep insights into your spending habits.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24, marginBottom: 48 }}>
        
        {/* Plaid Connection Card */}
        <div className="glass-card" style={{ padding: 24, border: '1px solid var(--c-gold-200)', background: 'linear-gradient(135deg, white 0%, var(--c-slate-50) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20 }}>
            <div style={{ 
              width: 48, height: 48, borderRadius: 12, background: 'var(--c-slate-100)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1166e5'
            }}>
              <Building2 />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {plaidItems.length > 0 && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: syncing ? 0.6 : 1 }}
                >
                  <RefreshCw size={13} style={{ animation: syncing ? 'spin 0.8s linear infinite' : 'none' }} />
                  {syncResult ?? (syncing ? 'Syncing…' : 'Sync')}
                </button>
              )}
              {linkToken ? (
                <PlaidLink
                  token={linkToken}
                  onSuccess={onPlaidSuccess}
                  onExit={onPlaidExit}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 12,
                    background: '#b8860b', color: 'white', border: 'none',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit', whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(184,134,11,0.25)',
                  }}
                >
                  <Plus size={14} />
                  Connect Bank
                </PlaidLink>
              ) : linkError ? (
                <span style={{ fontSize: 11, color: 'var(--c-red-500)', fontWeight: 600, maxWidth: 160, textAlign: 'right', lineHeight: 1.4 }}>
                  {linkError}
                </span>
              ) : (
                <button className="btn btn-outline btn-sm" disabled style={{ cursor: 'not-allowed', opacity: 0.45 }}>
                  <Plus size={14} />
                  Connect Bank
                </button>
              )}
            </div>
          </div>
          <h3 style={{ fontSize: 18, color: 'var(--c-navy-950)', marginBottom: 4 }}>Bank Connection</h3>
          <p style={{ fontSize: 13, color: 'var(--c-slate-500)', marginBottom: 16 }}>Powered by Plaid</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plaidItems.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--c-slate-400)', fontStyle: 'italic' }}>No banks connected.</p>
            ) : (
              plaidItems.map(item => {
                const needsReconnect = item.item_status !== 'good'
                const updateToken = updateTokens[item.id]
                return (
                  <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 12px', background: needsReconnect ? 'var(--c-red-50, #fff1f2)' : 'white', borderRadius: 8, border: `1px solid ${needsReconnect ? 'var(--c-red-200, #fecdd3)' : 'var(--c-slate-100)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {needsReconnect && <AlertTriangle size={12} color="var(--c-red-500, #ef4444)" />}
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-navy-950)' }}>{item.institution_name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {needsReconnect ? (
                          <span className="badge badge-red" style={{ fontSize: 9 }}>
                            {item.item_status === 'login_required' ? 'Login Required' :
                             item.item_status === 'pending_expiration' ? 'Expiring Soon' :
                             item.item_status === 'pending_disconnect' ? 'Expiring Soon' : 'Error'}
                          </span>
                        ) : (
                          <span className="badge badge-green" style={{ fontSize: 9 }}>Active</span>
                        )}
                        <button
                          onClick={() => handleDisconnect(item.item_id)}
                          disabled={disconnecting === item.item_id}
                          title="Disconnect"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--c-slate-300)', padding: 2, display: 'flex',
                            opacity: disconnecting === item.item_id ? 0.4 : 1,
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {/* Add / remove accounts — only shown when connection is healthy */}
                    {!needsReconnect && (
                      <PlaidAddAccountsButton
                        plaidItemId={item.id}
                        institutionName={item.institution_name}
                      />
                    )}

                    {needsReconnect && (
                      updateToken ? (
                        <PlaidLink
                          token={updateToken}
                          onSuccess={(_token) => onUpdateSuccess(_token, item.id)}
                          onExit={() => setUpdateTokens(prev => { const n = { ...prev }; delete n[item.id]; return n })}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                            background: 'var(--c-red-500, #ef4444)', color: 'white',
                            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          <RefreshCw size={11} /> Reconnect
                        </PlaidLink>
                      ) : (
                        <button
                          onClick={() => handleReconnect(item.id)}
                          disabled={reconnecting === item.id}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                            background: 'var(--c-red-500, #ef4444)', color: 'white',
                            border: 'none', cursor: reconnecting === item.id ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit', opacity: reconnecting === item.id ? 0.6 : 1,
                          }}
                        >
                          <RefreshCw size={11} style={{ animation: reconnecting === item.id ? 'spin 0.8s linear infinite' : 'none' }} />
                          {reconnecting === item.id ? 'Loading…' : 'Reconnect'}
                        </button>
                      )
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Other Placeholder Connectors */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20 }}>
            <div style={{ 
              width: 48, height: 48, borderRadius: 12, background: 'var(--c-bg)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#635bff'
            }}>
              <Globe />
            </div>
            <div className="badge badge-neutral">Coming Soon</div>
          </div>
          <h3 style={{ fontSize: 18, color: 'var(--c-navy-950)', marginBottom: 4 }}>Stripe</h3>
          <p style={{ fontSize: 13, color: 'var(--c-slate-500)', marginBottom: 20 }}>Business Platform</p>
          <button className="btn btn-outline btn-sm" style={{ width: '100%' }} disabled>Connect</button>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20 }}>
            <div style={{ 
              width: 48, height: 48, borderRadius: 12, background: 'var(--c-bg)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff9900'
            }}>
              <ShoppingBag />
            </div>
            <div className="badge badge-neutral">Coming Soon</div>
          </div>
          <h3 style={{ fontSize: 18, color: 'var(--c-navy-950)', marginBottom: 4 }}>Amazon</h3>
          <p style={{ fontSize: 13, color: 'var(--c-slate-500)', marginBottom: 20 }}>Marketplace Sync</p>
          <button className="btn btn-outline btn-sm" style={{ width: '100%' }} disabled>Connect</button>
        </div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          style={{ 
            padding: 24, borderRadius: 16, border: '2px dashed var(--c-slate-200)', 
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', cursor: 'pointer'
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--c-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, color: 'var(--c-slate-400)' }}>
            <Link2 size={20} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-slate-400)' }}>Add Custom Connector</span>
        </motion.div>
      </div>

      <div className="glass-card" style={{ padding: 32, display: 'flex', gap: 32, alignItems: 'center', background: 'var(--c-navy-950)', color: 'white' }}>
        <div style={{ 
          width: 64, height: 64, borderRadius: 16, background: 'rgba(255,255,255,0.1)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
        }}>
          <Lock size={32} style={{ color: 'var(--c-gold-400)' }} />
        </div>
        <div>
          <h3 style={{ fontSize: 20, color: 'white', marginBottom: 8 }}>Bank-Grade Security</h3>
          <p style={{ fontSize: 14, opacity: 0.7, lineHeight: 1.6, maxWidth: 600 }}>
            KelliWorks uses end-to-end encryption and read-only access for all bank connections. 
            We never store your credentials and your data is protected with the same security standards as major financial institutions.
          </p>
        </div>
      </div>
    </div>
  )
}
