interface SpinnerProps {
  size?: number
  /** Uses gold top color when 'gold', slate when 'slate' */
  color?: 'gold' | 'slate' | 'white'
}

const TOP_COLORS = {
  gold:  'var(--c-gold-500)',
  slate: 'var(--c-slate-600)',
  white: 'rgba(255,255,255,0.9)',
}

export default function Spinner({ size = 20, color = 'gold' }: SpinnerProps) {
  return (
    <span
      className="anim-spin"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid var(--c-slate-200)',
        borderTopColor: TOP_COLORS[color],
        flexShrink: 0,
      }}
    />
  )
}
