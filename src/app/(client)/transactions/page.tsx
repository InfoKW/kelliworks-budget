import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlaidConnectBanner from '@/components/ui/PlaidConnectBanner'
import TransactionsTable from '@/components/transactions/TransactionsTable'

export default async function TransactionsPage() {
  const insforge = await createClient()
  const { data: { user } } = await insforge.auth.getCurrentUser()
  if (!user) redirect('/login')

  const [
    { data: transactions },
    { data: budgets },
    { data: budgetLines },
  ] = await Promise.all([
    insforge.database.from('transactions').select('*').eq('user_id', user.id)
      .order('date', { ascending: false }).limit(200),
    insforge.database.from('budgets').select('id, month').eq('user_id', user.id),
    insforge.database.from('budget_lines').select('id, budget_id, category, description, estimated_amount, actual_amount')
      .eq('user_id', user.id),
  ])

  const txnCount = (transactions ?? []).length

  // Derive match stats
  const matched   = (transactions ?? []).filter((t: any) => t.is_matched).length
  const review    = (transactions ?? []).filter((t: any) => !t.is_matched && !t.is_untracked && (t.match_confidence ?? 0) >= 40).length
  const untracked = (transactions ?? []).filter((t: any) => t.is_untracked).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div className="glass" style={{ borderRadius: 20, padding: '24px 28px' }}>
        <h1 style={{ fontSize: 26 }}>Transaction History</h1>
        <p style={{ fontSize: 14, color: 'var(--c-slate-400)', marginTop: 6 }}>
          Showing the last {txnCount} transactions.
        </p>

        {txnCount > 0 && (
          <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
            <Stat label="Matched" value={matched} color="var(--c-green-500)" />
            <Stat label="Needs Review" value={review} color="var(--c-amber-500)" />
            <Stat label="Untracked" value={untracked} color="var(--c-red-500)" />
            <Stat label="Total" value={txnCount} color="var(--c-slate-500)" />
          </div>
        )}
      </div>

      <PlaidConnectBanner />

      <TransactionsTable
        initialTransactions={(transactions ?? []) as any}
        budgets={(budgets ?? []) as any}
        budgetLines={(budgetLines ?? []) as any}
      />
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-navy-950)' }}>{value}</span>
      <span style={{ fontSize: 13, color: 'var(--c-slate-500)' }}>{label}</span>
    </div>
  )
}
