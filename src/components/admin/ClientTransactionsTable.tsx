'use client'

import { useState, useMemo, useTransition } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui'
import { Search, Check, X, ChevronDown, User, Building2, ArrowLeft } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type BillType = 'personal' | 'business'

interface Transaction {
  id: string
  date: string
  name: string
  amount: number
  is_matched: boolean
  is_untracked: boolean
  match_confidence: number | null
  budget_line_id: string | null
  bill_type: BillType | null
}

interface BudgetLine {
  id: string
  budget_id: string
  category: string
  description: string | null
  notes: string | null
  estimated_amount: number
}

interface Budget {
  id: string
  month: string
}

interface Props {
  transactions: Transaction[]
  budgetLines: BudgetLine[]
  budgets: Budget[]
  clientId: string
}

type FilterTab = 'all' | 'matched' | 'needs_review' | 'unmatched'

// ── Helpers ────────────────────────────────────────────────────────────────────

function getTabLabel(tab: FilterTab) {
  if (tab === 'all') return 'All'
  if (tab === 'matched') return 'Matched'
  if (tab === 'needs_review') return 'Needs Review'
  return 'Unmatched'
}

function txnStatus(t: Transaction): FilterTab {
  if (t.is_matched) return 'matched'
  if (t.is_untracked) return 'unmatched'
  if ((t.match_confidence ?? 0) >= 40) return 'needs_review'
  return 'unmatched'
}

function getVendorName(line: BudgetLine): string {
  if (line.description) return line.description
  return line.category
}

function getMonthLabel(month: string): string {
  const [y, mo] = month.slice(0, 7).split('-').map(Number)
  return new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getBillType(notes: string | null): 'business' | 'personal' {
  if (!notes) return 'personal'
  try {
    const p = JSON.parse(notes)
    return p.bill_type === 'business' ? 'business' : 'personal'
  } catch {
    return 'personal'
  }
}

// ── Budget line selector dropdown ──────────────────────────────────────────────

function BudgetLineSelector({
  budgetLines,
  budgets,
  value,
  onChange,
}: {
  budgetLines: BudgetLine[]
  budgets: Budget[]
  value: string
  onChange: (v: string) => void
}) {
  const budgetMap = Object.fromEntries(budgets.map(b => [b.id, b]))

  // Group lines by budget month
  const grouped: Record<string, { month: string; lines: BudgetLine[] }> = {}
  for (const line of budgetLines) {
    const budget = budgetMap[line.budget_id]
    if (!budget) continue
    const key = budget.id
    if (!grouped[key]) grouped[key] = { month: budget.month, lines: [] }
    grouped[key].lines.push(line)
  }

  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: 'none',
          width: '100%',
          padding: '9px 36px 9px 12px',
          borderRadius: 8,
          border: '1px solid var(--c-slate-300)',
          fontSize: 13,
          color: value ? 'var(--c-navy-950)' : 'var(--c-slate-400)',
          background: 'white',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        <option value="">Select a budget line…</option>
        {Object.entries(grouped).map(([budgetId, group]) => (
          <optgroup key={budgetId} label={getMonthLabel(group.month)}>
            {group.lines.map(line => (
              <option key={line.id} value={line.id}>
                [{getBillType(line.notes) === 'business' ? 'BIZ' : 'PER'}] {getVendorName(line)} — {formatCurrency(line.estimated_amount)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown
        size={14}
        style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--c-slate-400)', pointerEvents: 'none',
        }}
      />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ClientTransactionsTable({
  transactions,
  budgetLines,
  budgets,
  clientId,
}: Props) {
  const [billType, setBillType] = useState<BillType | null>(null)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [actionMonth, setActionMonth] = useState('')
  const [selectedLine, setSelectedLine] = useState('')
  const [isPending, startTransition] = useTransition()
  const [matchError, setMatchError] = useState<string | null>(null)
  const [matchSuccess, setMatchSuccess] = useState<string | null>(null)

  // Local mutable copy so we can update statuses without a page reload
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>(transactions)

  // Transactions filtered to the selected bill type
  const typedTransactions = useMemo(() =>
    billType ? localTransactions.filter(t => (t.bill_type ?? 'personal') === billType) : [],
  [localTransactions, billType])

  // Budget lines filtered to the selected bill type
  const typedBudgetLines = useMemo(() =>
    billType ? budgetLines.filter(l => getBillType(l.notes) === billType) : [],
  [budgetLines, billType])

  // Counts per tab
  const counts = useMemo(() => {
    const c = { all: 0, matched: 0, needs_review: 0, unmatched: 0 }
    for (const t of typedTransactions) {
      c.all++
      c[txnStatus(t)]++
    }
    return c
  }, [typedTransactions])

  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 50

  // Filtered + searched transactions (all pages)
  const visible = useMemo(() => {
    return typedTransactions.filter(t => {
      if (activeTab !== 'all' && txnStatus(t) !== activeTab) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!t.name.toLowerCase().includes(q)) return false
      }
      if (monthFilter && !t.date.startsWith(monthFilter)) return false
      return true
    })
  }, [typedTransactions, activeTab, search, monthFilter])

  // Reset to page 1 whenever filters change
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pagedVisible = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Toggles selection for the current page only
  function toggleAll() {
    const pageIds = pagedVisible.map(t => t.id)
    if (pageIds.every(id => selected.has(id))) {
      setSelected(prev => {
        const next = new Set(prev)
        pageIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        pageIds.forEach(id => next.add(id))
        return next
      })
    }
  }

  const allPageSelected = pagedVisible.length > 0 && pagedVisible.every(t => selected.has(t.id))

  async function handleBulkMatch() {
    if (!selectedLine || selected.size === 0) return
    setMatchError(null)
    setMatchSuccess(null)

    const matchedIds = new Set(selected)

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/transactions/bulk-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction_ids: [...matchedIds],
            budget_line_id: selectedLine,
          }),
        })
        const json = await res.json()
        if (!res.ok) {
          setMatchError(json.error ?? 'Failed to match transactions')
          return
        }

        // Update local state immediately — no page reload needed
        setLocalTransactions(prev =>
          prev.map(t =>
            matchedIds.has(t.id)
              ? { ...t, is_matched: true, is_untracked: false, budget_line_id: selectedLine, match_confidence: 100 }
              : t
          )
        )

        setMatchSuccess(`${json.updated} transaction${json.updated === 1 ? '' : 's'} matched successfully.`)
        setSelected(new Set())
        setSelectedLine('')
        setActionMonth('')
      } catch {
        setMatchError('Network error. Please try again.')
      }
    })
  }

  const TABS: FilterTab[] = ['all', 'matched', 'needs_review', 'unmatched']

  // ── Gate: pick bill type first ─────────────────────────────────────────────
  if (!billType) {
    const personalCount = localTransactions.filter(t => (t.bill_type ?? 'personal') === 'personal').length
    const businessCount = localTransactions.filter(t => t.bill_type === 'business').length

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--c-slate-500)' }}>
          Select which transaction log to view and match:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {([
            { type: 'personal' as BillType, label: 'Personal Transactions', sub: 'From the personal bank account', Icon: User, count: personalCount },
            { type: 'business' as BillType, label: 'Business Transactions', sub: 'From the business bank account', Icon: Building2, count: businessCount },
          ]).map(({ type, label, sub, Icon, count }) => (
            <button
              key={type}
              onClick={() => setBillType(type)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                padding: '28px 28px 24px', borderRadius: 16, cursor: 'pointer',
                background: 'white', border: '1px solid var(--c-slate-200)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                textAlign: 'left', transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-gold-400)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(184,134,11,0.12)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-slate-200)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, marginBottom: 16,
                background: 'var(--c-slate-100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: type === 'business' ? 'var(--c-gold-600)' : '#1166e5',
              }}>
                <Icon size={20} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-navy-950)', marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 13, color: 'var(--c-slate-500)', marginBottom: 16 }}>{sub}</p>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                background: 'var(--c-slate-100)', color: 'var(--c-slate-600)',
              }}>
                {count} transaction{count !== 1 ? 's' : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Bill type header + back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => { setBillType(null); setSelected(new Set()); setSearch(''); setMonthFilter('') }}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--c-slate-500)', fontWeight: 500, padding: 0,
          }}
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <span style={{ color: 'var(--c-slate-200)' }}>|</span>
        <span style={{
          fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
          color: billType === 'business' ? 'var(--c-gold-600)' : '#1166e5',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {billType === 'business' ? <Building2 size={13} /> : <User size={13} />}
          {billType === 'business' ? 'Business Transactions' : 'Personal Transactions'}
        </span>
      </div>

      {/* Filter tabs + search row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--c-slate-100)', padding: 4, borderRadius: 10 }}>
          {TABS.map(tab => {
            const active = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelected(new Set()); setCurrentPage(1) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                  padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  background: active ? 'white' : 'transparent',
                  color: active ? 'var(--c-navy-950)' : 'var(--c-slate-500)',
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.12s',
                }}
              >
                {getTabLabel(tab)}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                  background: active ? 'var(--c-slate-100)' : 'var(--c-slate-200)',
                  color: 'var(--c-slate-600)',
                }}>
                  {counts[tab]}
                </span>
              </button>
            )
          })}
        </div>

        {/* Month filter + Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <input
              type="month"
              value={monthFilter}
              onChange={e => { setMonthFilter(e.target.value); setCurrentPage(1) }}
              title="Filter by month"
              style={{
                padding: '8px 10px', borderRadius: 8,
                border: '1px solid var(--c-slate-200)',
                fontSize: 13, color: monthFilter ? 'var(--c-navy-950)' : 'var(--c-slate-400)',
                background: 'white', outline: 'none', cursor: 'pointer',
              }}
            />
          </div>
          {monthFilter && (
            <button
              onClick={() => setMonthFilter('')}
              title="Clear month filter"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 6,
                border: '1px solid var(--c-slate-200)', background: 'white',
                color: 'var(--c-slate-400)', cursor: 'pointer', flexShrink: 0,
              }}
            >
              <X size={12} />
            </button>
          )}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Search size={13} style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--c-slate-400)', pointerEvents: 'none',
            }} />
            <input
              type="text"
              placeholder="Search transactions…"
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
              style={{
                padding: '8px 12px 8px 30px',
                borderRadius: 8, border: '1px solid var(--c-slate-200)',
                fontSize: 13, color: 'var(--c-navy-950)', background: 'white',
                width: 220, outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Success / Error banners */}
      {matchSuccess && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Check size={14} /> {matchSuccess}
        </div>
      )}
      {matchError && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <X size={14} /> {matchError}
        </div>
      )}

      {/* Transaction table */}
      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
            <thead>
              <tr style={{ background: 'var(--c-slate-100)', borderBottom: '1px solid var(--c-slate-200)' }}>
                <th style={{ padding: '10px 16px', width: 40 }}>
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAll}
                    style={{ cursor: 'pointer', width: 14, height: 14 }}
                  />
                </th>
                {['Date', 'Name', 'Amount', 'Status', 'Matched To'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: h === 'Amount' ? 'right' : 'left',
                    fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: 'var(--c-slate-500)', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedVisible.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--c-slate-400)' }}>
                    No transactions found.
                  </td>
                </tr>
              ) : (
                pagedVisible.map((txn, i) => {
                  const status = txnStatus(txn)
                  const isSelected = selected.has(txn.id)
                  const matchedLine = txn.budget_line_id
                    ? budgetLines.find(l => l.id === txn.budget_line_id)
                    : null

                  const statusColor =
                    status === 'matched' ? '#16a34a' :
                    status === 'needs_review' ? '#b45309' :
                    'var(--c-slate-400)'

                  const statusLabel =
                    status === 'matched' ? 'Matched' :
                    status === 'needs_review' ? 'Needs Review' :
                    'Unmatched'

                  return (
                    <tr
                      key={txn.id}
                      style={{
                        borderTop: i > 0 ? '1px solid var(--c-slate-100)' : 'none',
                        background: isSelected ? 'rgba(234,179,8,0.04)' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleSelect(txn.id)}
                    >
                      <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(txn.id)}
                          style={{ cursor: 'pointer', width: 14, height: 14 }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--c-slate-500)', whiteSpace: 'nowrap' }}>
                        {formatDate(txn.date)}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--c-navy-950)' }}>
                        {txn.name}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--c-navy-950)', whiteSpace: 'nowrap' }}>
                        {formatCurrency(txn.amount)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.08em', color: statusColor,
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block', flexShrink: 0 }} />
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--c-slate-500)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {matchedLine
                          ? <span style={{ color: 'var(--c-navy-950)', fontWeight: 500 }}>
                              {getVendorName(matchedLine)}
                            </span>
                          : <span style={{ color: 'var(--c-slate-300)' }}>—</span>
                        }
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--c-slate-500)' }}>
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, visible.length)} of {visible.length} transactions
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: '1px solid var(--c-slate-200)', background: 'white',
                color: safePage === 1 ? 'var(--c-slate-300)' : 'var(--c-navy-950)',
                cursor: safePage === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Prev
            </button>

            {/* Page number pills */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
              .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--c-slate-400)', fontSize: 13 }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p as number)}
                    style={{
                      width: 34, height: 34, borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: '1px solid var(--c-slate-200)',
                      background: p === safePage ? 'var(--c-navy-950)' : 'white',
                      color: p === safePage ? 'white' : 'var(--c-navy-950)',
                      cursor: 'pointer',
                    }}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: '1px solid var(--c-slate-200)', background: 'white',
                color: safePage === totalPages ? 'var(--c-slate-300)' : 'var(--c-navy-950)',
                cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Floating bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--c-navy-950)',
          borderRadius: 14, padding: '12px 16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'white', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {selected.size} selected
          </span>

          {/* Month picker for budget lines */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <select
              value={actionMonth}
              onChange={e => { setActionMonth(e.target.value); setSelectedLine('') }}
              style={{
                appearance: 'none',
                padding: '9px 30px 9px 12px',
                borderRadius: 8, border: 'none',
                fontSize: 13, fontWeight: 500,
                color: actionMonth ? 'var(--c-navy-950)' : 'var(--c-slate-400)',
                background: 'white', cursor: 'pointer', outline: 'none',
                minWidth: 150,
              }}
            >
              <option value="">All months</option>
              {budgets.map(b => (
                <option key={b.id} value={b.id}>
                  {getMonthLabel(b.month)}
                </option>
              ))}
            </select>
            <ChevronDown size={13} style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--c-slate-400)', pointerEvents: 'none',
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <BudgetLineSelector
              budgetLines={actionMonth ? typedBudgetLines.filter(l => l.budget_id === actionMonth) : typedBudgetLines}
              budgets={budgets}
              value={selectedLine}
              onChange={setSelectedLine}
            />
          </div>

          <button
            onClick={handleBulkMatch}
            disabled={!selectedLine || isPending}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              background: selectedLine && !isPending ? 'var(--c-gold-500)' : 'rgba(255,255,255,0.15)',
              color: 'white', border: 'none', cursor: selectedLine && !isPending ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {isPending
              ? <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} />
              : <Check size={13} />
            }
            {isPending ? 'Matching…' : 'Match'}
          </button>

          <button
            onClick={() => setSelected(new Set())}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: 7, border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <X size={13} />
          </button>
        </div>
      )}

    </div>
  )
}
