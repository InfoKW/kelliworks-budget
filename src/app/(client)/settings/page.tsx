'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PlaidLink } from 'react-plaid-link'

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const insforge = createClient()
      const { data: { user } } = await insforge.auth.getCurrentUser()
      if (user) {
        const { data: p } = await insforge.database.from('profiles').select('*').eq('id', user.id).single()
        setProfile(p)
      }
      setLoading(false)
    }
    init()
  }, [])

  return (
    <div className="container-page anim-fade-up" style={{ padding: '40px 0' }}>
      <header style={{ marginBottom: 40 }}>
        <div className="section-label" style={{ marginBottom: 12 }}>Account Control</div>
        <h1 style={{ fontSize: 40 }}>Settings & Preferences</h1>
        <p style={{ color: 'var(--c-slate-500)', marginTop: 8 }}>
          Manage your personal profile and system notification settings.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Profile Section */}
          <div className="glass-card" style={{ padding: 32 }}>
            <h3 style={{ fontSize: 20, color: 'var(--c-navy-950)', marginBottom: 24, fontWeight: 800 }}>Personal Profile</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-slate-400)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Full Name</label>
                <input 
                  type="text" 
                  defaultValue={profile?.full_name ?? ''}
                  className="glass" 
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--c-slate-200)', fontSize: 14 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-slate-400)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Email Address</label>
                <input 
                  type="email" 
                  defaultValue={profile?.email ?? ''}
                  disabled
                  className="glass" 
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--c-slate-200)', fontSize: 14, background: 'var(--c-slate-50)', color: 'var(--c-slate-400)' }}
                />
              </div>
            </div>

            <button className="btn btn-gold" style={{ marginTop: 32 }}>
              Update Profile
            </button>
          </div>

          {/* Preferences */}
          <div className="glass-card" style={{ padding: 32 }}>
            <h3 style={{ fontSize: 20, color: 'var(--c-navy-950)', marginBottom: 24, fontWeight: 800 }}>Preferences</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--c-slate-100)' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-navy-950)' }}>Email Notifications</p>
                  <p style={{ fontSize: 12, color: 'var(--c-slate-500)' }}>Receive weekly financial summaries</p>
                </div>
                <div style={{ width: 44, height: 24, borderRadius: 12, background: 'var(--c-gold-500)', position: 'relative', cursor: 'pointer' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, right: 3 }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-navy-950)' }}>Dark Mode</p>
                  <p style={{ fontSize: 12, color: 'var(--c-slate-500)' }}>Switch to the classic dark aesthetic</p>
                </div>
                <div style={{ width: 44, height: 24, borderRadius: 12, background: 'var(--c-slate-200)', position: 'relative', cursor: 'pointer' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: 3 }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="glass-card" style={{ padding: 24, background: 'var(--c-slate-50)', border: 'none' }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--c-navy-950)', marginBottom: 12 }}>Financial Modules</h4>
            <p style={{ fontSize: 13, color: 'var(--c-slate-500)', lineHeight: 1.6 }}>
              Your account currently has access to the full suite of KelliWorks financial tools.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
}
