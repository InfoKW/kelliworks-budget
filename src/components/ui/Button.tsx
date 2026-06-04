import { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'gold' | 'outline' | 'ghost'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const SIZE_PADDING: Record<Size, React.CSSProperties> = {
  sm: { fontSize: 12, padding: '6px 12px' },
  md: { fontSize: 14, padding: '10px 20px' },
  lg: { fontSize: 15, padding: '14px 24px' },
}

export default function Button({
  variant = 'gold',
  size = 'md',
  loading = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      disabled={disabled || loading}
      style={{ ...SIZE_PADDING[size], opacity: (disabled || loading) ? 0.6 : 1, ...style }}
      {...props}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span
            className="anim-spin"
            style={{
              width: 14, height: 14, display: 'inline-block', flexShrink: 0,
              border: '2px solid rgba(0,0,0,0.15)',
              borderTopColor: variant === 'gold' ? 'var(--c-navy-950)' : 'var(--c-slate-700)',
              borderRadius: '50%',
            }}
          />
          {children}
        </span>
      ) : children}
    </button>
  )
}
