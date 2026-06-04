import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, Badge, SectionLabel } from '@/components/ui'
import { AlertTriangle, AlertCircle } from 'lucide-react'

export default async function AdminAlertsPage() {
  const supabase = await createClient()

  const { data: alerts } = await supabase.database
    .from('alerts')
    .select(`*, profiles!alerts_user_id_fkey(full_name, email)`)
    .eq('status', 'pending')
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      <div>
        <SectionLabel style={{ marginBottom: 10 }}>Admin · Alerts</SectionLabel>
        <h1 style={{ fontSize: 32, color: 'var(--c-navy-950)' }}>Pending Alerts</h1>
        <p style={{ fontSize: 14, color: 'var(--c-slate-500)', marginTop: 6 }}>
          {(alerts ?? []).length} alert{(alerts ?? []).length !== 1 ? 's' : ''} awaiting review
        </p>
      </div>

      {(alerts ?? []).length === 0 ? (
        <Card padding="56px 32px" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 24, marginBottom: 8 }}>✓</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-navy-950)', marginBottom: 4 }}>All clear</p>
          <p style={{ fontSize: 13, color: 'var(--c-slate-400)' }}>No pending alerts across all clients.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(alerts ?? []).map((alert: {
            id: string; severity: string; title: string; description: string | null
            amount: number | null; created_at: string
            profiles?: { full_name: string | null; email: string } | null
          }) => {
            const isRed = alert.severity === 'red'
            const clientName = alert.profiles?.full_name ?? alert.profiles?.email ?? 'Unknown'
            return (
              <Card key={alert.id} padding="20px 24px" style={{
                borderColor: isRed ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                background: isRed ? 'rgba(239,68,68,0.03)' : 'rgba(245,158,11,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  {/* Icon */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isRed ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                    border: `1px solid ${isRed ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  }}>
                    {isRed
                      ? <AlertCircle size={17} color="var(--c-red-500)" />
                      : <AlertTriangle size={17} color="var(--c-amber-500)" />}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                      <Badge variant={isRed ? 'red' : 'gold'}>{alert.severity}</Badge>
                      <span style={{ fontSize: 12, color: 'var(--c-slate-500)' }}>{clientName}</span>
                      <span style={{ fontSize: 12, color: 'var(--c-slate-400)', marginLeft: 'auto' }}>{formatDate(alert.created_at)}</span>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-navy-950)', marginBottom: alert.description ? 4 : 0 }}>{alert.title}</p>
                    {alert.description && <p style={{ fontSize: 13, color: 'var(--c-slate-500)', lineHeight: 1.5 }}>{alert.description}</p>}
                  </div>

                  {/* Amount */}
                  {alert.amount && (
                    <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--c-navy-950)', flexShrink: 0 }}>
                      {formatCurrency(alert.amount)}
                    </p>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
