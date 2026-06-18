import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, getMonthLabel, getCurrentMonth } from '@/lib/utils'
import MonthSelector from '@/components/dashboard/MonthSelector'
import PlaidConnectBanner from '@/components/ui/PlaidConnectBanner'
import BudgetProgress from '@/components/dashboard/BudgetProgress'
import BudgetLineItem from '@/components/dashboard/BudgetLineItem'
import UnmatchedExpenses from '@/components/dashboard/UnmatchedExpenses'
import AlertBanner from '@/components/dashboard/AlertBanner'
import type { BudgetLine, Transaction } from '@/types'

interface PageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { month: monthParam } = await searchParams
  const month = monthParam ?? getCurrentMonth()

  const insforge = await createClient()
  const { data: { user } } = await insforge.auth.getCurrentUser()
  if (!user) redirect('/login')

  const { data: budget } = await insforge.database
    .from('budgets').select('*').eq('user_id', user.id).eq('month', month).single()

  const { data: budgetLines } = budget
    ? await insforge.database.from('budget_lines').select('*').eq('budget_id', budget.id).order('due_day')
    : { data: [] }

  const monthEnd = (() => {
    const d = new Date(month)
    d.setMonth(d.getMonth() + 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })()

  const { data: untrackedTxns } = await insforge.database
    .from('transactions').select('*').eq('user_id', user.id).eq('is_untracked', true)
    .gte('date', month).lt('date', monthEnd).order('date', { ascending: false })

  const { data: redAlerts }    = await insforge.database.from('alerts').select('id').eq('user_id', user.id).eq('severity', 'red').eq('status', 'pending')
  const { data: yellowAlerts } = await insforge.database.from('alerts').select('id').eq('user_id', user.id).eq('severity', 'yellow').eq('status', 'pending')
  const { data: plaidItems }   = await insforge.database.from('plaid_items').select('id, institution_name, item_status').eq('user_id', user.id).limit(1)

  const redCount    = (redAlerts ?? []).length
  const yellowCount = (yellowAlerts ?? []).length
  const totalSpent     = (budgetLines ?? []).reduce((s: number, l: { actual_amount: number }) => s + (l.actual_amount ?? 0), 0)
  const totalEstimated = budget?.total_estimated ?? 0
  const pct            = totalEstimated > 0 ? Math.round((totalSpent / totalEstimated) * 100) : 0

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── Header ──────────────────────────────── */}
      <div className="glass-card" style={{
        padding: '32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div className="section-label" style={{ marginBottom: 12 }}>Overview</div>
          <h1 style={{ fontSize: 32, marginBottom: 8 }}>
            {getMonthLabel(month)} Budget
          </h1>
          <p style={{ fontSize: 15, color: 'var(--c-slate-500)', fontWeight: 500 }}>
            You've spent <strong style={{ color: 'var(--c-navy-950)' }}>{formatCurrency(totalSpent)}</strong>
            {' '}of your{' '}
            <strong style={{ color: 'var(--c-navy-950)' }}>{formatCurrency(totalEstimated)}</strong>
            {' '}monthly estimate.
          </p>
        </div>
        <MonthSelector currentMonth={month} />
      </div>

      {/* ── Plaid connect banner ────────────────── */}
      <PlaidConnectBanner />

      {/* ── Alert banner ────────────────────────── */}
      {(redCount > 0 || yellowCount > 0) && (
        <AlertBanner redCount={redCount} yellowCount={yellowCount} />
      )}

      {/* ── Main Layout ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}>
        
        {/* Left Column: Progress & Lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <BudgetProgress pct={pct} spent={totalSpent} estimated={totalEstimated} />

          <div>
            <div className="section-label" style={{ marginBottom: 20 }}>Budget Line Items</div>
            {(budgetLines ?? []).length === 0 ? (
              <div className="glass-card" style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--c-slate-400)', fontSize: 14 }}>
                No budget lines defined for this period.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(budgetLines ?? []).map((line: BudgetLine) => (
                  <BudgetLineItem key={line.id} line={line} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Untracked & Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {(untrackedTxns ?? []).length > 0 && (
            <UnmatchedExpenses transactions={(untrackedTxns ?? []) as Transaction[]} />
          )}

          <div className="glass-card" style={{ padding: 24 }}>
            <p className="section-label" style={{ marginBottom: 16 }}>Quick Insight</p>

            {/* Connection status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {/* Budget */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--c-slate-600)', fontWeight: 500 }}>Budget</span>
                {budget ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-green-600)', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 10px', borderRadius: 99 }}>
                    Connected
                  </span>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-slate-400)', background: 'var(--c-slate-100)', border: '1px solid var(--c-slate-200)', padding: '2px 10px', borderRadius: 99 }}>
                    Not uploaded
                  </span>
                )}
              </div>
              {/* Plaid */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--c-slate-600)', fontWeight: 500 }}>Bank (Plaid)</span>
                {(plaidItems ?? []).length > 0 ? (() => {
                  const p = plaidItems![0] as any
                  const broken = p.item_status && p.item_status !== 'good'
                  return (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99,
                      color: broken ? '#dc2626' : 'var(--c-green-600)',
                      background: broken ? '#fee2e2' : '#f0fdf4',
                      border: `1px solid ${broken ? '#fca5a5' : '#bbf7d0'}`,
                    }}>
                      {broken
                        ? (p.item_status === 'login_required' ? 'Reconnect Required' : 'Expiring Soon')
                        : (p.institution_name ?? 'Connected')}
                    </span>
                  )
                })() : (
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-amber-600)', background: '#fffbeb', border: '1px solid #fde68a', padding: '2px 10px', borderRadius: 99 }}>
                    Not connected
                  </span>
                )}
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--c-slate-100)', marginBottom: 14 }} />

            <p style={{ fontSize: 13, color: 'var(--c-slate-600)', lineHeight: 1.65 }}>
              Tracking {budgetLines?.length || 0} budget lines.{' '}
              {pct > 90
                ? <span style={{ color: 'var(--c-red-500)', fontWeight: 600 }}>You&apos;re close to your limit!</span>
                : <span style={{ color: 'var(--c-green-500)', fontWeight: 600 }}>Well within budget.</span>}
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
