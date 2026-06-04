'use client'

import React, { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Card, Badge, SectionLabel } from '@/components/ui'
import { Building2, User, CalendarDays, TrendingUp, LayoutDashboard } from 'lucide-react'

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

interface CalendarItem {
  week: number
  vendor: string
  category: string
  amount: number
  account: string | null
  auto_pay: boolean
  due_day: number | null
  notes: string | null
}

interface ForecastItem {
  vendor: string
  category: string
  m1_budget: number
  m1_projected: number
  m2_budget: number
  m2_projected: number
  m3_budget: number
  m3_projected: number
  frequency: string | null
  notes: string | null
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

type Tab = 'overview' | 'business' | 'personal' | 'calendar' | 'forecast'

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

  // Category cross-tab
  const allCats = Array.from(new Set(lines.map(l => l.category_label))).sort()
  const catMap: Record<string, { bizEst: number; bizAct: number; perEst: number; perAct: number }> = {}
  for (const cat of allCats) catMap[cat] = { bizEst: 0, bizAct: 0, perEst: 0, perAct: 0 }
  for (const l of lines) {
    const c = catMap[l.category_label]
    if (l.bill_type === 'business') { c.bizEst += l.estimated_amount; c.bizAct += l.actual_amount }
    else                            { c.perEst += l.estimated_amount; c.perAct += l.actual_amount }
  }

  // Payments by account
  const acctMap: Record<string, { count: number; total: number; autoPay: string[] }> = {}
  for (const l of lines) {
    const acct = l.payment_account ?? 'Other'
    if (!acctMap[acct]) acctMap[acct] = { count: 0, total: 0, autoPay: [] }
    acctMap[acct].count++
    acctMap[acct].total += l.estimated_amount
    if (l.auto_pay) acctMap[acct].autoPay.push(l.vendor_name)
  }

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
        <StatCard label="Combined Budget"          value={formatCurrency(bizBudget + perBudget)} sub="Business + Personal" />
      </div>

      {/* Spending by Category */}
      <div>
        <SectionLabel style={{ marginBottom: 14 }}>Spending by Category — Business vs. Personal</SectionLabel>
        <TableWrap>
          <thead>
            <tr>
              <TH>Category</TH>
              <TH right>BIZ Budget</TH>
              <TH right>BIZ Actual</TH>
              <TH right>BIZ Variance</TH>
              <TH right>Personal Budget</TH>
              <TH right>Personal Actual</TH>
              <TH right>Personal Variance</TH>
              <TH right>Combined Total</TH>
            </tr>
          </thead>
          <tbody>
            {allCats.map(cat => {
              const c = catMap[cat]
              const bizVar = c.bizAct - c.bizEst
              const perVar = c.perAct - c.perEst
              return (
                <tr key={cat} style={ROW_BORDER}>
                  <TD bold>{cat}</TD>
                  <TD right>{c.bizEst ? formatCurrency(c.bizEst) : EMPTY}</TD>
                  <TD right>{c.bizAct ? formatCurrency(c.bizAct) : EMPTY}</TD>
                  <TD right>
                    {c.bizAct
                      ? <span style={{ color: bizVar > 0 ? 'var(--c-red-500)' : 'var(--c-green-500)', fontWeight: 700 }}>
                          {bizVar > 0 ? '+' : ''}{formatCurrency(bizVar)}
                        </span>
                      : EMPTY}
                  </TD>
                  <TD right>{c.perEst ? formatCurrency(c.perEst) : EMPTY}</TD>
                  <TD right>{c.perAct ? formatCurrency(c.perAct) : EMPTY}</TD>
                  <TD right>
                    {c.perAct
                      ? <span style={{ color: perVar > 0 ? 'var(--c-red-500)' : 'var(--c-green-500)', fontWeight: 700 }}>
                          {perVar > 0 ? '+' : ''}{formatCurrency(perVar)}
                        </span>
                      : EMPTY}
                  </TD>
                  <TD right bold>{formatCurrency(c.bizEst + c.perEst)}</TD>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <TotalTD>Total</TotalTD>
              <TotalTD right>{formatCurrency(bizBudget)}</TotalTD>
              <TotalTD right>{bizActual > 0 ? formatCurrency(bizActual) : EMPTY}</TotalTD>
              <TotalTD right>{bizActual > 0 ? formatCurrency(bizActual - bizBudget) : EMPTY}</TotalTD>
              <TotalTD right>{formatCurrency(perBudget)}</TotalTD>
              <TotalTD right>{perActual > 0 ? formatCurrency(perActual) : EMPTY}</TotalTD>
              <TotalTD right>{perActual > 0 ? formatCurrency(perActual - perBudget) : EMPTY}</TotalTD>
              <TotalTD right>{formatCurrency(bizBudget + perBudget)}</TotalTD>
            </tr>
          </tfoot>
        </TableWrap>
      </div>

      {/* Payments by Account */}
      <div>
        <SectionLabel style={{ marginBottom: 14 }}>Payments by Account — Monthly Summary</SectionLabel>
        <TableWrap>
          <thead>
            <tr>
              <TH>Payment Account</TH>
              <TH center># of Bills</TH>
              <TH right>Total Budget</TH>
              <TH>Auto-Pay Bills</TH>
            </tr>
          </thead>
          <tbody>
            {Object.entries(acctMap)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([acct, data], i) => (
                <tr key={acct} style={ROW_BORDER}>
                  <TD bold>{acct}</TD>
                  <TD center muted>{data.count}</TD>
                  <TD right bold>{formatCurrency(data.total)}</TD>
                  <TD muted>
                    {data.autoPay.length > 0 ? data.autoPay.join(', ') : EMPTY}
                  </TD>
                </tr>
              ))}
          </tbody>
        </TableWrap>
      </div>
    </div>
  )
}

// ── Payment Calendar tab ──────────────────────────────────────────────────────

const WEEK_LABELS: Record<number, string> = {
  1: 'Week 1 — Days 1–7',
  2: 'Week 2 — Days 8–14',
  3: 'Week 3 — Days 15–21',
  4: 'Week 4 — Days 22–31',
}

function CalendarView({ items }: { items: CalendarItem[] }) {
  if (items.length === 0) {
    return (
      <Card padding="40px 24px" style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-navy-950)', marginBottom: 6 }}>
          No Payment Calendar data
        </p>
        <p style={{ fontSize: 13, color: 'var(--c-slate-400)' }}>
          Re-upload the budget file to populate this tab from the Payment Calendar sheet.
        </p>
      </Card>
    )
  }

  // Group by week, preserving file order within each week
  const buckets: Record<number, CalendarItem[]> = {}
  for (const item of items) {
    const w = item.week
    if (!buckets[w]) buckets[w] = []
    buckets[w].push(item)
  }
  const activeWeeks = ([1, 2, 3, 4] as const).filter(w => (buckets[w] ?? []).length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {activeWeeks.map(w => {
        const wItems = buckets[w]
        const weekTotal = wItems.reduce((s, item) => s + item.amount, 0)
        return (
          <div key={w}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <SectionLabel>{WEEK_LABELS[w]}</SectionLabel>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--c-navy-950)' }}>
                {formatCurrency(weekTotal)}
              </span>
            </div>
            <TableWrap>
              <thead>
                <tr>
                  <TH>Vendor / Description</TH>
                  <TH>Category</TH>
                  <TH right>Budget Amount</TH>
                  <TH center>Due Day</TH>
                  <TH>Account</TH>
                  <TH center>Auto Pay</TH>
                  <TH>Notes</TH>
                </tr>
              </thead>
              <tbody>
                {wItems.map((item, i) => (
                  <tr key={i} style={ROW_BORDER}>
                    <TD bold>{item.vendor}</TD>
                    <TD muted>{item.category}</TD>
                    <TD right bold>{formatCurrency(item.amount)}</TD>
                    <TD center muted>{item.due_day}</TD>
                    <TD muted>{item.account}</TD>
                    <TD center>
                      <Badge variant={item.auto_pay ? 'green' : 'neutral'}>
                        {item.auto_pay ? 'Auto' : 'Manual'}
                      </Badge>
                    </TD>
                    <TD muted>{item.notes}</TD>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <TotalTD colSpan={2}>Week Subtotal</TotalTD>
                  <TotalTD right>{formatCurrency(weekTotal)}</TotalTD>
                  <TotalTD colSpan={4} />
                </tr>
              </tfoot>
            </TableWrap>
          </div>
        )
      })}
    </div>
  )
}

// ── Forecast tab ──────────────────────────────────────────────────────────────

function ForecastView({ items }: { items: ForecastItem[] }) {
  if (items.length === 0) {
    return (
      <Card padding="40px 24px" style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-navy-950)', marginBottom: 6 }}>
          No Forecast data
        </p>
        <p style={{ fontSize: 13, color: 'var(--c-slate-400)' }}>
          Re-upload the budget file to populate this tab from the Forecast sheet.
        </p>
      </Card>
    )
  }

  const totalM1Budget    = items.reduce((s, i) => s + i.m1_budget,    0)
  const totalM1Projected = items.reduce((s, i) => s + i.m1_projected, 0)
  const totalM2Budget    = items.reduce((s, i) => s + i.m2_budget,    0)
  const totalM2Projected = items.reduce((s, i) => s + i.m2_projected, 0)
  const totalM3Budget    = items.reduce((s, i) => s + i.m3_budget,    0)
  const totalM3Projected = items.reduce((s, i) => s + i.m3_projected, 0)

  const hasProjected = items.some(i => i.m1_projected > 0 || i.m2_projected > 0 || i.m3_projected > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <StatCard label="Month 1 — Budget"    value={formatCurrency(totalM1Budget)}    />
        <StatCard label="Month 2 — Budget"    value={formatCurrency(totalM2Budget)}    />
        <StatCard label="Month 3 — Budget"    value={formatCurrency(totalM3Budget)}    />
      </div>

      <TableWrap>
        <thead>
          <tr>
            <TH rowSpan={2}>#</TH>
            <TH rowSpan={2}>Vendor / Description</TH>
            <TH rowSpan={2}>Category</TH>
            <TH colSpan={hasProjected ? 2 : 1} center>Month 1 (Current)</TH>
            <TH colSpan={hasProjected ? 2 : 1} center>Month 2</TH>
            <TH colSpan={hasProjected ? 2 : 1} center>Month 3</TH>
            <TH rowSpan={2} center>Freq.</TH>
            <TH rowSpan={2}>Notes</TH>
          </tr>
          <tr>
            <TH right>Budget ($)</TH>
            {hasProjected && <TH right>Projected ($)</TH>}
            <TH right>Budget ($)</TH>
            {hasProjected && <TH right>Projected ($)</TH>}
            <TH right>Budget ($)</TH>
            {hasProjected && <TH right>Projected ($)</TH>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={ROW_BORDER}>
              <TD center muted>{i + 1}</TD>
              <TD bold>{item.vendor}</TD>
              <TD muted>{item.category}</TD>
              <TD right bold>{formatCurrency(item.m1_budget)}</TD>
              {hasProjected && <TD right muted>{item.m1_projected > 0 ? formatCurrency(item.m1_projected) : EMPTY}</TD>}
              <TD right bold>{formatCurrency(item.m2_budget)}</TD>
              {hasProjected && <TD right muted>{item.m2_projected > 0 ? formatCurrency(item.m2_projected) : EMPTY}</TD>}
              <TD right bold>{formatCurrency(item.m3_budget)}</TD>
              {hasProjected && <TD right muted>{item.m3_projected > 0 ? formatCurrency(item.m3_projected) : EMPTY}</TD>}
              <TD center muted>{item.frequency}</TD>
              <TD muted>{item.notes}</TD>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <TotalTD colSpan={3}>Monthly Total</TotalTD>
            <TotalTD right>{formatCurrency(totalM1Budget)}</TotalTD>
            {hasProjected && <TotalTD right>{totalM1Projected > 0 ? formatCurrency(totalM1Projected) : EMPTY}</TotalTD>}
            <TotalTD right>{formatCurrency(totalM2Budget)}</TotalTD>
            {hasProjected && <TotalTD right>{totalM2Projected > 0 ? formatCurrency(totalM2Projected) : EMPTY}</TotalTD>}
            <TotalTD right>{formatCurrency(totalM3Budget)}</TotalTD>
            {hasProjected && <TotalTD right>{totalM3Projected > 0 ? formatCurrency(totalM3Projected) : EMPTY}</TotalTD>}
            <TotalTD colSpan={2} />
          </tr>
        </tfoot>
      </TableWrap>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; Icon: any }[] = [
  { id: 'overview',  label: 'Dashboard',        Icon: LayoutDashboard },
  { id: 'business',  label: 'Business Budget',  Icon: Building2       },
  { id: 'personal',  label: 'Personal Budget',  Icon: User            },
  { id: 'calendar',  label: 'Payment Calendar', Icon: CalendarDays    },
  { id: 'forecast',  label: '3-Month Forecast', Icon: TrendingUp      },
]

export default function BudgetBreakdown({ lines, budget, month }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const parsed   = lines.map(parseLine)
  const bizLines = parsed.filter(l => l.bill_type === 'business')
  const perLines = parsed.filter(l => l.bill_type === 'personal')

  // Parse calendar and forecast data stored in budget.notes JSON
  let calendarItems: CalendarItem[] = []
  let forecastItems: ForecastItem[] = []
  if (budget.notes?.startsWith('{')) {
    try {
      const meta = JSON.parse(budget.notes)
      calendarItems = Array.isArray(meta.calendarItems) ? meta.calendarItems : []
      forecastItems = Array.isArray(meta.forecastItems) ? meta.forecastItems : []
    } catch {}
  }

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

      {activeTab === 'calendar' && <CalendarView items={calendarItems} />}
      {activeTab === 'forecast' && <ForecastView items={forecastItems} />}

    </div>
  )
}
