'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Target, TrendingUp, Plus, Flag, MoreVertical, Wallet, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const insforge = createClient()
      const { data } = await insforge.database
        .from('savings_goals')
        .select('*')
        .order('priority', { ascending: true })
      
      if (data) setGoals(data)
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

  return (
    <div className="container-page anim-fade-up" style={{ padding: '40px 0' }}>
      <header style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="section-label" style={{ marginBottom: 12 }}>Milestones & Dreams</div>
          <h1 style={{ fontSize: 40 }}>Savings Goals</h1>
          <p style={{ color: 'var(--c-slate-500)', marginTop: 8 }}>Track your progress toward financial freedom.</p>
        </div>
        
        <button className="btn btn-gold">
          <Plus size={18} style={{ marginRight: 8 }} />
          Create New Goal
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 32 }}>
        {goals.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1/-1', padding: 64, textAlign: 'center' }}>
            <Target size={48} style={{ margin: '0 auto 16px', color: 'var(--c-gold-300)' }} />
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>What are you saving for?</h2>
            <p style={{ color: 'var(--c-slate-500)', maxWidth: 400, margin: '0 auto 24px' }}>
              Whether it's a house, a vacation, or an emergency fund, we'll help you get there faster.
            </p>
            <button className="btn btn-gold">Set Your First Goal</button>
          </div>
        ) : (
          goals.map((goal) => {
            const progress = (goal.current_amount / goal.target_amount) * 100
            return (
              <motion.div 
                key={goal.id}
                whileHover={{ y: -4 }}
                className="glass-card"
                style={{ padding: 32 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ 
                      width: 48, height: 48, borderRadius: 12, 
                      background: 'var(--c-slate-100)', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Flag size={20} style={{ color: 'var(--c-navy-950)' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 18, color: 'var(--c-navy-950)' }}>{goal.name}</h3>
                      <div className="badge badge-gold" style={{ fontSize: 10, marginTop: 4 }}>{goal.goal_type}</div>
                    </div>
                  </div>
                  <button className="btn btn-ghost" style={{ padding: 8 }}>
                    <MoreVertical size={16} />
                  </button>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'flex-end' }}>
                    <div>
                      <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--c-navy-950)' }}>
                        ${goal.current_amount.toLocaleString()}
                      </span>
                      <span style={{ fontSize: 14, color: 'var(--c-slate-400)', marginLeft: 8 }}>
                        of ${goal.target_amount.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-gold-600)' }}>
                      {Math.round(progress)}%
                    </div>
                  </div>
                  <div style={{ height: 10, background: 'var(--c-slate-100)', borderRadius: 5, overflow: 'hidden' }}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      style={{ height: '100%', background: 'var(--c-gold-500)', borderRadius: 5 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, borderTop: '1px solid var(--c-slate-100)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Wallet size={14} style={{ color: 'var(--c-slate-400)' }} />
                    <span style={{ fontSize: 12, color: 'var(--c-slate-500)' }}>Linked: Savings (***1234)</span>
                  </div>
                  <button className="btn btn-outline btn-sm">
                    Add Funds
                    <ArrowRight size={14} style={{ marginLeft: 6 }} />
                  </button>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
