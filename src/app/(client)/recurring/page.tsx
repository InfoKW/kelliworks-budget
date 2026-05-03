'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, CreditCard, AlertCircle, CheckCircle2, Clock, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

export default function RecurringExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const insforge = createClient()
      const { data } = await insforge.database
        .from('recurring_expenses')
        .select('*')
        .order('pay_date', { ascending: true })
      
      if (data) setExpenses(data)
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

  const totalCommitted = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div className="container-page anim-fade-up" style={{ padding: '40px 0' }}>
      <header style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="section-label" style={{ marginBottom: 12 }}>Monthly Commitments</div>
          <h1 style={{ fontSize: 40 }}>Fixed Expenses</h1>
        </div>
        
        <div className="glass-card" style={{ padding: '16px 24px', textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: 'var(--c-slate-500)', fontWeight: 600 }}>Total Committed</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--c-navy-950)' }}>
            ${totalCommitted.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
        {/* Main List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {expenses.length === 0 ? (
            <div className="glass-card" style={{ padding: 48, textAlign: 'center', color: 'var(--c-slate-400)' }}>
              <Calendar size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
              <p>No recurring expenses detected yet.</p>
            </div>
          ) : (
            expenses.map((expense) => (
              <motion.div 
                key={expense.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card"
                style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ 
                    width: 48, height: 48, borderRadius: 12, 
                    background: 'var(--c-slate-100)', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', color: 'var(--c-navy-950)'
                  }}>
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-navy-950)' }}>{expense.vendor_name}</div>
                    <div style={{ fontSize: 13, color: 'var(--c-slate-500)' }}>{expense.vendor_category} • Day {expense.pay_date}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--c-navy-950)' }}>
                      ${Number(expense.amount).toFixed(2)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--c-slate-400)' }}>Expected</div>
                  </div>

                  <div className="badge badge-gold">
                    <Clock size={12} style={{ marginRight: 6 }} />
                    Upcoming
                  </div>

                  <ChevronRight size={20} style={{ color: 'var(--c-slate-300)' }} />
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Sidebar / Insights */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, marginBottom: 16 }}>Timeline Gauge</h3>
            <div style={{ height: 8, background: 'var(--c-slate-100)', borderRadius: 4, position: 'relative', marginBottom: 12 }}>
              <div style={{ position: 'absolute', left: '20%', right: '40%', height: '100%', background: 'var(--c-gold-400)', borderRadius: 4 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--c-slate-500)', fontWeight: 600 }}>
              <span>May 1</span>
              <span>May 31</span>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 24, background: 'var(--c-navy-950)', color: 'white' }}>
            <h3 style={{ fontSize: 18, marginBottom: 8, color: 'white' }}>Variance Alerts</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>We track changes in your recurring bills.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
                <AlertCircle size={16} style={{ color: 'var(--c-gold-400)', marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>No active alerts</div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>Your fixed costs are stable this month.</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
