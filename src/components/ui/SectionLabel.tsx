import { HTMLAttributes, ReactNode } from 'react'

interface SectionLabelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export default function SectionLabel({ children, style, ...props }: SectionLabelProps) {
  return (
    <div className="section-label" style={style} {...props}>
      {children}
    </div>
  )
}
