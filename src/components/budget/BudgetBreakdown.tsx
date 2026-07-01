'use client'

import React, { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Card, Badge, SectionLabel } from '@/components/ui'
import { Building2, User, LayoutDashboard } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawLine {
  id: string
  category: string
  description: string | null
  estimated_amount: number
  actual_amount: number
  status: string
  due_day: number | null
  notes: string | null
}

interface ParsedLine extends RawLine {
  vendor_name: string
  category_label: string
  bill_type: 'business' | 'personal'
  frequency: string | null
  payment_account: string | null
  auto_pay: boolean
  due_week: number | null
  original_notes: string | null
  display_status: string
}

interface Budget {
  total_estimated: number
  notes?: string | null
}

interface Props {
  lines: RawLine[]
  budget: Budget
  month: string
}

type Tab = 'overview' | 'business' | 'personal'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseLine(raw: RawLine): ParsedLine {
  let meta: Record<string, any> = {}
  if (raw.notes?.startsWith('{')) {
    try { meta = JSON.parse(raw.notes) } catch {}
  }
  return {
    ...raw,
    vendor_name:     raw.description ?? raw.category,
    category_label:  raw.category,
    bill_type:       meta.bill_type ?? 'personal',
    frequency:       meta.frequency ?? null,
    payment_account: meta.payment_account ?? null,
    auto_pay:        meta.auto_pay ?? false,
    due_week:        meta.due_week ?? null,
    original_notes:  meta.original_notes ?? null,
    // Use original Excel status for display; fall back to DB status
    display_status:  meta.original_status ?? raw.status,
  }
}

function statusVariant(s: string): 'green' | 'red' | 'gold' | 'neutral' {
  if (s === 'active')   return 'green'
  if (s === 'cancelled') return 'red'
  if (s === 'seasonal' || s === 'pending') return 'gold'
  return 'neutral'
}

const EMPTY = <span style={{ color: 'var(--c-slate-300)', fontWeight: 400 }}>—</span>

// ── Table primitives ─────────────────────────────────────────────────────────

const TH_STYLE: React.CSSProperties = {
  padding: '11px 16px',
  fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '0.1em', color: 'var(--c-slate-500)',
  whiteSpace: 'nowrap', background: 'var(--c-slate-100)',
  borderBottom: '1px solid var(--c-slate-200)',
}

function TH({ children, right, center, colSpan, rowSpan }: {
  children?: React.ReactNode; right?: boolean; center?: boolean; colSpan?: number; rowSpan?: number
}) {
  return (
    <th colSpan={colSpan} rowSpan={rowSpan}
      style={{ ...TH_STYLE, textAlign: right ? 'right' : center ? 'center' : 'left' }}>
      {children}
    </th>
  )
}

function TD({ children, right, center, muted, bold, colSpan }: {
  children?: React.ReactNode; right?: boolean; center?: boolean
  muted?: boolean; bold?: boolean; colSpan?: number
}) {
  return (
    <td colSpan={colSpan} style={{
      padding: '12px 16px',
      textAlign: right ? 'right' : center ? 'center' : 'left',
      fontSize: 13,
      fontWeight: bold ? 700 : 400,
      color: muted ? 'var(--c-slate-500)' : 'var(--c-navy-950)',
      whiteSpace: 'nowrap',
    }}>
      {children ?? EMPTY}
    </td>
  )
}

// Row separator
const ROW_BORDER = { borderTop: '1px solid var(--c-slate-100)' } as const

// Category section header row inside table
function CatRow({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{
        padding: '7px 16px',
        background: 'var(--c-slate-50)',
        borderTop: '2px solid var(--c-slate-200)',
        borderBottom: '1px solid var(--c-slate-200)',
        fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: 'var(--c-slate-500)',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </td>
    </tr>
  )
}

// Totals footer row
function TotalTD({ children, right, colSpan }: { children?: React.ReactNode; right?: boolean; colSpan?: number }) {
  return (
    <td colSpan={colSpan} style={{
      padding: '12px 16px',
      textAlign: right ? 'right' : 'left',
      background: 'var(--c-slate-100)',
      borderTop: '2px solid var(--c-slate-200)',
      fontSize: 13, fontWeight: 800,
      color: 'var(--c-navy-950)',
      whiteSpace: 'nowrap',
    }}>
      {children ?? EMPTY}
    </td>
  )
}

// Scrollable table wrapper
function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          {children}
        </table>
      </div>
    </Card>
  )
}

// Stat card (matches existing admin stat card style)
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card padding={22} static>
      <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--c-slate-500)', marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--c-navy-950)', lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: 'var(--c-slate-400)', marginTop: 5 }}>{sub}</p>}
    </Card>
  )
}

// ── Business / Personal budget table ─────────────────────────────────────────

function BudgetTable({ lines }: { lines: ParsedLine[] }) {
  const groups: Record<string, ParsedLine[]> = {}
  const order: string[] = []
  for (const l of lines) {
    if (!groups[l.category_label]) { groups[l.category_label] = []; order.push(l.category_label) }
    groups[l.category_label].push(l)
  }

  let rowNum = 0
  const totalEst = lines.reduce((s, l) => s + l.estimated_amount, 0)
  const totalAct = lines.reduce((s, l) => s + l.actual_amount, 0)

  return (
    <TableWrap>
      <thead>
        <tr>
          <TH center>#</TH>
          <TH>Vendor / Description</TH>
          <TH>Category</TH>
          <TH right>Budget Amount</TH>
          <TH right>Actual Amount</TH>
          <TH right>Variance ($)</TH>
          <TH right>Variance (%)</TH>
          <TH center>Frequency</TH>
          <TH center>Due Day</TH>
          <TH center>Due Week</TH>
          <TH>Payment Account</TH>
          <TH center>Auto Pay</TH>
          <TH center>Status</TH>
          <TH>Notes</TH>
        </tr>
      </thead>
      <tbody>
        {order.map(cat => (
          <React.Fragment key={cat}>
            <CatRow label={cat} colSpan={14} />
            {groups[cat].map(line => {
              rowNum++
              const hasAct = line.actual_amount > 0
              const variance = line.actual_amount - line.estimated_amount
              const varPct   = line.estimated_amount > 0
                ? ((variance / line.estimated_amount) * 100).toFixed(1) + '%'
                : null
              return (
                <tr key={line.id} style={ROW_BORDER}>
                  <TD center muted>{rowNum}</TD>
                  <TD bold>{line.vendor_name}</TD>
                  <TD muted>{line.category_label}</TD>
                  <TD right bold>{formatCurrency(line.estimated_amount)}</TD>
                  <TD right>
                    {hasAct ? formatCurrency(line.actual_amount) : EMPTY}
                  </TD>
                  <TD right>
                    {hasAct
                      ? <span style={{ color: variance > 0 ? 'var(--c-red-500)' : 'var(--c-green-500)', fontWeight: 700 }}>
                          {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                        </span>
                      : EMPTY}
                  </TD>
                  <TD right>
                    {hasAct && varPct
                      ? <span style={{ color: variance > 0 ? 'var(--c-red-500)' : 'var(--c-green-500)', fontWeight: 700 }}>
                          {variance > 0 ? '+' : ''}{varPct}
                        </span>
                      : EMPTY}
                  </TD>
                  <TD center muted>{line.frequency}</TD>
                  <TD center muted>{line.due_day}</TD>
                  <TD center muted>{line.due_week}</TD>
                  <TD muted>{line.payment_account}</TD>
                  <TD center>
                    <Badge variant={line.auto_pay ? 'green' : 'neutral'}>
                      {line.auto_pay ? 'Yes' : 'No'}
                    </Badge>
                  </TD>
                  <TD center>
                    <Badge variant={statusVariant(line.display_status)}>
                      {line.display_status.charAt(0).toUpperCase() + line.display_status.slice(1)}
                    </Badge>
                  </TD>
                  <TD muted>{line.original_notes}</TD>
                </tr>
              )
            })}
          </React.Fragment>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <TotalTD colSpan={3}>Grand Total</TotalTD>
          <TotalTD right>{formatCurrency(totalEst)}</TotalTD>
          <TotalTD right>{totalAct > 0 ? formatCurrency(totalAct) : EMPTY}</TotalTD>
          <TotalTD right>
            {totalAct > 0
              ? <span style={{ color: (totalAct - totalEst) > 0 ? 'var(--c-red-500)' : 'var(--c-green-500)' }}>
                  {(totalAct - totalEst) > 0 ? '+' : ''}{formatCurrency(totalAct - totalEst)}
                </span>
              : EMPTY}
          </TotalTD>
          <TotalTD colSpan={8} />
        </tr>
      </tfoot>
    </TableWrap>
  )
}

// ── Dashboard tab ─────────────────────────────────────────────────────────────

function DashboardView({ lines }: { lines: ParsedLine[] }) {
  const biz = lines.filter(l => l.bill_type === 'business')
  const per = lines.filter(l => l.bill_type === 'personal')

  const bizBudget = biz.reduce((s, l) => s + l.estimated_amount, 0)
  const bizActual = biz.reduce((s, l) => s + l.actual_amount, 0)
  const perBudget = per.reduce((s, l) => s + l.estimated_amount, 0)
  const perActual = per.reduce((s, l) => s + l.actual_amount, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Summary stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <StatCard label="BIZ Monthly Budget"     value={formatCurrency(bizBudget)} />
        <StatCard label="BIZ Actual (MTD)"        value={bizActual > 0 ? formatCurrency(bizActual) : '—'} />
        <StatCard label="BIZ Variance"
          value={bizActual > 0 ? formatCurrency(bizActual - bizBudget) : '—'}
          sub={bizActual > 0 ? (bizActual > bizBudget ? 'Over budget' : 'Under budget') : 'No actuals yet'}
        />
        <StatCard label="Personal Monthly Budget" value={formatCurrency(perBudget)} />
        <StatCard label="Personal Actual (MTD)"   value={perActual > 0 ? formatCurrency(perActual) : '—'} />
        <StatCard label="Personal Variance"
          value={perActual > 0 ? formatCurrency(perActual - perBudget) : '—'}
          sub={perActual > 0 ? (perActual > perBudget ? 'Over budget' : 'Under budget') : 'No actuals yet'}
        />
      </div>

    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; Icon: any }[] = [
  { id: 'overview',  label: 'Dashboard',       Icon: LayoutDashboard },
  { id: 'business',  label: 'Business Budget', Icon: Building2       },
  { id: 'personal',  label: 'Personal Budget', Icon: User            },
]

export default function BudgetBreakdown({ lines, budget, month }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const parsed   = lines.map(parseLine)
  const bizLines = parsed.filter(l => l.bill_type === 'business')
  const perLines = parsed.filter(l => l.bill_type === 'personal')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--c-slate-100)', padding: 4, borderRadius: 12, overflowX: 'auto' }}>
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id
          const count  = id === 'business' ? bizLines.length : id === 'personal' ? perLines.length : null
          return (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
              padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: active ? 600 : 500, transition: 'all 0.15s',
              background: active ? 'white' : 'transparent',
              color: active ? 'var(--c-navy-950)' : 'var(--c-slate-500)',
              boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
              <Icon size={13} />
              {label}
              {count !== null && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                  background: active ? 'var(--c-slate-100)' : 'var(--c-slate-200)',
                  color: 'var(--c-slate-600)',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {activeTab === 'overview' && <DashboardView lines={parsed} />}

      {activeTab === 'business' && (
        bizLines.length === 0
          ? <Card padding="40px 24px" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--c-slate-400)' }}>No business lines in this budget.</p>
            </Card>
          : <BudgetTable lines={bizLines} />
      )}

      {activeTab === 'personal' && (
        perLines.length === 0
          ? <Card padding="40px 24px" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--c-slate-400)' }}>No personal lines in this budget.</p>
            </Card>
          : <BudgetTable lines={perLines} />
      )}

    </div>
  )
}
