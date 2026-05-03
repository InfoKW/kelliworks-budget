import { formatCurrency } from '@/lib/utils'
import type { BudgetLine } from '@/types'

const STATUS: Record<string, { label: string; className: string }> = {
  paid:    { label: 'Paid',    className: 'badge-green' },
  partial: { label: 'Partial', className: 'badge-gold' },
  overdue: { label: 'Overdue', className: 'badge-red' },
  pending: { label: 'Pending', className: 'badge-neutral' },
}

export default function BudgetLineItem({ line }: { line: BudgetLine }) {
  const s = STATUS[line.status] ?? STATUS.pending
  const actualPct = line.estimated_amount > 0 ? Math.min((line.actual_amount / line.estimated_amount) * 100, 100) : 0

  return (
    <div className="glass-card" style={{
      padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
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
          <span className={`badge ${s.className}`} style={{ flexShrink: 0 }}>
            {s.label}
          </span>
        </div>
      </div>

      {/* Mini progress bar */}
      <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'var(--c-slate-100)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${actualPct}%`,
          background: actualPct >= 100 ? 'var(--c-green-500)' : 'var(--c-gold-500)',
          transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }} />
      </div>
    </div>
  )
}
