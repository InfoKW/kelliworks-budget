import { AlertTriangle } from 'lucide-react'

interface Props {
  redCount: number
  yellowCount: number
}

export default function AlertBanner({ redCount, yellowCount }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      padding: '16px 20px', borderRadius: 16,
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
      boxShadow: '0 0 30px rgba(239,68,68,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)',
        }}>
          <AlertTriangle size={18} color="#f87171" />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>
            Action Required
          </p>
          <p style={{ fontSize: 13, color: 'var(--c-slate-400)' }}>
            {redCount > 0 && (
              <span style={{ color: '#f87171', fontWeight: 600 }}>{redCount} red alert{redCount !== 1 ? 's' : ''}</span>
            )}
            {redCount > 0 && yellowCount > 0 && <span style={{ opacity: 0.5 }}> · </span>}
            {yellowCount > 0 && (
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>{yellowCount} yellow flag{yellowCount !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
      </div>
      <a href="/alerts" className="btn btn-danger btn-sm" style={{ flexShrink: 0 }}>
        Review Now →
      </a>
    </div>
  )
}
