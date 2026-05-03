import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, getMonthLabel, getCurrentMonth } from '@/lib/utils'

interface PageProps {
  searchParams: Promise<{ month?: string }>
}

const STATUS: Record<string, { color: string; bg: string; border: string }> = {
  paid:    { color: '#4ade80', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)' },
  partial: { color: '#fbbf24', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)' },
  overdue: { color: '#f87171', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.22)' },
  pending: { color: '#94a3b8', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.18)' },
}

export default async function BudgetPage({ searchParams }: PageProps) {
  const { month: monthParam } = await searchParams
  const month = monthParam ?? getCurrentMonth()
  const insforge = await createClient()
  const { data: { user } } = await insforge.auth.getCurrentUser()
  if (!user) redirect('/login')

  const { data: budget } = await insforge.database
    .from('budgets').select('*').eq('user_id', user.id).eq('month', month).single()

  const { data: lines } = budget
    ? await insforge.database.from('budget_lines').select('*').eq('budget_id', budget.id).order('due_day')
    : { data: [] }

  type Line = { id: string; category: string; description: string | null; estimated_amount: number; actual_amount: number; status: string; due_day: number | null }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      <div className="glass" style={{ borderRadius: 20, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26 }}>{getMonthLabel(month)} Budget</h1>
          {budget && (
            <p style={{ fontSize: 14, color: 'var(--c-slate-400)', marginTop: 6 }}>
              Total estimated: <strong style={{ color: 'var(--c-gold-400)', fontFamily: 'var(--font-display)', fontSize: 16 }}>{formatCurrency(budget.total_estimated)}</strong>
            </p>
          )}
        </div>
      </div>

      {!budget ? (
        <div className="glass-card" style={{ borderRadius: 16, padding: '48px 24px', textAlign: 'center', color: 'var(--c-slate-500)', fontSize: 14 }}>
          No budget set for this month. Contact your KelliWorks advisor.
        </div>
      ) : (
        <div className="glass-card" style={{ borderRadius: 16, overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto',
            gap: 16, padding: '12px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(255,255,255,0.03)',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-slate-600)' }}>Category</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-slate-600)', textAlign: 'right' }}>Amount</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-slate-600)', textAlign: 'right' }}>Status</span>
          </div>

          {(lines ?? []).map((line: Line, i: number) => {
            const s = STATUS[line.status] ?? STATUS.pending
            return (
              <div key={line.id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto',
                gap: 16, padding: '16px 20px', alignItems: 'center',
                borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                transition: 'background 0.15s',
              }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>{line.category}</p>
                  {line.description && <p style={{ fontSize: 12, color: 'var(--c-slate-500)', marginTop: 2 }}>{line.description}</p>}
                  {line.due_day && <p style={{ fontSize: 12, color: 'var(--c-slate-600)', marginTop: 2 }}>Due: Day {line.due_day}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', fontFamily: 'var(--font-display)' }}>
                    {formatCurrency(line.actual_amount)}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--c-slate-500)' }}>/ {formatCurrency(line.estimated_amount)}</p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                  padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap',
                  color: s.color, background: s.bg, border: `1px solid ${s.border}`,
                }}>
                  {line.status}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
