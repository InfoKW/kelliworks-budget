interface AvatarProps {
  name?: string | null
  email?: string | null
  size?: number
}

export default function Avatar({ name, email, size = 32 }: AvatarProps) {
  const initials = (() => {
    if (name) {
      const parts = name.trim().split(/\s+/).filter(Boolean)
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      return parts[0][0].toUpperCase()
    }
    return (email?.[0] ?? '?').toUpperCase()
  })()

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--c-gold-100)', border: '1px solid var(--c-gold-200)',
      fontSize: size * 0.34, fontWeight: 800, color: 'var(--c-gold-700)',
      letterSpacing: '0.02em',
    }}>
      {initials}
    </div>
  )
}
