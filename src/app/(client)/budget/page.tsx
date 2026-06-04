import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMonthLabel, getCurrentMonth } from '@/lib/utils'
import { Card, SectionLabel } from '@/components/ui'
import MonthSelector from '@/components/dashboard/MonthSelector'
import BudgetBreakdown from '@/components/budget/BudgetBreakdown'
import PlaidConnectBanner from '@/components/ui/PlaidConnectBanner'
import { CalendarCheck2, Sparkles } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function BudgetPage({ searchParams }: PageProps) {
  const { month: monthParam } = await searchParams
  const raw = monthParam ?? getCurrentMonth()
  const month = raw.length === 7 ? `${raw}-01` : raw

  const insforge = await createClient()
  const { data: { user } } = await insforge.auth.getCurrentUser()
  if (!user) redirect('/login')

  const [{ data: budget }, { data: plaidItems }] = await Promise.all([
    insforge.database.from('budgets').select('*').eq('user_id', user.id).eq('month', month).single(),
    insforge.database.from('plaid_items').select('id, institution_name, last_synced_at').eq('user_id', user.id),
  ])

  const { data: lines } = budget
    ? await insforge.database.from('budget_lines').select('*').eq('budget_id', budget.id).order('due_day')
    : { data: [] }

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <Card padding="28px 32px" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <SectionLabel style={{ marginBottom: 10 }}>Monthly Budget</SectionLabel>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>{getMonthLabel(month)}</h1>
          {budget ? (
            <p style={{ fontSize: 13, color: 'var(--c-slate-500)' }}>
              Prepared by your KelliWorks advisor
              {' · '}
              <span style={{ color: 'var(--c-gold-600)', fontWeight: 600 }}>
                {(lines ?? []).length} line item{(lines ?? []).length !== 1 ? 's' : ''}
              </span>
            </p>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--c-slate-400)' }}>No budget prepared for this month yet</p>
          )}
        </div>
        <MonthSelector currentMonth={month} />
      </Card>

      {/* Plaid banner if not connected */}
      <PlaidConnectBanner />

      {/* Plaid status if connected */}
      {(plaidItems ?? []).length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 18px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <CalendarCheck2 size={15} color="#16a34a" />
          <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>
            {(plaidItems ?? []).length} bank account{(plaidItems ?? []).length !== 1 ? 's' : ''} connected
          </span>
          <span style={{ fontSize: 12, color: '#4ade80' }}>
            {(plaidItems ?? []).map((p: { institution_name: string | null }) => p.institution_name).filter(Boolean).join(', ')}
          </span>
          <a href="/connectors" style={{ marginLeft: 'auto', fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Manage →</a>
        </div>
      )}

      {/* No budget state */}
      {!budget ? (
        <Card padding="64px 32px" style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px', background: 'var(--c-slate-100)', border: '1px solid var(--c-slate-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={24} color="var(--c-slate-400)" />
          </div>
          <h3 style={{ fontSize: 18, color: 'var(--c-navy-950)', marginBottom: 8 }}>Budget not yet prepared</h3>
          <p style={{ fontSize: 14, color: 'var(--c-slate-500)', maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
            Your KelliWorks advisor hasn't uploaded your budget for this month yet. Check back soon or reach out to them directly.
          </p>
        </Card>
      ) : (
        <BudgetBreakdown lines={lines ?? []} budget={budget} month={month} />
      )}
    </div>
  )
}
