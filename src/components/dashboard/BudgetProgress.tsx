import { formatCurrency } from '@/lib/utils'
import { Card, ProgressBar } from '@/components/ui'

interface Props {
  pct: number
  spent: number
  estimated: number
}

export default function BudgetProgress({ pct, spent, estimated }: Props) {
  const isOver    = pct >= 100
  const isWarning = pct >= 80 && !isOver

  const pctColor = isOver
    ? 'var(--c-red-500)'
    : isWarning
    ? 'var(--c-amber-500)'
    : 'var(--c-gold-600)'

  return (
    <Card padding={32} style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--c-slate-500)', marginBottom: 8 }}>
            Budget Efficiency
          </p>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 48, color: pctColor, lineHeight: 1 }}>
            {pct}%
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--c-navy-950)', marginBottom: 4 }}>
            {formatCurrency(spent)}
          </p>
          <p style={{ fontSize: 13, color: 'var(--c-slate-500)', fontWeight: 500 }}>
            out of {formatCurrency(estimated)}
          </p>
        </div>
      </div>

      <ProgressBar value={pct} height={12} statusColor />
    </Card>
  )
}
