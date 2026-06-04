import { HTMLAttributes, ReactNode } from 'react'

type BadgeVariant = 'gold' | 'green' | 'red' | 'neutral'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  children: ReactNode
}

export default function Badge({ variant = 'neutral', children, className = '', style, ...props }: BadgeProps) {
  return (
    <span
      className={`badge badge-${variant} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </span>
  )
}
