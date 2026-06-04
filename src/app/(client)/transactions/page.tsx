import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import PlaidConnectBanner from '@/components/ui/PlaidConnectBanner'

export default async function TransactionsPage() {
  const insforge = await createClient()
  const { data: { user } } = await insforge.auth.getCurrentUser()
  if (!user) redirect('/login')

  const { data: transactions } = await insforge.database
    .from('transactions').select('*').eq('user_id', user.id)
    .order('date', { ascending: false }).limit(200)

  type Txn = { id: string; date: string; name: string; merchant_name: string | null; category: string[]; amount: number; is_matched: boolean; is_untracked: boolean }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      <div className="glass" style={{ borderRadius: 20, padding: '24px 28px' }}>
        <h1 style={{ fontSize: 26 }}>Transaction History</h1>
        <p style={{ fontSize: 14, color: 'var(--c-slate-400)', marginTop: 6 }}>
          Showing the last {Math.min((transactions ?? []).length, 200)} transactions.
        </p>
      </div>

      <PlaidConnectBanner />

      <div className="glass-card" style={{ borderRadius: 16, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '120px 1fr 160px 110px 90px',
          gap: 12, padding: '12px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.03)',
        }}>
          {['Date', 'Merchant', 'Category', 'Amount', 'Status'].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-slate-600)', textAlign: h === 'Amount' || h === 'Status' ? 'right' : 'left' }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {(transactions ?? []).length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--c-slate-500)', fontSize: 14 }}>
            No transactions found.
          </div>
        ) : (
          (transactions ?? []).map((txn: Txn, i: number) => (
            <div key={txn.id} style={{
              display: 'grid', gridTemplateColumns: '120px 1fr 160px 110px 90px',
              gap: 12, padding: '14px 20px', alignItems: 'center',
              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              transition: 'background 0.12s',
            }}>
              <span style={{ fontSize: 13, color: 'var(--c-slate-500)', fontWeight: 500 }}>{formatDate(txn.date)}</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{txn.name}</p>
                {txn.merchant_name && txn.merchant_name !== txn.name && (
                  <p style={{ fontSize: 12, color: 'var(--c-slate-500)', marginTop: 1 }}>{txn.merchant_name}</p>
                )}
              </div>
              <span style={{
                fontSize: 12, color: 'var(--c-slate-400)', fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {txn.category?.[0] ?? '—'}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', fontFamily: 'var(--font-display)', textAlign: 'right' }}>
                {formatCurrency(txn.amount)}
              </span>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {txn.is_matched ? (
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, color: '#4ade80', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>Matched</span>
                ) : txn.is_untracked ? (
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, color: '#fbbf24', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>Untracked</span>
                ) : (
                  <span style={{ color: 'var(--c-slate-600)', fontSize: 12 }}>—</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
