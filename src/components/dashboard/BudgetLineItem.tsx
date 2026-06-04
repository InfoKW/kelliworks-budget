import { formatCurrency } from '@/lib/utils'
import type { BudgetLine } from '@/types'
import { Badge, Card, ProgressBar } from '@/components/ui'

const STATUS: Record<string, { label: string; variant: 'green' | 'gold' | 'red' | 'neutral' }> = {
  paid:    { label: 'Paid',    variant: 'green'   },
  partial: { label: 'Partial', variant: 'gold'    },
  overdue: { label: 'Overdue', variant: 'red'     },
  pending: { label: 'Pending', variant: 'neutral' },
}

export default function BudgetLineItem({ line }: { line: BudgetLine }) {
  const s = STATUS[line.status] ?? STATUS.pending
  const actualPct = line.estimated_amount > 0
    ? Math.min((line.actual_amount / line.estimated_amount) * 100, 100)
    : 0

  return (
    <Card padding="20px 24px" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-navy-950)' }}>{line.category}</span>
            {line.description && (
              <span style={{
                fontSize: 11, color: 'var(--c-slate-500)', background: 'var(--c-slate-100)',
                borderRadius: 5, padding: '2px 8px', fontWeight: 600,
              }}>
                {line.description}
              </span>
            )}
          </div>
          {line.due_day && (
            <p style={{ fontSize: 13, color: 'var(--c-slate-500)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <span>Due day {line.due_day}</span>
              {line.paid_date && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span style={{ color: 'var(--c-green-500)' }}>Paid {line.paid_date}</span>
                </>
              )}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--c-navy-950)' }}>
              {formatCurrency(line.actual_amount)}
            </p>
            <p style={{ fontSize: 12, color: 'var(--c-slate-400)', fontWeight: 600 }}>
              EST. {formatCurrency(line.estimated_amount)}
            </p>
          </div>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
      </div>

      <ProgressBar value={actualPct} height={4} statusColor />
    </Card>
  )
}
