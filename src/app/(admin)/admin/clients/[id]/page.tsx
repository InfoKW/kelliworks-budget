import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate, getCurrentMonth, getMonthLabel } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminClientDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .database.from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const month = getCurrentMonth()

  const { data: budget } = await supabase
    .database.from('budgets')
    .select('*')
    .eq('user_id', id)
    .eq('month', month)
    .single()

  const { data: lines } = budget
    ? await supabase.database.from('budget_lines').select('*').eq('budget_id', budget.id).order('due_day')
    : { data: [] }

  const { data: alerts } = await supabase
    .database.from('alerts')
    .select('*')
    .eq('user_id', id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const { data: transactions } = await supabase
    .database.from('transactions')
    .select('*')
    .eq('user_id', id)
    .order('date', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-8">
      <div>
        <a href="/admin/clients" className="text-sm text-slate-400 hover:text-white">← All Clients</a>
        <h2 className="text-2xl font-bold text-white mt-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          {profile.full_name ?? profile.email}
        </h2>
        <p className="text-slate-400 text-sm">{profile.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-700 p-5" style={{ background: 'var(--slate-800)' }}>
          <p className="text-slate-400 text-xs uppercase tracking-wide">Subscription</p>
          <p className={`font-bold mt-1 ${profile.subscription_status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
            {profile.subscription_status}
          </p>
        </div>
        <div className="rounded-xl border border-slate-700 p-5" style={{ background: 'var(--slate-800)' }}>
          <p className="text-slate-400 text-xs uppercase tracking-wide">Open Alerts</p>
          <p className="text-white font-bold mt-1">{(alerts ?? []).length}</p>
        </div>
        <div className="rounded-xl border border-slate-700 p-5" style={{ background: 'var(--slate-800)' }}>
          <p className="text-slate-400 text-xs uppercase tracking-wide">This Month Budget</p>
          <p className="text-white font-bold mt-1">{formatCurrency(budget?.total_estimated ?? 0)}</p>
        </div>
      </div>

      {/* Budget Lines */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">{getMonthLabel(month)} Budget Lines</h3>
        {(lines ?? []).length === 0 ? (
          <p className="text-slate-500 text-sm">No budget set.</p>
        ) : (
          <div className="rounded-xl border border-slate-700 overflow-hidden" style={{ background: 'var(--slate-800)' }}>
            {(lines ?? []).map((line: { id: string; category: string; estimated_amount: number; actual_amount: number; status: string; due_day: number | null }, i: number) => (
              <div key={line.id} className={`px-5 py-4 flex justify-between ${i > 0 ? 'border-t border-slate-700' : ''}`}>
                <div>
                  <p className="text-white">{line.category}</p>
                  {line.due_day && <p className="text-xs text-slate-500">Due day {line.due_day}</p>}
                </div>
                <div className="text-right">
                  <p className="text-white">{formatCurrency(line.actual_amount)} / {formatCurrency(line.estimated_amount)}</p>
                  <p className={`text-xs font-semibold uppercase ${
                    line.status === 'paid' ? 'text-green-400' : line.status === 'overdue' ? 'text-red-400' : 'text-slate-400'
                  }`}>{line.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Recent Transactions</h3>
        <div className="rounded-xl border border-slate-700 overflow-hidden" style={{ background: 'var(--slate-800)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-left">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(transactions ?? []).map((txn: { id: string; date: string; name: string; amount: number; is_matched: boolean; is_untracked: boolean }, i: number) => (
                <tr key={txn.id} className={`${i > 0 ? 'border-t border-slate-700' : ''}`}>
                  <td className="px-5 py-3 text-slate-400">{formatDate(txn.date)}</td>
                  <td className="px-5 py-3 text-white">{txn.name}</td>
                  <td className="px-5 py-3 text-white text-right">{formatCurrency(txn.amount)}</td>
                  <td className="px-5 py-3">
                    {txn.is_matched
                      ? <span className="text-xs text-green-400">Matched</span>
                      : txn.is_untracked
                      ? <span className="text-xs text-amber-400">Untracked</span>
                      : <span className="text-xs text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
