interface DividerProps {
  label?: string
  style?: React.CSSProperties
}

export default function Divider({ label, style }: DividerProps) {
  if (label) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...style }}>
        <div className="divider" style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--c-slate-500)', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <div className="divider" style={{ flex: 1 }} />
      </div>
    )
  }

  return <div className="divider" style={style} />
}
