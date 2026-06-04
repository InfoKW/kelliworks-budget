import { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Adds a gold top accent line */
  accent?: boolean
  /** Disables the lift-on-hover effect */
  static?: boolean
  padding?: number | string
}

export default function Card({
  children,
  accent = false,
  static: isStatic = false,
  padding = 24,
  style,
  ...props
}: CardProps) {
  return (
    <div
      className="glass-card"
      style={{
        padding,
        position: 'relative',
        overflow: 'hidden',
        ...(isStatic && { transition: 'none', transform: 'none' }),
        ...style,
      }}
      {...props}
    >
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, transparent, var(--c-gold-400), transparent)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          pointerEvents: 'none',
        }} />
      )}
      {children}
    </div>
  )
}
