import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

export default async function AdminClientsPage() {
  const supabase = await createClient()

  const { data: clients } = await supabase.database
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
        All Clients
      </h2>
      <div className="rounded-xl border border-slate-700 overflow-hidden" style={{ background: 'var(--slate-800)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-left">
              <th className="px-5 py-4 font-medium">Name</th>
              <th className="px-5 py-4 font-medium">Email</th>
              <th className="px-5 py-4 font-medium">Subscription</th>
              <th className="px-5 py-4 font-medium">Joined</th>
              <th className="px-5 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(clients ?? []).map((client: { id: string; full_name: string | null; email: string; subscription_status: string; created_at: string }, i: number) => (
              <tr key={client.id} className={`${i > 0 ? 'border-t border-slate-700' : ''} hover:bg-slate-700/20`}>
                <td className="px-5 py-4 text-white font-medium">{client.full_name ?? '—'}</td>
                <td className="px-5 py-4 text-slate-400">{client.email}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold uppercase px-2 py-1 rounded-full border ${
                    client.subscription_status === 'active'
                      ? 'text-green-400 bg-green-950 border-green-800'
                      : 'text-red-400 bg-red-950 border-red-800'
                  }`}>
                    {client.subscription_status}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-400">{formatDate(client.created_at)}</td>
                <td className="px-5 py-4">
                  <a
                    href={`/admin/clients/${client.id}`}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    View →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
