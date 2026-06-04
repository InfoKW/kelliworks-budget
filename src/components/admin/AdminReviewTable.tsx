'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Sparkles, Link2, X, Loader2, Check, ChevronDown } from 'lucide-react'

interface TxnRow {
  id: string
  user_id: string
  date: string
  name: string
  merchant_name: string | null
  category: string[]
  amount: number
  is_untracked: boolean
  match_confidence: number
}

interface ProfileRow { id: string; full_name: string | null; email: string }
interface BudgetRow  { id: string; month: string; user_id: string }
interface LineRow    { id: string; budget_id: string; category: string; description: string | null; estimated_amount: number; actual_amount: number; user_id: string }

interface AISuggestion {
  budget_line_id: string | null
  confidence: number
  reasoning: string
  line_name: string | null
}

interface Props {
  transactions: TxnRow[]
  profileMap: Record<string, ProfileRow>
  budgets: BudgetRow[]
  budgetLines: LineRow[]
}

function QuickMatchDropdown({ txn, lines, onMatch }: {
  txn: TxnRow
  lines: LineRow[]
  onMatch: (lineId: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  if (lines.length === 0) return (
    <span style={{ fontSize: 11, color: 'var(--c-slate-400)' }}>No budget lines</span>
  )

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6,
          background: 'transparent', border: '1px solid var(--c-slate-200)',
          color: 'var(--c-slate-600)', cursor: 'pointer',
        }}
      >
        <Link2 size={10} /> Link <ChevronDown size={10} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50,
          background: 'white', border: '1px solid var(--c-slate-200)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: 240, maxHeight: 260, overflowY: 'auto',
        }}>
          {lines.map(line => (
            <button
              key={line.id}
              disabled={saving}
              onClick={async () => {
                setOpen(false)
                setSaving(true)
                await onMatch(line.id)
                setSaving(false)
              }}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                padding: '9px 14px', cursor: 'pointer', fontSize: 12,
                borderBottom: '1px solid var(--c-slate-50)',
                color: 'var(--c-navy-950)',
              }}
            >
              <span style={{ fontWeight: 600 }}>{line.description ?? line.category}</span>
              <span style={{ color: 'var(--c-slate-400)', marginLeft: 8 }}>
                {formatCurrency(line.estimated_amount)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminReviewTable({ transactions, profileMap, budgets, budgetLines }: Props) {
  const router = useRouter()
  const [rows, setRows]           = useState<TxnRow[]>(transactions)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [aiMap, setAiMap]         = useState<Map<string, AISuggestion>>(new Map())
  const [filter, setFilter]       = useState<'all' | 'review' | 'untracked'>('all')

  const budgetMonthUserMap = useMemo(() => {
    const m = new Map<string, string>() // `${userId}/${YYYY-MM}` → budgetId
    for (const b of budgets) m.set(`${b.user_id}/${b.month.slice(0, 7)}`, b.id)
    return m
  }, [budgets])

  const linesByBudget = useMemo(() => {
    const m = new Map<string, LineRow[]>()
    for (const l of budgetLines) {
      const arr = m.get(l.budget_id) ?? []
      arr.push(l)
      m.set(l.budget_id, arr)
    }
    return m
  }, [budgetLines])

  function getLinesForTxn(txn: TxnRow): LineRow[] {
    const monthKey = txn.date.slice(0, 7)
    const budgetId = budgetMonthUserMap.get(`${txn.user_id}/${monthKey}`)
    return budgetId ? (linesByBudget.get(budgetId) ?? []) : []
  }

  async function handleMatch(txnId: string, lineId: string) {
    await fetch(`/api/transactions/${txnId}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget_line_id: lineId, save_rule: false }),
    })
    setRows(prev => prev.filter(t => t.id !== txnId))
    setAiMap(prev => { const n = new Map(prev); n.delete(txnId); return n })
    router.refresh()
  }

  async function handleAiSuggest(txnId: string) {
    setAiLoading(txnId)
    const res = await fetch(`/api/transactions/${txnId}/ai-suggest`, { method: 'POST' })
    const data = await res.json()
    setAiMap(prev => new Map(prev).set(txnId, data))
    setAiLoading(null)
  }

  async function handleAcceptAi(txnId: string) {
    const s = aiMap.get(txnId)
    if (!s?.budget_line_id) return
    await handleMatch(txnId, s.budget_line_id)
  }

  const filtered = rows.filter(t => {
    if (filter === 'review')    return !t.is_untracked && t.match_confidence >= 40
    if (filter === 'untracked') return t.is_untracked
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--c-slate-100)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {(['all', 'review', 'untracked'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: filter === f ? 700 : 500,
            background: filter === f ? 'white' : 'transparent',
            color: filter === f ? 'var(--c-navy-950)' : 'var(--c-slate-500)',
            boxShadow: filter === f ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            textTransform: 'capitalize',
          }}>
            {f === 'all' ? `All (${rows.length})` : f === 'review' ? `Needs Review (${rows.filter(t => !t.is_untracked && t.match_confidence >= 40).length})` : `Untracked (${rows.filter(t => t.is_untracked).length})`}
          </button>
        ))}
      </div>

      <div className="glass-card" style={{ borderRadius: 16, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '160px 120px 1fr 80px 100px 200px',
          gap: 12, padding: '12px 20px',
          borderBottom: '1px solid var(--c-slate-200)',
          background: 'var(--c-slate-100)',
        }}>
          {['Client', 'Date', 'Merchant', 'Amount', 'Confidence', 'Action'].map(h => (
            <span key={h} style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'var(--c-slate-500)',
              textAlign: h === 'Amount' ? 'right' : 'left',
            }}>
              {h}
            </span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--c-slate-400)', fontSize: 14 }}>
            No transactions in this category.
          </div>
        ) : (
          filtered.map((txn, i) => {
            const profile    = profileMap[txn.user_id]
            const lines      = getLinesForTxn(txn)
            const suggestion = aiMap.get(txn.id)
            const isReview   = !txn.is_untracked && txn.match_confidence >= 40

            return (
              <div key={txn.id}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '160px 120px 1fr 80px 100px 200px',
                  gap: 12, padding: '13px 20px', alignItems: 'center',
                  borderTop: i > 0 ? '1px solid var(--c-slate-100)' : 'none',
                }}>
                  {/* Client */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-navy-950)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {profile?.full_name ?? profile?.email ?? 'Unknown'}
                    </p>
                    {txn.is_untracked ? (
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#991b1b', background: 'rgba(239,68,68,0.06)', padding: '1px 5px', borderRadius: 4, border: '1px solid rgba(239,68,68,0.2)' }}>
                        Untracked
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#b45309', background: 'rgba(245,158,11,0.08)', padding: '1px 5px', borderRadius: 4, border: '1px solid rgba(245,158,11,0.2)' }}>
                        Needs Review
                      </span>
                    )}
                  </div>

                  {/* Date */}
                  <span style={{ fontSize: 12, color: 'var(--c-slate-500)' }}>{formatDate(txn.date)}</span>

                  {/* Merchant */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-navy-950)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {txn.name}
                    </p>
                    {txn.merchant_name && txn.merchant_name !== txn.name && (
                      <p style={{ fontSize: 11, color: 'var(--c-slate-400)' }}>{txn.merchant_name}</p>
                    )}
                  </div>

                  {/* Amount */}
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-navy-950)', textAlign: 'right' }}>
                    {formatCurrency(txn.amount)}
                  </span>

                  {/* Confidence */}
                  <div>
                    {txn.match_confidence > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--c-slate-200)' }}>
                          <div style={{
                            height: '100%', borderRadius: 99, width: `${txn.match_confidence}%`,
                            background: txn.match_confidence >= 70 ? 'var(--c-green-500)'
                              : txn.match_confidence >= 40 ? 'var(--c-amber-500)'
                              : 'var(--c-red-500)',
                          }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--c-slate-500)', fontWeight: 600, flexShrink: 0 }}>
                          {txn.match_confidence}%
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--c-slate-300)' }}>—</span>
                    )}
                  </div>

                  {/* Action */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      onClick={() => handleAiSuggest(txn.id)}
                      disabled={aiLoading === txn.id}
                      title="AI Suggest"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6,
                        background: 'linear-gradient(135deg, #f3e08a, #e8c547)',
                        border: '1px solid var(--c-gold-300)', color: 'var(--c-gold-600)',
                        cursor: 'pointer', opacity: aiLoading === txn.id ? 0.6 : 1,
                      }}
                    >
                      {aiLoading === txn.id
                        ? <Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite' }} />
                        : <Sparkles size={10} />}
                      AI
                    </button>
                    <QuickMatchDropdown txn={txn} lines={lines} onMatch={id => handleMatch(txn.id, id)} />
                  </div>
                </div>

                {/* AI suggestion row */}
                {suggestion && (
                  <div style={{
                    margin: '0 20px 10px', padding: '10px 14px', borderRadius: 10,
                    background: suggestion.budget_line_id ? '#fffbeb' : '#fef2f2',
                    border: `1px solid ${suggestion.budget_line_id ? 'var(--c-gold-200)' : '#fecaca'}`,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <Sparkles size={13} color={suggestion.budget_line_id ? 'var(--c-gold-500)' : 'var(--c-red-500)'} />
                    <div style={{ flex: 1 }}>
                      {suggestion.budget_line_id ? (
                        <>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-navy-950)' }}>
                            Suggested: {suggestion.line_name}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--c-slate-500)', marginLeft: 8 }}>
                            {suggestion.confidence}% — {suggestion.reasoning}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--c-red-500)' }}>{suggestion.reasoning}</span>
                      )}
                    </div>
                    {suggestion.budget_line_id && (
                      <button
                        onClick={() => handleAcceptAi(txn.id)}
                        style={{
                          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                          background: 'var(--c-gold-500)', color: 'white', border: 'none', cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        Accept
                      </button>
                    )}
                    <button
                      onClick={() => setAiMap(prev => { const n = new Map(prev); n.delete(txn.id); return n })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-slate-400)', padding: 2, flexShrink: 0 }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
