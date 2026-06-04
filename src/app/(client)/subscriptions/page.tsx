import { createClient } from '@/lib/supabase/server'
import { getCurrentMonth, getMonthLabel, formatCurrency } from '@/lib/utils'
import { Card, Badge, SectionLabel } from '@/components/ui'
import PlaidConnectBanner from '@/components/ui/PlaidConnectBanner'
import type { BudgetLine } from '@/types'

interface LineNotes {
  bill_type?: string
  frequency?: string
  payment_account?: string
  auto_pay?: boolean | string
  due_week?: string | number
  original_status?: string
  original_notes?: string
}

function parseNotes(raw: string | null): LineNotes {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

function autoPaylabel(val: boolean | string | undefined) {
  if (val === true || val === 'yes' || val === 'true' || val === 'Yes') return 'Yes'
  if (val === false || val === 'no' || val === 'false' || val === 'No') return 'No'
  return val ? String(val) : '—'
}

const STATUS_VARIANT: Record<string, 'green' | 'red' | 'gold' | 'neutral'> = {
  paid:    'green',
  partial: 'gold',
  overdue: 'red',
  pending: 'neutral',
}

function BudgetTable({ lines, type }: { lines: (BudgetLine & { meta: LineNotes })[], type: string }) {
  if (lines.length === 0) return (
    <p style={{ fontSize: 13, color: 'var(--c-slate-400)', padding: '24px 0' }}>
      No {type} entries for this month.
    </p>
  )

  const totalBudget = lines.reduce((s, l) => s + (l.estimated_amount ?? 0), 0)
  const totalActual = lines.reduce((s, l) => s + (l.actual_amount ?? 0), 0)

  const cols = ['Vendor / Description', 'Budget', 'Actual', 'Frequency', 'Due Day', 'Due Week', 'Payment Account', 'Auto Pay', 'Status']

  return (
    <div>
      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--c-slate-100)', borderBottom: '1px solid var(--c-slate-200)' }}>
                {cols.map(h => (
                  <th key={h} style={{
                    padding: '11px 16px', textAlign: 'left', whiteSpace: 'nowrap',
                    fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: 'var(--c-slate-500)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={line.id} style={{
                  borderTop: i > 0 ? '1px solid var(--c-slate-100)' : 'none',
                  background: i % 2 === 0 ? 'white' : 'var(--c-slate-50)',
                }}>
                  <td style={{ padding: '13px 16px', fontWeight: 600, color: 'var(--c-navy-950)', whiteSpace: 'nowrap' }}>
                    {line.category}
                    {line.description && (
                      <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: 'var(--c-slate-400)', marginTop: 2 }}>
                        {line.description}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '13px 16px', color: 'var(--c-slate-700)', whiteSpace: 'nowrap' }}>
                    {formatCurrency(line.estimated_amount)}
                  </td>
                  <td style={{ padding: '13px 16px', fontWeight: 700, whiteSpace: 'nowrap',
                    color: (line.actual_amount ?? 0) > line.estimated_amount ? 'var(--c-red-500)' : 'var(--c-navy-950)',
                  }}>
                    {formatCurrency(line.actual_amount ?? 0)}
                  </td>
                  <td style={{ padding: '13px 16px', color: 'var(--c-slate-500)', whiteSpace: 'nowrap' }}>
                    {line.meta.frequency || '—'}
                  </td>
                  <td style={{ padding: '13px 16px', color: 'var(--c-slate-500)', textAlign: 'center' }}>
                    {line.due_day ?? '—'}
                  </td>
                  <td style={{ padding: '13px 16px', color: 'var(--c-slate-500)', whiteSpace: 'nowrap' }}>
                    {line.meta.due_week ? `Week ${line.meta.due_week}` : '—'}
                  </td>
                  <td style={{ padding: '13px 16px', color: 'var(--c-slate-500)', whiteSpace: 'nowrap' }}>
                    {line.meta.payment_account || '—'}
                  </td>
                  <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: autoPaylabel(line.meta.auto_pay) === 'Yes' ? 'var(--c-green-600)' : 'var(--c-slate-400)',
                    }}>
                      {autoPaylabel(line.meta.auto_pay)}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <Badge variant={STATUS_VARIANT[line.status] ?? 'neutral'}>
                      {line.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--c-slate-200)', background: 'var(--c-slate-50)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 13, color: 'var(--c-navy-950)' }}>
                  Total
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--c-navy-950)' }}>
                  {formatCurrency(totalBudget)}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 800,
                  color: totalActual > totalBudget ? 'var(--c-red-500)' : 'var(--c-green-600)',
                }}>
                  {formatCurrency(totalActual)}
                </td>
                <td colSpan={6} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default async function SubscriptionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()
  if (!user) return null

  const month = getCurrentMonth()

  const { data: budget } = await supabase.database
    .from('budgets').select('id').eq('user_id', user.id).eq('month', month).single()

  const lines: (BudgetLine & { meta: LineNotes })[] = []

  if (budget) {
    const { data: rawLines } = await supabase.database
      .from('budget_lines').select('*').eq('budget_id', budget.id).order('due_day')

    for (const l of rawLines ?? []) {
      lines.push({ ...l, meta: parseNotes(l.notes) })
    }
  }

  const bizLines      = lines.filter(l => l.category?.toLowerCase().includes('software') || l.category?.toLowerCase().includes('subscription'))
  const personalLines = lines.filter(l => l.category?.toLowerCase().includes('entertainment'))

  const shownLines  = [...bizLines, ...personalLines]
  const grandBudget = shownLines.reduce((s, l) => s + (l.estimated_amount ?? 0), 0)
  const grandActual = shownLines.reduce((s, l) => s + (l.actual_amount ?? 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <SectionLabel style={{ marginBottom: 10 }}>{getMonthLabel(month)}</SectionLabel>
          <h1 style={{ fontSize: 32, color: 'var(--c-navy-950)' }}>Subscription Tracker</h1>
          <p style={{ fontSize: 14, color: 'var(--c-slate-500)', marginTop: 6 }}>
            All recurring bills and subscriptions from your uploaded budget.
          </p>
        </div>

        {shownLines.length > 0 && (
          <div style={{ display: 'flex', gap: 12 }}>
            <Card padding="14px 20px">
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-slate-500)', marginBottom: 6 }}>Total Budget</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--c-navy-950)', lineHeight: 1 }}>{formatCurrency(grandBudget)}</p>
            </Card>
            <Card padding="14px 20px">
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-slate-500)', marginBottom: 6 }}>Total Actual</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, lineHeight: 1,
                color: grandActual > grandBudget ? 'var(--c-red-500)' : 'var(--c-green-600)',
              }}>
                {formatCurrency(grandActual)}
              </p>
            </Card>
          </div>
        )}
      </div>

      <PlaidConnectBanner />

      {shownLines.length === 0 ? (
        <Card padding="56px 32px" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: 'var(--c-slate-400)', marginBottom: 8 }}>No budget data for {getMonthLabel(month)}.</p>
          <p style={{ fontSize: 13, color: 'var(--c-slate-400)' }}>Your admin will upload your budget each month.</p>
        </Card>
      ) : (
        <>
          {/* Business */}
          <div>
            <SectionLabel style={{ marginBottom: 14 }}>Business Budget</SectionLabel>
            <BudgetTable lines={bizLines} type="business" />
          </div>

          {/* Personal */}
          <div>
            <SectionLabel style={{ marginBottom: 14 }}>Personal Budget</SectionLabel>
            <BudgetTable lines={personalLines} type="personal" />
          </div>
        </>
      )}
    </div>
  )
}
