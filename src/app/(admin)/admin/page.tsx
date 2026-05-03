import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: clientRows } = await supabase.database
    .from('profiles')
    .select('id')
    .eq('role', 'client')
  const clientCount = (clientRows ?? []).length

  const { data: alertRows } = await supabase.database
    .from('alerts')
    .select('id')
    .eq('status', 'pending')
  const alertCount = (alertRows ?? []).length

  const { data: activeSubRows } = await supabase.database
    .from('profiles')
    .select('id')
    .eq('subscription_status', 'active')
  const activeSubCount = (activeSubRows ?? []).length

  const stats = [
    { label: 'Active Clients', value: clientCount },
    { label: 'Open Alerts', value: alertCount },
    { label: 'Active Subscriptions', value: activeSubCount },
  ]

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
        Admin Overview
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl border border-slate-700 p-6" style={{ background: 'var(--slate-800)' }}>
            <p className="text-slate-400 text-sm">{s.label}</p>
            <p className="text-4xl font-bold text-white mt-1">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
