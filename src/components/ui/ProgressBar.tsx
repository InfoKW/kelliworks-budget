interface ProgressBarProps {
  /** 0–100 */
  value: number
  height?: number
  /** Auto-colors based on value thresholds when true */
  statusColor?: boolean
  color?: string
}

export default function ProgressBar({
  value,
  height = 8,
  statusColor = false,
  color,
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100)

  let barColor = color ?? 'var(--c-gold-500)'
  if (statusColor) {
    if (clamped >= 100)     barColor = 'var(--c-red-500)'
    else if (clamped >= 80) barColor = 'var(--c-amber-500)'
    else                    barColor = 'var(--c-gold-500)'
  }

  return (
    <div style={{
      width: '100%', height, borderRadius: height / 2,
      background: 'var(--c-slate-100)', overflow: 'hidden',
    }}>
      <div style={{
        width: `${clamped}%`, height: '100%',
        borderRadius: height / 2,
        background: barColor,
        transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
      }} />
    </div>
  )
}
