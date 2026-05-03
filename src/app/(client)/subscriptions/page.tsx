'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, CreditCard, ExternalLink, Check, X, Info, Filter } from 'lucide-react'
import { motion } from 'framer-motion'

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const insforge = createClient()
      const { data } = await insforge.database
        .from('subscriptions')
        .select('*')
        .order('amount', { ascending: false })
      
      if (data) setSubscriptions(data)
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="container-page" style={{ padding: '40px 0' }}>
        <div className="anim-spin" style={{ width: 24, height: 24, border: '2px solid var(--c-slate-200)', borderTopColor: 'var(--c-gold-500)', borderRadius: '50%' }} />
      </div>
    )
  }

  const monthlyTotal = subscriptions.reduce((sum, s) => sum + Number(s.amount), 0)

  return (
    <div className="container-page anim-fade-up" style={{ padding: '40px 0' }}>
      <header style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="section-label" style={{ marginBottom: 12 }}>Audit & Track</div>
          <h1 style={{ fontSize: 40 }}>Subscription Tracker</h1>
          <p style={{ color: 'var(--c-slate-500)', marginTop: 8 }}>Review and optimize your recurring digital services.</p>
        </div>
        
        <div style={{ display: 'flex', gap: 16 }}>
           <div className="glass-card" style={{ padding: '16px 24px' }}>
            <div style={{ fontSize: 13, color: 'var(--c-slate-500)', fontWeight: 600 }}>Active Subs</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--c-navy-950)' }}>
              {subscriptions.length}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '16px 24px', textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: 'var(--c-slate-500)', fontWeight: 600 }}>Monthly Burn</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--c-navy-950)' }}>
              ${monthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </header>

      <div style={{ marginBottom: 32, display: 'flex', gap: 12 }}>
        <button className="btn btn-outline btn-sm">
          <Filter size={14} style={{ marginRight: 6 }} />
          All Services
        </button>
        <button className="btn btn-outline btn-sm">Auto-Detected</button>
        <button className="btn btn-outline btn-sm">Canceled</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
        {subscriptions.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1/-1', padding: 64, textAlign: 'center' }}>
            <Shield size={48} style={{ margin: '0 auto 16px', color: 'var(--c-gold-300)' }} />
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>Run a Subscription Audit</h2>
            <p style={{ color: 'var(--c-slate-500)', maxWidth: 400, margin: '0 auto 24px' }}>
              We'll scan your transactions to find recurring subscriptions and help you cancel the ones you don't use.
            </p>
            <button className="btn btn-gold">Start New Audit</button>
          </div>
        ) : (
          subscriptions.map((sub) => (
            <motion.div 
              key={sub.id}
              whileHover={{ y: -4 }}
              className="glass-card"
              style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ 
                    width: 56, height: 56, borderRadius: 14, 
                    background: 'var(--c-slate-100)', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', fontSize: 24
                  }}>
                    {sub.vendor_logo_url ? <img src={sub.vendor_logo_url} alt="" style={{ width: '100%', height: '100%', borderRadius: 14 }} /> : sub.vendor_name[0]}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, color: 'var(--c-navy-950)' }}>{sub.vendor_name}</h3>
                    <div className="badge badge-neutral" style={{ fontSize: 10, marginTop: 4 }}>{sub.category || 'Service'}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-navy-950)' }}>
                    ${Number(sub.amount).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--c-slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    / {sub.frequency}
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--c-bg)', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <div style={{ color: 'var(--c-slate-500)' }}>Next charge</div>
                <div style={{ color: 'var(--c-navy-950)', fontWeight: 600 }}>May 15, 2026</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button className="btn btn-outline" style={{ padding: '8px 12px' }}>
                  <Check size={14} style={{ marginRight: 6, color: 'var(--c-green-500)' }} />
                  Keep
                </button>
                <button className="btn btn-outline" style={{ padding: '8px 12px' }}>
                  <X size={14} style={{ marginRight: 6, color: 'var(--c-red-500)' }} />
                  Cancel
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
