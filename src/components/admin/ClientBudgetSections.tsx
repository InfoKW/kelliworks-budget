'use client'

import { useState } from 'react'
import { formatCurrency, getMonthLabel } from '@/lib/utils'
import { ProgressBar, SectionLabel } from '@/components/ui'
import { ChevronRight, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface BudgetLine {
  id: string
  budget_id: string
  estimated_amount: number
  actual_amount: number
  notes: string | null
}

interface Budget {
  id: string
  month: string
  total_estimated: number
}

interface Props {
  budgets: Budget[]
  linesByBudget: Record<string, BudgetLine[]>
  clientId: string
}

function getBillType(notes: string | null): 'business' | 'personal' {
  if (!notes) return 'personal'
  try {
    const parsed = JSON.parse(notes)
    return parsed.bill_type === 'business' ? 'business' : 'personal'
  } catch {
    return 'personal'
  }
}

export default function ClientBudgetSections({ budgets, linesByBudget, clientId }: Props) {
  // First budget expanded by default, rest collapsed
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(budgets.map((b, i) => [b.id, i === 0]))
  )

  function toggle(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (budgets.length === 0) {
    return (
      <div style={{
        padding: '32px', borderRadius: 16, textAlign: 'center',
        background: 'white', border: '1px solid var(--c-slate-200)',
      }}>
        <p style={{ fontSize: 13, color: 'var(--c-slate-400)' }}>No budget uploaded yet.</p>
        <Link href="/admin/budgets" style={{ fontSize: 13, color: 'var(--c-gold-600)', fontWeight: 600, marginTop: 8, display: 'inline-block' }}>
          Upload budget →
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {budgets.map((budget) => {
        const isOpen = !!expanded[budget.id]
        const budgetLines = linesByBudget[budget.id] ?? []
        const bizLines = budgetLines.filter(l => getBillType(l.notes) === 'business')
        const perLines = budgetLines.filter(l => getBillType(l.notes) === 'personal')

        const bizEstimated = bizLines.reduce((s, l) => s + l.estimated_amount, 0)
        const bizActual    = bizLines.reduce((s, l) => s + (l.actual_amount ?? 0), 0)
        const bizPct       = bizEstimated > 0 ? Math.round((bizActual / bizEstimated) * 100) : 0

        const perEstimated = perLines.reduce((s, l) => s + l.estimated_amount, 0)
        const perActual    = perLines.reduce((s, l) => s + (l.actual_amount ?? 0), 0)
        const perPct       = perEstimated > 0 ? Math.round((perActual / perEstimated) * 100) : 0

        const monthParam = budget.month.slice(0, 7)

        return (
          <div key={budget.id}>
            {/* Collapsible header */}
            <button
              onClick={() => toggle(budget.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 0', marginBottom: isOpen ? 12 : 0,
              }}
            >
              {isOpen
                ? <ChevronDown size={14} color="var(--c-gold-600)" />
                : <ChevronRight size={14} color="var(--c-gold-600)" />
              }
              <SectionLabel style={{ margin: 0 }}>
                {getMonthLabel(budget.month).toUpperCase()} BUDGET
              </SectionLabel>
            </button>

            {/* Expandable budget cards */}
            {isOpen && (
              <div style={{
                display: 'flex', alignItems: 'stretch',
                background: 'white', borderRadius: 16,
                border: '1px solid var(--c-slate-200)',
                overflow: 'hidden',
              }}>
                {/* Business Budget */}
                <div style={{ flex: 1, padding: '20px 24px', borderRight: '1px solid var(--c-slate-200)' }}>
                  <SectionLabel style={{ marginBottom: 14 }}>Business Budget</SectionLabel>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: 1,
                      color: 'var(--c-gold-600)',
                    }}>
                      {bizPct}%
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-navy-950)' }}>
                      {formatCurrency(bizEstimated)}
                    </span>
                  </div>
                  <ProgressBar value={bizPct} height={6} statusColor />
                </div>

                {/* Personal Budget */}
                <div style={{ flex: 1, padding: '20px 24px' }}>
                  <SectionLabel style={{ marginBottom: 14 }}>Personal Budget</SectionLabel>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: 1,
                      color: 'var(--c-gold-600)',
                    }}>
                      {perPct}%
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-navy-950)' }}>
                      {formatCurrency(perEstimated)}
                    </span>
                  </div>
                  <ProgressBar value={perPct} height={6} statusColor />
                </div>

                {/* Navigate to full budget */}
                <Link
                  href={`/admin/clients/${clientId}/budget?month=${monthParam}`}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '0 16px',
                    borderLeft: '1px solid var(--c-slate-200)',
                    color: 'var(--c-slate-400)', textDecoration: 'none',
                  }}
                >
                  <ChevronRight size={18} />
                </Link>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
