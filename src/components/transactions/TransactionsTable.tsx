'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Link2, X, Sparkles, Loader2, Check, AlertCircle } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TxnRow {
  id: string
  date: string
  name: string
  merchant_name: string | null
  category: string[]
  amount: number
  is_matched: boolean
  is_untracked: boolean
  budget_line_id: string | null
  match_confidence: number
  match_source: string | null
}

interface BudgetLineRow {
  id: string
  budget_id: string
  category: string
  description: string | null
  estimated_amount: number
  actual_amount: number
}

interface BudgetRow {
  id: string
  month: string  // YYYY-MM-01
}

interface AISuggestion {
  budget_line_id: string | null
  confidence: number
  reasoning: string
  line_name: string | null
}

interface Props {
  initialTransactions: TxnRow[]
  budgets: BudgetRow[]
  budgetLines: BudgetLineRow[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatusBadge(txn: TxnRow) {
  if (txn.is_matched) {
    const label = txn.match_source === 'rule' ? 'Rule'
      : txn.match_source === 'ai' ? 'AI'
      : txn.match_source === 'manual' ? 'Manual'
      : 'Auto'
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
        padding: '3px 8px', borderRadius: 5,
        background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534',
      }}>
        <Check size={9} />
        {label}
      </span>
    )
  }
  if (!txn.is_untracked && txn.match_confidence >= 40) {
    return (
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
        padding: '3px 8px', borderRadius: 5,
        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#b45309',
      }}>
        Review
      </span>
    )
  }
  if (txn.is_untracked) {
    return (
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
        padding: '3px 8px', borderRadius: 5,
        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#991b1b',
      }}>
        Untracked
      </span>
    )
  }
  return <span style={{ color: 'var(--c-slate-300)', fontSize: 12 }}>—</span>
}

// ── Match Modal ───────────────────────────────────────────────────────────────

function MatchModal({
  txn,
  lines,
  onClose,
  onMatch,
}: {
  txn: TxnRow
  lines: BudgetLineRow[]
  onClose: () => void
  onMatch: (lineId: string, saveRule: boolean, pattern: string) => Promise<void>
}) {
  const [selectedLine, setSelectedLine] = useState<string | null>(null)
  const [saveRule, setSaveRule] = useState(false)
  const [pattern, setPattern] = useState((txn.merchant_name ?? txn.name).toLowerCase())
  const [saving, setSaving] = useState(false)

  async function handleConfirm() {
    if (!selectedLine) return
    setSaving(true)
    await onMatch(selectedLine, saveRule, pattern)
    setSaving(false)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(2,6,23,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'white', borderRadius: 20, width: '100%', maxWidth: 520,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--c-slate-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-navy-950)', marginBottom: 4 }}>
              Link to Budget Line
            </p>
            <p style={{ fontSize: 13, color: 'var(--c-slate-500)' }}>
              {txn.merchant_name ?? txn.name} &nbsp;·&nbsp; {formatCurrency(txn.amount)} &nbsp;·&nbsp; {formatDate(txn.date)}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-slate-400)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Budget lines list */}
        <div style={{ maxHeight: 300, overflowY: 'auto', padding: '12px 16px' }}>
          {lines.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--c-slate-400)', textAlign: 'center', padding: '24px 0' }}>
              No budget lines for this month.
            </p>
          ) : (
            lines.map(line => {
              const pct = line.estimated_amount > 0
                ? Math.min((line.actual_amount / line.estimated_amount) * 100, 100)
                : 0
              const selected = selectedLine === line.id
              return (
                <button
                  key={line.id}
                  onClick={() => setSelectedLine(line.id)}
                  style={{
                    width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                    padding: '11px 14px', borderRadius: 10, marginBottom: 6,
                    background: selected ? 'var(--c-slate-100)' : 'transparent',
                    outline: selected ? '2px solid var(--c-gold-400)' : '1px solid var(--c-slate-100)',
                    transition: 'all 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-navy-950)' }}>
                      {line.description ?? line.category}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--c-slate-500)' }}>
                      {formatCurrency(line.actual_amount)} / {formatCurrency(line.estimated_amount)}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, height: 3, borderRadius: 99, background: 'var(--c-slate-200)' }}>
                    <div style={{
                      height: '100%', borderRadius: 99, width: `${pct}%`,
                      background: pct >= 100 ? 'var(--c-red-500)' : pct >= 80 ? 'var(--c-amber-500)' : 'var(--c-green-500)',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--c-slate-400)', marginTop: 3 }}>
                    {line.category}
                  </p>
                </button>
              )
            })
          )}
        </div>

        {/* Save rule option */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--c-slate-100)', borderBottom: '1px solid var(--c-slate-100)', background: 'var(--c-slate-50)' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={saveRule}
              onChange={e => setSaveRule(e.target.checked)}
              style={{ marginTop: 2, accentColor: 'var(--c-gold-500)' }}
            />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-navy-950)' }}>Remember this merchant</p>
              <p style={{ fontSize: 12, color: 'var(--c-slate-500)' }}>Always match transactions from this merchant to the selected line</p>
            </div>
          </label>
          {saveRule && (
            <input
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              placeholder="merchant pattern"
              style={{
                marginTop: 10, width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--c-slate-300)', fontSize: 13, color: 'var(--c-navy-950)',
                fontFamily: 'inherit', background: 'white',
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={!selectedLine || saving}
            className="btn btn-sm"
            style={{
              background: selectedLine ? 'var(--c-gold-500)' : 'var(--c-slate-200)',
              color: selectedLine ? 'white' : 'var(--c-slate-400)',
              border: 'none', opacity: saving ? 0.7 : 1,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {saving && <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />}
            Link to Budget Line
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TransactionsTable({ initialTransactions, budgets, budgetLines }: Props) {
  const router = useRouter()
  const [transactions, setTransactions] = useState<TxnRow[]>(initialTransactions)
  const [modalTxn, setModalTxn]         = useState<TxnRow | null>(null)
  const [unlinking, setUnlinking]       = useState<string | null>(null)
  const [aiLoading, setAiLoading]       = useState<string | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<Map<string, AISuggestion>>(new Map())

  // Build lookup maps
  const lineMap = useMemo(
    () => new Map(budgetLines.map(l => [l.id, l])),
    [budgetLines],
  )
  const budgetMonthMap = useMemo(
    () => new Map(budgets.map(b => [b.month.slice(0, 7), b.id])),
    [budgets],
  )

  function getLinesForTxn(txn: TxnRow): BudgetLineRow[] {
    const monthKey = txn.date.slice(0, 7)
    const budgetId = budgetMonthMap.get(monthKey)
    return budgetId ? budgetLines.filter(l => l.budget_id === budgetId) : []
  }

  // Match a transaction to a budget line
  async function handleMatch(txnId: string, lineId: string, saveRule: boolean, pattern: string) {
    const txn = transactions.find(t => t.id === txnId)
    await fetch(`/api/transactions/${txnId}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget_line_id: lineId, save_rule: saveRule, merchant_pattern: pattern }),
    })
    const line = lineMap.get(lineId)
    setTransactions(prev => prev.map(t =>
      t.id === txnId
        ? { ...t, budget_line_id: lineId, is_matched: true, is_untracked: false, match_source: 'manual', match_confidence: 100 }
        : t,
    ))
    // Remove AI suggestion for this txn if any
    setAiSuggestions(prev => { const n = new Map(prev); n.delete(txnId); return n })
    router.refresh()
  }

  // Unlink a transaction
  async function handleUnlink(txnId: string) {
    setUnlinking(txnId)
    await fetch(`/api/transactions/${txnId}/match`, { method: 'DELETE' })
    setTransactions(prev => prev.map(t =>
      t.id === txnId
        ? { ...t, budget_line_id: null, is_matched: false, match_source: null, match_confidence: 0 }
        : t,
    ))
    setUnlinking(null)
    router.refresh()
  }

  // Get AI suggestion for a transaction
  async function handleAiSuggest(txnId: string) {
    setAiLoading(txnId)
    const res = await fetch(`/api/transactions/${txnId}/ai-suggest`, { method: 'POST' })
    const data = await res.json()
    if (res.ok && data.budget_line_id) {
      setAiSuggestions(prev => new Map(prev).set(txnId, data))
    } else {
      setAiSuggestions(prev => new Map(prev).set(txnId, { budget_line_id: null, confidence: 0, reasoning: data.error ?? 'No match found', line_name: null }))
    }
    setAiLoading(null)
  }

  // Accept an AI suggestion
  async function handleAcceptAi(txnId: string) {
    const suggestion = aiSuggestions.get(txnId)
    if (!suggestion?.budget_line_id) return
    const txn = transactions.find(t => t.id === txnId)
    const pattern = (txn?.merchant_name ?? txn?.name ?? '').toLowerCase()
    await fetch(`/api/transactions/${txnId}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget_line_id: suggestion.budget_line_id, save_rule: false, merchant_pattern: pattern }),
    })
    setTransactions(prev => prev.map(t =>
      t.id === txnId
        ? { ...t, budget_line_id: suggestion.budget_line_id!, is_matched: true, is_untracked: false, match_source: 'ai', match_confidence: suggestion.confidence }
        : t,
    ))
    setAiSuggestions(prev => { const n = new Map(prev); n.delete(txnId); return n })
    router.refresh()
  }

  return (
    <>
      {modalTxn && (
        <MatchModal
          txn={modalTxn}
          lines={getLinesForTxn(modalTxn)}
          onClose={() => setModalTxn(null)}
          onMatch={(lineId, saveRule, pattern) => handleMatch(modalTxn.id, lineId, saveRule, pattern)}
        />
      )}

      <div className="glass-card" style={{ borderRadius: 16, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '110px 1fr 200px 100px 120px',
          gap: 12, padding: '12px 20px',
          borderBottom: '1px solid var(--c-slate-200)',
          background: 'var(--c-slate-100)',
        }}>
          {['Date', 'Merchant', 'Budget Line', 'Amount', 'Status'].map(h => (
            <span key={h} style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'var(--c-slate-500)',
              textAlign: h === 'Amount' ? 'right' : 'left',
            }}>
              {h}
            </span>
          ))}
        </div>

        {transactions.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--c-slate-500)', fontSize: 14 }}>
            No transactions found.
          </div>
        ) : (
          transactions.map((txn, i) => {
            const matchedLine  = txn.budget_line_id ? lineMap.get(txn.budget_line_id) : null
            const isReview     = !txn.is_matched && !txn.is_untracked && txn.match_confidence >= 40
            const aiSuggestion = aiSuggestions.get(txn.id)

            return (
              <div key={txn.id}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '110px 1fr 200px 100px 120px',
                  gap: 12, padding: '13px 20px', alignItems: 'center',
                  borderTop: i > 0 ? '1px solid var(--c-slate-100)' : 'none',
                }}>
                  {/* Date */}
                  <span style={{ fontSize: 13, color: 'var(--c-slate-500)', fontWeight: 500 }}>
                    {formatDate(txn.date)}
                  </span>

                  {/* Merchant */}
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-navy-950)' }}>{txn.name}</p>
                    {txn.merchant_name && txn.merchant_name !== txn.name && (
                      <p style={{ fontSize: 12, color: 'var(--c-slate-400)', marginTop: 1 }}>{txn.merchant_name}</p>
                    )}
                  </div>

                  {/* Budget Line */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    {matchedLine ? (
                      <>
                        <span style={{
                          fontSize: 12, fontWeight: 600, color: 'var(--c-navy-950)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {matchedLine.description ?? matchedLine.category}
                        </span>
                        <button
                          onClick={() => handleUnlink(txn.id)}
                          disabled={unlinking === txn.id}
                          title="Unlink"
                          style={{
                            flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--c-slate-300)', padding: 2, display: 'flex',
                            opacity: unlinking === txn.id ? 0.4 : 1,
                          }}
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : isReview ? (
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        <button
                          onClick={() => handleAiSuggest(txn.id)}
                          disabled={aiLoading === txn.id}
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
                        <button
                          onClick={() => setModalTxn(txn)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6,
                            background: 'transparent', border: '1px solid var(--c-slate-200)',
                            color: 'var(--c-slate-600)', cursor: 'pointer',
                          }}
                        >
                          <Link2 size={10} /> Link
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setModalTxn(txn)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6,
                          background: 'transparent', border: '1px solid var(--c-slate-200)',
                          color: 'var(--c-slate-500)', cursor: 'pointer',
                        }}
                      >
                        <Link2 size={10} /> Link
                      </button>
                    )}
                  </div>

                  {/* Amount */}
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-navy-950)', textAlign: 'right' }}>
                    {formatCurrency(txn.amount)}
                  </span>

                  {/* Status */}
                  <div>{getStatusBadge(txn)}</div>
                </div>

                {/* AI suggestion row */}
                {aiSuggestion && (
                  <div style={{
                    margin: '0 20px 10px',
                    padding: '10px 14px', borderRadius: 10,
                    background: aiSuggestion.budget_line_id ? '#fffbeb' : '#fef2f2',
                    border: `1px solid ${aiSuggestion.budget_line_id ? 'var(--c-gold-200)' : '#fecaca'}`,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <Sparkles size={13} color={aiSuggestion.budget_line_id ? 'var(--c-gold-500)' : 'var(--c-red-500)'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {aiSuggestion.budget_line_id ? (
                        <>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-navy-950)' }}>
                            Suggested: {aiSuggestion.line_name}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--c-slate-500)', marginLeft: 8 }}>
                            {aiSuggestion.confidence}% confidence — {aiSuggestion.reasoning}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--c-red-500)' }}>
                          {aiSuggestion.reasoning}
                        </span>
                      )}
                    </div>
                    {aiSuggestion.budget_line_id && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => handleAcceptAi(txn.id)}
                          style={{
                            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                            background: 'var(--c-gold-500)', color: 'white', border: 'none', cursor: 'pointer',
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => { setModalTxn(txn); setAiSuggestions(prev => { const n = new Map(prev); n.delete(txn.id); return n }) }}
                          style={{
                            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                            background: 'transparent', border: '1px solid var(--c-slate-200)',
                            color: 'var(--c-slate-600)', cursor: 'pointer',
                          }}
                        >
                          Change
                        </button>
                        <button
                          onClick={() => setAiSuggestions(prev => { const n = new Map(prev); n.delete(txn.id); return n })}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-slate-400)', padding: 2 }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}
                    {!aiSuggestion.budget_line_id && (
                      <button
                        onClick={() => setAiSuggestions(prev => { const n = new Map(prev); n.delete(txn.id); return n })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-slate-400)', padding: 2, flexShrink: 0 }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
