import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function AdminAlertsPage() {
  const supabase = await createClient()

  const { data: alerts } = await supabase.database
    .from('alerts')
    .select(`*, profiles!alerts_user_id_fkey(full_name, email)`)
    .eq('status', 'pending')
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
        All Pending Alerts
      </h2>

      {(alerts ?? []).length === 0 ? (
        <div className="rounded-xl border border-slate-700 p-12 text-center text-slate-500" style={{ background: 'var(--slate-800)' }}>
          No pending alerts.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700 overflow-hidden" style={{ background: 'var(--slate-800)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-left">
                <th className="px-5 py-4 font-medium">Severity</th>
                <th className="px-5 py-4 font-medium">Client</th>
                <th className="px-5 py-4 font-medium">Alert</th>
                <th className="px-5 py-4 font-medium">Amount</th>
                <th className="px-5 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {(alerts ?? []).map((alert: { id: string; severity: string; title: string; amount: number | null; created_at: string; profiles?: { full_name: string | null; email: string } | null }, i: number) => (
                <tr key={alert.id} className={`${i > 0 ? 'border-t border-slate-700' : ''}`}>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full border ${
                      alert.severity === 'red'
                        ? 'text-red-400 bg-red-950 border-red-800'
                        : 'text-amber-400 bg-amber-950 border-amber-800'
                    }`}>{alert.severity}</span>
                  </td>
                  <td className="px-5 py-4 text-white">
                    {alert.profiles?.full_name ?? alert.profiles?.email ?? '—'}
                  </td>
                  <td className="px-5 py-4 text-white">{alert.title}</td>
                  <td className="px-5 py-4 text-white">{alert.amount ? formatCurrency(alert.amount) : '—'}</td>
                  <td className="px-5 py-4 text-slate-400">{formatDate(alert.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
