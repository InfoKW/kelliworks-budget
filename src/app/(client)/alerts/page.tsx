import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AlertCard from '@/components/dashboard/AlertCard'

export default async function AlertsPage() {
  const insforge = await createClient()
  const { data: { user } } = await insforge.auth.getCurrentUser()
  if (!user) redirect('/login')

  const { data: alerts } = await insforge.database
    .from('alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })

  const pending  = (alerts ?? []).filter((a: { status: string }) => a.status === 'pending')
  const resolved = (alerts ?? []).filter((a: { status: string }) => a.status !== 'pending')

  type AlertRow = { id: string; severity: string; type: string; title: string; description: string | null; amount: number | null; created_at: string; status: string }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Header */}
      <div className="glass" style={{ borderRadius: 20, padding: '24px 28px' }}>
        <h1 style={{ fontSize: 26 }}>Alerts &amp; Flags</h1>
        <p style={{ fontSize: 14, color: 'var(--c-slate-400)', marginTop: 6 }}>
          Review and acknowledge any flagged items from your advisor.
        </p>
      </div>

      {/* All clear */}
      {pending.length === 0 && (
        <div className="glass-card" style={{
          borderRadius: 20, padding: '56px 24px', textAlign: 'center',
          border: '1px solid rgba(34,197,94,0.15)',
        }}>
          <div className="anim-float" style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.22)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>All clear</p>
          <p style={{ fontSize: 14, color: 'var(--c-slate-500)' }}>No pending alerts — you&apos;re up to date.</p>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom: 16 }}>Pending Action</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map((alert: AlertRow) => <AlertCard key={alert.id} alert={alert} />)}
          </div>
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div style={{ opacity: 0.55 }}>
          <div className="section-label" style={{ marginBottom: 16 }}>Resolved</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {resolved.map((alert: AlertRow) => <AlertCard key={alert.id} alert={alert} />)}
          </div>
        </div>
      )}

    </div>
  )
}
