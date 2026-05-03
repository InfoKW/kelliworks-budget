'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, Target, Zap, Info, ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react'
import { motion } from 'framer-motion'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const MOCK_TRENDS = [
  { month: 'Jan', income: 8200, expenses: 5400 },
  { month: 'Feb', income: 8500, expenses: 5800 },
  { month: 'Mar', income: 7900, expenses: 6200 },
  { month: 'Apr', income: 9100, expenses: 5900 },
  { month: 'May', income: 8800, expenses: 6100 },
]

const COLORS = ['#b8860b', '#0f172a', '#475569', '#cbd5e1', '#e2e8f0']

export default function TrendsPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => setLoading(false), 800)
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
          <div className="section-label" style={{ marginBottom: 12 }}>Performance & Insights</div>
          <h1 style={{ fontSize: 40 }}>Financial Trends</h1>
          <p style={{ color: 'var(--c-slate-500)', marginTop: 8 }}>Visualizing your cash flow and growth patterns.</p>
        </div>
        
        <div className="glass-card" style={{ padding: '12px 20px', display: 'flex', gap: 12 }}>
          <button className="btn btn-outline btn-sm">Last 6 Months</button>
          <button className="btn btn-gold btn-sm">Year to Date</button>
        </div>
      </header>

      {/* Main Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, marginBottom: 32 }}>
        <div className="glass-card" style={{ padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 32 }}>
            <div>
              <h3 style={{ fontSize: 20 }}>Cash Flow Overview</h3>
              <p style={{ fontSize: 13, color: 'var(--c-slate-500)' }}>Revenue vs Expenses over time</p>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--c-gold-500)' }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Income</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--c-navy-900)' }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Expenses</span>
              </div>
            </div>
          </div>

          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_TRENDS}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--c-gold-500)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--c-gold-500)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--c-navy-900)" stopOpacity={0.05}/>
                    <stop offset="95%" stopColor="var(--c-navy-900)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--c-slate-200)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--c-slate-500)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--c-slate-500)' }} />
                <Tooltip 
                  contentStyle={{ background: 'white', border: '1px solid var(--c-slate-200)', borderRadius: 12, boxShadow: 'var(--shadow-lg)' }}
                  itemStyle={{ fontSize: 12, fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="income" stroke="var(--c-gold-500)" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expenses" stroke="var(--c-navy-900)" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, marginBottom: 20 }}>Allocation</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Housing', value: 35 },
                      { name: 'Business', value: 25 },
                      { name: 'Leisure', value: 20 },
                      { name: 'Savings', value: 20 },
                    ]}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {COLORS.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              {['Housing', 'Business', 'Leisure', 'Savings'].map((cat, i) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i] }} />
                  <span style={{ fontSize: 11, color: 'var(--c-slate-500)', fontWeight: 500 }}>{cat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: 24, background: 'var(--c-gold-500)', color: 'white' }}>
             <h3 style={{ fontSize: 18, marginBottom: 12, color: 'white' }}>Pro Insight</h3>
             <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
               Your business expenses dropped by 12% this month. If this trend continues, you can increase your savings goal by $400.
             </p>
             <button className="btn btn-outline btn-sm" style={{ background: 'white', color: 'var(--c-gold-600)', width: '100%' }}>
               Adjust Savings Goal
             </button>
          </div>
        </aside>
      </div>

      {/* Insight Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--c-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpRight size={20} style={{ color: 'var(--c-green-500)' }} />
            </div>
            <div style={{ fontWeight: 700, color: 'var(--c-navy-950)' }}>Revenue Growth</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--c-navy-950)' }}>+14.2%</div>
          <p style={{ fontSize: 12, color: 'var(--c-slate-500)', marginTop: 4 }}>Compared to last quarter</p>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--c-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowDownRight size={20} style={{ color: 'var(--c-navy-950)' }} />
            </div>
            <div style={{ fontWeight: 700, color: 'var(--c-navy-950)' }}>Expense Efficiency</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--c-navy-950)' }}>-4.8%</div>
          <p style={{ fontSize: 12, color: 'var(--c-slate-500)', marginTop: 4 }}>Lower operating costs</p>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--c-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={20} style={{ color: 'var(--c-gold-500)' }} />
            </div>
            <div style={{ fontWeight: 700, color: 'var(--c-navy-950)' }}>Savings Velocity</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--c-navy-950)' }}>2.4x</div>
          <p style={{ fontSize: 12, color: 'var(--c-slate-500)', marginTop: 4 }}>Accelerated goal timeline</p>
        </div>
      </div>
    </div>
  )
}
