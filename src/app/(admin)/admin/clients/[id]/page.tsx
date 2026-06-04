import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate, getCurrentMonth, getMonthLabel } from '@/lib/utils'
import { Card, Badge, SectionLabel, ProgressBar } from '@/components/ui'
import { ArrowLeft, AlertTriangle, AlertCircle, Building2 } from 'lucide-react'
import Link from 'next/link'
import DeleteClientModal from '@/components/admin/DeleteClientModal'
import EditClientName from '@/components/admin/EditClientName'
import type { BudgetLine } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminClientDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: profile },
    { data: alerts },
    { data: transactions },
    { data: plaidItems },
  ] = await Promise.all([
    supabase.database.from('profiles').select('*').eq('id', id).single(),
    supabase.database.from('alerts').select('*').eq('user_id', id).eq('status', 'pending').order('created_at', { ascending: false }),
    supabase.database.from('transactions').select('*').eq('user_id', id).order('date', { ascending: false }).limit(20),
    supabase.database.from('plaid_items').select('id, institution_name, last_synced_at').eq('user_id', id),
  ])

  if (!profile) notFound()

  const month = getCurrentMonth()
  const { data: budget } = await supabase.database.from('budgets').select('*').eq('user_id', id).eq('month', month).single()
  const { data: lines } = budget
    ? await supabase.database.from('budget_lines').select('*').eq('budget_id', budget.id).order('due_day')
    : { data: [] }

  const totalEstimated = budget?.total_estimated ?? 0
  const totalActual = (lines ?? []).reduce((s: number, l: BudgetLine) => s + (l.actual_amount ?? 0), 0)
  const pct = totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : 0

  const displayName = profile.full_name || profile.email

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Back + header */}
      <div>
        <Link href="/admin/clients" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: 'var(--c-slate-500)', fontWeight: 500,
          textDecoration: 'none', marginBottom: 16,
        }}>
          <ArrowLeft size={13} /> All Clients
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <SectionLabel style={{ marginBottom: 10 }}>Admin · Client Detail</SectionLabel>
            <h1 style={{ fontSize: 32, color: 'var(--c-navy-950)' }}>{displayName}</h1>
            <p style={{ fontSize: 14, color: 'var(--c-slate-500)', marginTop: 4 }}>{profile.email}</p>
            <EditClientName clientId={id} currentName={profile.full_name} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <DeleteClientModal
              clientId={id}
              clientEmail={profile.email}
              clientName={displayName}
            />
            {budget && (
              <Link href={`/admin/clients/${id}/budget?month=${month}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: 'var(--c-slate-100)', color: 'var(--c-navy-950)',
                border: '1px solid var(--c-slate-200)', textDecoration: 'none',
              }}>
                View Budget →
              </Link>
            )}
            <Link href="/admin/budgets" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: 'var(--c-gold-500)', color: 'white', textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(184,134,11,0.2)',
            }}>
              Upload Budget →
            </Link>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <Card padding={20}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-slate-500)', marginBottom: 8 }}>Subscription</p>
          <Badge variant={profile.subscription_status === 'active' ? 'green' : 'red'}>
            {profile.subscription_status}
          </Badge>
        </Card>
        <Card padding={20}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-slate-500)', marginBottom: 8 }}>Open Alerts</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: (alerts ?? []).length > 0 ? 'var(--c-red-500)' : 'var(--c-navy-950)', lineHeight: 1 }}>
            {(alerts ?? []).length}
          </p>
        </Card>
        <Card padding={20}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-slate-500)', marginBottom: 8 }}>Month Budget</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--c-navy-950)', lineHeight: 1 }}>
            {formatCurrency(totalEstimated)}
          </p>
        </Card>
        <Card padding={20}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-slate-500)', marginBottom: 8 }}>Banks Connected</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--c-navy-950)', lineHeight: 1 }}>
            {(plaidItems ?? []).length}
          </p>
        </Card>
      </div>

      {/* Budget progress */}
      {budget && (
        <Card padding={28}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <SectionLabel style={{ marginBottom: 8 }}>{getMonthLabel(month)} Budget</SectionLabel>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: 1,
                color: pct >= 100 ? 'var(--c-red-500)' : pct >= 80 ? 'var(--c-amber-500)' : 'var(--c-gold-600)',
              }}>
                {pct}%
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--c-slate-500)', fontWeight: 500 }}>
              {formatCurrency(totalActual)} of {formatCurrency(totalEstimated)}
            </p>
          </div>
          <ProgressBar value={pct} height={10} statusColor />
        </Card>
      )}

      {/* Budget lines + alerts side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Budget lines */}
        <div>
          <SectionLabel style={{ marginBottom: 14 }}>{getMonthLabel(month)} Budget Lines</SectionLabel>
          {(lines ?? []).length === 0 ? (
            <Card padding={32} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--c-slate-400)' }}>No budget set for this month.</p>
              <Link href="/admin/budgets" style={{ fontSize: 13, color: 'var(--c-gold-600)', fontWeight: 600, marginTop: 8, display: 'inline-block' }}>
                Upload budget →
              </Link>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(lines ?? []).map((line: BudgetLine) => (
                <Card key={line.id} padding="14px 18px">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-navy-950)' }}>{line.category}</p>
                      {line.due_day && <p style={{ fontSize: 11, color: 'var(--c-slate-400)', marginTop: 2 }}>Due day {line.due_day}</p>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--c-navy-950)' }}>{formatCurrency(line.actual_amount)}</p>
                      <p style={{ fontSize: 11, color: 'var(--c-slate-400)' }}>/ {formatCurrency(line.estimated_amount)}</p>
                    </div>
                  </div>
                  {line.estimated_amount > 0 && (
                    <ProgressBar
                      value={line.estimated_amount > 0 ? Math.min((line.actual_amount / line.estimated_amount) * 100, 100) : 0}
                      height={3}
                      statusColor
                    />
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div>
          <SectionLabel style={{ marginBottom: 14 }}>Open Alerts</SectionLabel>
          {(alerts ?? []).length === 0 ? (
            <Card padding={32} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--c-slate-400)' }}>No pending alerts.</p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(alerts ?? []).map((alert: { id: string; severity: string; title: string; description: string | null; amount: number | null; created_at: string }) => {
                const isRed = alert.severity === 'red'
                return (
                  <Card key={alert.id} padding="14px 18px" style={{
                    borderColor: isRed ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                    background: isRed ? 'rgba(239,68,68,0.04)' : 'rgba(245,158,11,0.04)',
                  }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ marginTop: 2, flexShrink: 0 }}>
                        {isRed
                          ? <AlertCircle size={15} color="var(--c-red-500)" />
                          : <AlertTriangle size={15} color="var(--c-amber-500)" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-navy-950)', marginBottom: 2 }}>{alert.title}</p>
                        {alert.description && <p style={{ fontSize: 12, color: 'var(--c-slate-500)', lineHeight: 1.5 }}>{alert.description}</p>}
                        <p style={{ fontSize: 11, color: 'var(--c-slate-400)', marginTop: 4 }}>{formatDate(alert.created_at)}</p>
                      </div>
                      {alert.amount && (
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-navy-950)', flexShrink: 0 }}>{formatCurrency(alert.amount)}</p>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div>
        <SectionLabel style={{ marginBottom: 14 }}>Recent Transactions</SectionLabel>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--c-slate-200)', background: 'var(--c-slate-100)' }}>
                {['Date', 'Name', 'Amount', 'Status'].map(h => (
                  <th key={h} style={{
                    padding: '10px 20px', textAlign: h === 'Amount' ? 'right' : 'left',
                    fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: 'var(--c-slate-500)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(transactions ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--c-slate-400)', fontSize: 13 }}>
                    No transactions synced yet.
                  </td>
                </tr>
              ) : (
                (transactions ?? []).map((txn: { id: string; date: string; name: string; amount: number; is_matched: boolean; is_untracked: boolean }, i: number) => (
                  <tr key={txn.id} style={{ borderTop: i > 0 ? '1px solid var(--c-slate-100)' : 'none' }}>
                    <td style={{ padding: '13px 20px', color: 'var(--c-slate-500)' }}>{formatDate(txn.date)}</td>
                    <td style={{ padding: '13px 20px', fontWeight: 600, color: 'var(--c-navy-950)' }}>{txn.name}</td>
                    <td style={{ padding: '13px 20px', textAlign: 'right', fontWeight: 700, color: 'var(--c-navy-950)' }}>{formatCurrency(txn.amount)}</td>
                    <td style={{ padding: '13px 20px' }}>
                      <Badge variant={txn.is_matched ? 'green' : txn.is_untracked ? 'gold' : 'neutral'}>
                        {txn.is_matched ? 'Matched' : txn.is_untracked ? 'Untracked' : 'Pending'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>

    </div>
  )
}
