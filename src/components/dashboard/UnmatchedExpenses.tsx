import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction } from '@/types'

export default function UnmatchedExpenses({ transactions }: { transactions: Transaction[] }) {
  return (
    <div>
      <div className="section-label" style={{ marginBottom: 16 }}>Untracked Expenses</div>
      <div className="glass-card" style={{
        overflow: 'hidden',
        border: '1px solid var(--c-slate-200)',
      }}>
        {transactions.map((txn, i) => (
          <div key={txn.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            padding: '16px 20px',
            borderTop: i > 0 ? '1px solid var(--c-slate-100)' : 'none',
          }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-navy-950)' }}>{txn.name}</p>
              <p style={{ fontSize: 12, color: 'var(--c-slate-500)', marginTop: 2, fontWeight: 500 }}>
                {txn.merchant_name ?? 'Unknown'} · {formatDate(txn.date)}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--c-navy-950)' }}>
                {formatCurrency(txn.amount)}
              </span>
              <a href="/alerts" className="btn btn-outline btn-sm" style={{ padding: '6px 12px' }}>
                Review
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
