'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PlaidLink } from 'react-plaid-link'
import { Link2, ShieldCheck, Zap, ArrowRight, Building2, ShoppingBag, Globe, Lock, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ConnectorsPage() {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [plaidItems, setPlaidItems] = useState<{ id: string; item_id: string; institution_name: string | null; last_synced_at: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/plaid/create-link-token', { method: 'POST' })
        const data = await res.json()
        if (!res.ok || !data.link_token) {
          setLinkError(data.error ?? 'Could not initialise Plaid. Check your API credentials.')
        } else {
          setLinkToken(data.link_token)
        }

        const insforge = createClient()
        const { data: { user } } = await insforge.auth.getCurrentUser()
        if (user) {
          const { data: items } = await insforge.database
            .from('plaid_items').select('id, item_id, institution_name, last_synced_at').eq('user_id', user.id)
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

  async function onPlaidSuccess(publicToken: string, metadata: { institution: { name: string } | null }) {
    await fetch('/api/plaid/exchange-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_token: publicToken, institution_name: metadata.institution?.name }),
    })
    window.location.reload()
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
              plaidItems.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px solid var(--c-slate-100)' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-navy-950)' }}>{item.institution_name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-green" style={{ fontSize: 9 }}>Active</span>
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
              ))
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
