import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate, getCurrentMonth } from '@/lib/utils'
import { Card, SectionLabel } from '@/components/ui'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import EditClientName from '@/components/admin/EditClientName'
import ClientActionsMenu from '@/components/admin/ClientActionsMenu'
import ClientBudgetSections from '@/components/admin/ClientBudgetSections'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminClientDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: profile },
    { data: alerts },
    { data: plaidItems },
    { data: allBudgets },
  ] = await Promise.all([
    supabase.database.from('profiles').select('*').eq('id', id).single(),
    supabase.database.from('alerts').select('id').eq('user_id', id).eq('status', 'pending'),
    supabase.database.from('plaid_items').select('id').eq('user_id', id),
    supabase.database.from('budgets').select('*').eq('user_id', id).order('month', { ascending: false }),
  ])

  if (!profile) notFound()

  // Fetch all budget lines for all budgets
  const budgetIds = (allBudgets ?? []).map((b: any) => b.id)
  const { data: allLines } = budgetIds.length > 0
    ? await supabase.database.from('budget_lines').select('*').in('budget_id', budgetIds)
    : { data: [] }

  // Group lines by budget_id
  const linesByBudget: Record<string, any[]> = {}
  for (const line of allLines ?? []) {
    if (!linesByBudget[line.budget_id]) linesByBudget[line.budget_id] = []
    linesByBudget[line.budget_id].push(line)
  }

  // Current month transactions
  const month = getCurrentMonth()
  const [y, mo] = month.slice(0, 7).split('-').map(Number)
  const nextMonth = mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, '0')}-01`

  const { data: transactions } = await supabase.database
    .from('transactions')
    .select('*')
    .eq('user_id', id)
    .gte('date', month)
    .lt('date', nextMonth)
    .order('date', { ascending: false })
    .limit(30)

  const txns = (transactions ?? []) as any[]
  const matchedCount     = txns.filter(t => t.is_matched).length
  const untrackedCount   = txns.filter(t => t.is_untracked).length
  const needsReviewCount = txns.filter(t => !t.is_matched && !t.is_untracked && (t.match_confidence ?? 0) >= 40).length

  const displayName = profile.full_name || profile.email

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Back link */}
      <Link href="/admin/clients" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: 'var(--c-slate-500)', fontWeight: 500,
        textDecoration: 'none', marginBottom: -16,
      }}>
        <ArrowLeft size={13} /> All Clients
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <SectionLabel style={{ marginBottom: 10 }}>Admin · Client Detail</SectionLabel>
          <h1 style={{ fontSize: 32, color: 'var(--c-navy-950)' }}>{displayName}</h1>
          <p style={{ fontSize: 14, color: 'var(--c-slate-500)', marginTop: 4 }}>{profile.email}</p>
          <EditClientName clientId={id} currentName={profile.full_name} />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Banks Connected pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '7px 14px', borderRadius: 8,
            background: 'var(--c-slate-100)', border: '1px solid var(--c-slate-200)',
            fontSize: 13, fontWeight: 600, color: 'var(--c-navy-950)',
          }}>
            Banks Connected
            <span style={{
              background: 'var(--c-navy-950)', color: 'white',
              borderRadius: 99, padding: '1px 8px', fontSize: 12, fontWeight: 700,
            }}>
              {(plaidItems ?? []).length}
            </span>
          </div>

          {/* Open Alerts pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '7px 14px', borderRadius: 8,
            background: 'var(--c-slate-100)', border: '1px solid var(--c-slate-200)',
            fontSize: 13, fontWeight: 600, color: 'var(--c-navy-950)',
          }}>
            Open Alerts
            <span style={{
              background: 'var(--c-navy-950)', color: 'white',
              borderRadius: 99, padding: '1px 8px', fontSize: 12, fontWeight: 700,
            }}>
              {(alerts ?? []).length}
            </span>
          </div>

          {/* Upload Budget */}
          <Link href="/admin/budgets" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: 'var(--c-gold-500)', color: 'white', textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(184,134,11,0.2)',
          }}>
            Upload Budget →
          </Link>

          {/* Three-dot menu */}
          <ClientActionsMenu clientId={id} clientEmail={profile.email} clientName={displayName} />
        </div>
      </div>

      {/* Budget sections grouped by month */}
      <ClientBudgetSections
        budgets={(allBudgets ?? []) as any}
        linesByBudget={linesByBudget as any}
        clientId={id}
      />

      {/* Transactions */}
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-navy-950)', marginBottom: 6 }}>Recent Transactions</h2>
            <p style={{ fontSize: 13, color: 'var(--c-gold-600)', marginBottom: 12 }}>
              Showing the latest 30 transactions for the current month
            </p>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', fontSize: 13, color: 'var(--c-slate-600)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                {matchedCount} Matched
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                {needsReviewCount} Needs Review
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                {untrackedCount} Untracked
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-slate-400)', display: 'inline-block' }} />
                {txns.length} Total
              </span>
            </div>
          </div>

          <Link href={`/admin/clients/${id}/transactions`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: 'var(--c-gold-500)', color: 'white', textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(184,134,11,0.2)', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            View/Match Transactions
          </Link>
        </div>

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
              {txns.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--c-slate-400)', fontSize: 13 }}>
                    No transactions for this month yet.
                  </td>
                </tr>
              ) : (
                txns.map((txn: any, i: number) => (
                  <tr key={txn.id} style={{ borderTop: i > 0 ? '1px solid var(--c-slate-100)' : 'none' }}>
                    <td style={{ padding: '13px 20px', color: 'var(--c-slate-500)', whiteSpace: 'nowrap' }}>
                      {formatDate(txn.date)}
                    </td>
                    <td style={{ padding: '13px 20px', fontWeight: 600, color: 'var(--c-navy-950)' }}>
                      {txn.name}
                    </td>
                    <td style={{ padding: '13px 20px', textAlign: 'right', fontWeight: 700, color: 'var(--c-navy-950)', whiteSpace: 'nowrap' }}>
                      {formatCurrency(txn.amount)}
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: txn.is_matched ? '#16a34a' : txn.is_untracked ? '#b45309' : 'var(--c-slate-500)',
                      }}>
                        {txn.is_matched ? 'Matched' : txn.is_untracked ? 'Untracked' : 'Pending'}
                      </span>
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
