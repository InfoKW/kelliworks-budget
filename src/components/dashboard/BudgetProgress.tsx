import { formatCurrency } from '@/lib/utils'

interface Props {
  pct: number
  spent: number
  estimated: number
}

export default function BudgetProgress({ pct, spent, estimated }: Props) {
  const isOver    = pct >= 100
  const isWarning = pct >= 80 && !isOver

  const barGradient = isOver
    ? 'var(--c-red-500)'
    : isWarning
    ? 'var(--c-amber-500)'
    : 'var(--c-gold-500)'

  const pctColor = isOver ? 'var(--c-red-500)' : isWarning ? 'var(--c-amber-500)' : 'var(--c-gold-600)'

  return (
    <div className="glass-card" style={{ padding: 32, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
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

      {/* Progress track */}
      <div style={{
        width: '100%', height: 12, borderRadius: 6,
        background: 'var(--c-slate-100)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          width: `${Math.min(pct, 100)}%`,
          height: '100%',
          borderRadius: 6,
          background: barGradient,
          transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }} />
      </div>
    </div>
  )
}
