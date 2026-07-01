import { createClient } from '@/lib/supabase/server'
import type { BudgetLine } from '@/types'

// ── Plaid category → budget keyword mapping ────────────────────────────────

const EXCLUDED_PLAID_CATEGORIES = new Set([
  'TRANSFER_IN', 'TRANSFER_OUT', 'INCOME',
])

const PLAID_CATEGORY_KEYWORDS: Record<string, string[]> = {
  FOOD_AND_DRINK:            ['food', 'groceries', 'dining', 'restaurant', 'grocery', 'meals', 'coffee', 'lunch', 'dinner', 'cafe'],
  TRANSPORTATION:            ['transport', 'auto', 'car', 'gas', 'fuel', 'uber', 'lyft', 'parking', 'transit', 'commute', 'vehicle'],
  RENT_AND_UTILITIES:        ['rent', 'utilities', 'electric', 'water', 'internet', 'phone', 'cable', 'utility', 'power', 'wireless'],
  LOAN_PAYMENTS:             ['loan', 'debt', 'mortgage', 'credit card', 'student', 'payment', 'finance'],
  ENTERTAINMENT:             ['entertainment', 'streaming', 'netflix', 'spotify', 'fun', 'subscription', 'hulu', 'disney', 'gaming'],
  SHOPPING:                  ['shopping', 'clothing', 'clothes', 'amazon', 'merchandise', 'retail', 'apparel'],
  PERSONAL_CARE:             ['personal', 'care', 'salon', 'gym', 'fitness', 'health', 'beauty', 'spa', 'barber'],
  TRAVEL:                    ['travel', 'hotel', 'airline', 'vacation', 'airbnb', 'trip', 'flight'],
  GENERAL_MERCHANDISE:       ['merchandise', 'shopping', 'amazon', 'walmart', 'target', 'costco', 'wholesale'],
  HOME_IMPROVEMENT:          ['home', 'maintenance', 'repair', 'hardware', 'renovation', 'improvement'],
  MEDICAL:                   ['medical', 'health', 'doctor', 'pharmacy', 'dental', 'vision', 'insurance'],
  EDUCATION:                 ['education', 'school', 'tuition', 'books', 'course', 'training'],
  PROFESSIONAL_SERVICES:     ['services', 'professional', 'legal', 'accounting', 'consulting', 'attorney'],
  BUSINESS_SERVICES:         ['business', 'office', 'supplies', 'software', 'tools', 'saas'],
  GOVERNMENT_AND_NON_PROFIT: ['taxes', 'government', 'charity', 'donation', 'nonprofit'],
}

// ── Confidence scoring ────────────────────────────────────────────────────────

function scoreLine(
  txnName: string,
  merchantName: string | null,
  plaidCategory: string | null,
  amount: number,
  line: BudgetLine,
): number {
  let score = 0
  const primary   = (merchantName ?? txnName).toLowerCase()
  const secondary = txnName.toLowerCase()
  const linecat   = line.category.toLowerCase()
  const linedesc  = (line.description ?? '').toLowerCase()
  const allLineText = `${linecat} ${linedesc}`.trim()

  // 1. Plaid category alignment — up to 40 pts
  if (plaidCategory && PLAID_CATEGORY_KEYWORDS[plaidCategory]) {
    const keywords = PLAID_CATEGORY_KEYWORDS[plaidCategory]
    const hit = keywords.some(kw => allLineText.includes(kw) || kw.includes(linecat))
    if (hit) score += 40
  }

  // 2. Name / merchant match — up to 35 pts (uses merchant_name first, falls back to raw name)
  if (primary === linecat || primary === linedesc) {
    score += 35
  } else if (primary.includes(linecat) || linecat.includes(primary)) {
    score += 30
  } else if (linedesc.length > 2 && (primary.includes(linedesc) || linedesc.includes(primary))) {
    score += 25
  } else if (secondary.includes(linecat) || linecat.includes(secondary)) {
    score += 20
  } else {
    // Word-level overlap
    const txnWords  = primary.split(/\s+/).filter(w => w.length > 2)
    const lineWords = allLineText.split(/\s+/).filter(w => w.length > 2)
    const hits = txnWords.filter(w => lineWords.some(lw => lw.includes(w) || w.includes(lw)))
    if (hits.length > 0) score += 10
  }

  // 3. Amount proximity bonus — up to 15 pts
  if (line.estimated_amount > 0) {
    const diff = Math.abs(amount - line.estimated_amount) / line.estimated_amount
    if (diff <= 0.05)      score += 15
    else if (diff <= 0.20) score += 10
    else if (diff <= 0.50) score +=  5
  }

  return Math.min(score, 100)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMonthEnd(month: string): string {
  const d = new Date(month)
  d.setMonth(d.getMonth() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

// ── Recalculate a single budget line's actual_amount from DB ──────────────────

export async function recalculateBudgetLineActual(supabase: any, lineId: string) {
  const [{ data: line }, { data: txns }] = await Promise.all([
    supabase.database.from('budget_lines').select('estimated_amount, status').eq('id', lineId).single(),
    supabase.database.from('transactions').select('amount').eq('budget_line_id', lineId),
  ])

  const total = (txns ?? []).reduce((s: number, t: { amount: number }) => s + t.amount, 0)

  let status: string
  if (total === 0) {
    status = line?.status === 'overdue' ? 'overdue' : 'pending'
  } else if (total >= (line?.estimated_amount ?? 0)) {
    status = 'paid'
  } else {
    status = 'partial'
  }

  await supabase.database.from('budget_lines')
    .update({ actual_amount: total, status })
    .eq('id', lineId)
}

// ── Main matcher ──────────────────────────────────────────────────────────────

export async function matchTransactionsForUser(userId: string, month: string) {
  const supabase = await createClient()

  // Get budget for this month
  const { data: budget } = await supabase.database
    .from('budgets').select('id').eq('user_id', userId).eq('month', month).single()
  if (!budget) return

  const { data: budgetLines } = await supabase.database
    .from('budget_lines').select('*').eq('budget_id', budget.id)
  if (!budgetLines || budgetLines.length === 0) return

  // Load merchant rules for this user
  const { data: rules } = await supabase.database
    .from('merchant_rules').select('*').eq('user_id', userId)
  const ruleMap = new Map<string, string>()
  for (const r of rules ?? []) {
    ruleMap.set(r.merchant_pattern.toLowerCase(), r.budget_line_category.toLowerCase())
  }

  // Fetch all transactions for the month
  const monthEnd = getMonthEnd(month)
  const { data: allTxns } = await supabase.database
    .from('transactions').select('*')
    .eq('user_id', userId)
    .gte('date', month)
    .lt('date', monthEnd)
  if (!allTxns) return

  // Separate manual matches (preserve them) from everything else
  const manualMatches = allTxns.filter((t: any) => t.match_source === 'manual')
  const toProcess     = allTxns.filter((t: any) => t.match_source !== 'manual')

  // Track accumulated actuals per line (start with manual match amounts)
  const lineActuals = new Map<string, number>()
  for (const t of manualMatches) {
    if (t.budget_line_id && t.is_matched) {
      lineActuals.set(t.budget_line_id, (lineActuals.get(t.budget_line_id) ?? 0) + t.amount)
    }
  }

  // Process each non-manual transaction
  const txnUpdates: any[] = []

  for (const txn of toProcess) {
    const plaidCat = (txn.category as string[])?.[0] ?? null

    // Exclude transfers, income, and credits (negative amounts)
    if (EXCLUDED_PLAID_CATEGORIES.has(plaidCat ?? '') || txn.amount <= 0) {
      txnUpdates.push(
        supabase.database.from('transactions')
          .update({ budget_line_id: null, is_matched: false, is_untracked: true, match_confidence: 0, match_source: null })
          .eq('id', txn.id)
      )
      continue
    }

    // Check merchant rules first (confidence 100)
    const merchantKey = (txn.merchant_name ?? txn.name).toLowerCase()
    let ruleCategory: string | undefined
    for (const [pattern, cat] of ruleMap.entries()) {
      if (merchantKey === pattern || merchantKey.includes(pattern)) {
        ruleCategory = cat
        break
      }
    }

    if (ruleCategory) {
      const ruleLine = (budgetLines as BudgetLine[]).find(
        l => l.category.toLowerCase().includes(ruleCategory!) || ruleCategory!.includes(l.category.toLowerCase())
      )
      if (ruleLine) {
        lineActuals.set(ruleLine.id, (lineActuals.get(ruleLine.id) ?? 0) + txn.amount)
        txnUpdates.push(
          supabase.database.from('transactions')
            .update({ budget_line_id: ruleLine.id, is_matched: true, is_untracked: false, match_confidence: 100, match_source: 'rule' })
            .eq('id', txn.id)
        )
        continue
      }
    }

    // Score all budget lines and take the best
    const scored = (budgetLines as BudgetLine[])
      .map(line => ({ line, score: scoreLine(txn.name, txn.merchant_name, plaidCat, txn.amount, line) }))
      .sort((a, b) => b.score - a.score)

    const best = scored[0]

    if (best && best.score >= 70) {
      lineActuals.set(best.line.id, (lineActuals.get(best.line.id) ?? 0) + txn.amount)
      txnUpdates.push(
        supabase.database.from('transactions')
          .update({ budget_line_id: best.line.id, is_matched: true, is_untracked: false, match_confidence: best.score, match_source: 'auto' })
          .eq('id', txn.id)
      )
    } else if (best && best.score >= 40) {
      // Needs review — clear any previous match, flag for human/AI review
      txnUpdates.push(
        supabase.database.from('transactions')
          .update({ budget_line_id: null, is_matched: false, is_untracked: false, match_confidence: best.score, match_source: null })
          .eq('id', txn.id)
      )
    } else {
      txnUpdates.push(
        supabase.database.from('transactions')
          .update({ budget_line_id: null, is_matched: false, is_untracked: true, match_confidence: best?.score ?? 0, match_source: null })
          .eq('id', txn.id)
      )
    }
  }

  // Commit all transaction updates in parallel
  await Promise.all(txnUpdates)

  // Update each budget line's actual_amount from accumulated totals
  const lineUpdates: any[] = (budgetLines as BudgetLine[]).map(line => {
    const actual = lineActuals.get(line.id) ?? 0
    let status: string
    if (actual === 0)                          status = 'pending'
    else if (actual >= line.estimated_amount)  status = 'paid'
    else                                       status = 'partial'
    return supabase.database.from('budget_lines')
      .update({ actual_amount: actual, status })
      .eq('id', line.id)
  })
  await Promise.all(lineUpdates)

  // Mark overdue lines
  const today = new Date()
  const overdueUpdates: any[] = (budgetLines as BudgetLine[])
    .filter(line => line.status === 'pending' && line.due_day)
    .map(line => {
      const due = new Date(today.getFullYear(), today.getMonth(), line.due_day!)
      const days = Math.floor((today.getTime() - due.getTime()) / 86_400_000)
      if (days <= 0) return null
      return supabase.database.from('budget_lines').update({ status: 'overdue' }).eq('id', line.id)
    })
    .filter(Boolean)
  if (overdueUpdates.length) await Promise.all(overdueUpdates)

  // Generate alerts (deduped)
  const lineMap = new Map((budgetLines as BudgetLine[]).map(l => [l.id, l]))
  const alertOps: any[] = []

  for (const txn of allTxns) {
    if (txn.is_matched && txn.budget_line_id) {
      const line = lineMap.get(txn.budget_line_id)
      if (!line) continue
      if (txn.amount > line.estimated_amount * 1.5) {
        alertOps.push(upsertAlert(supabase, userId, txn.id, line.id, 'red', 'large_transaction',
          `${line.category} exceeds budget by 50%+`,
          `Charged ${fmt(txn.amount)} vs estimated ${fmt(line.estimated_amount)}`, txn.amount))
      } else if (txn.amount > line.estimated_amount * 1.1) {
        alertOps.push(upsertAlert(supabase, userId, txn.id, line.id, 'yellow', 'over_budget',
          `${line.category} slightly over budget`,
          `Charged ${fmt(txn.amount)} vs estimated ${fmt(line.estimated_amount)}`, txn.amount))
      }
    } else if (txn.is_untracked) {
      alertOps.push(upsertAlert(supabase, userId, txn.id, null,
        txn.amount >= 500 ? 'red' : 'yellow', 'untracked_expense',
        `Untracked expense: ${txn.name}`,
        `Amount: ${fmt(txn.amount)} on ${txn.date}`, txn.amount))
    }
  }
  if (alertOps.length) await Promise.all(alertOps)
}

async function upsertAlert(
  supabase: any, userId: string, transactionId: string | null,
  budgetLineId: string | null, severity: 'yellow' | 'red',
  type: string, title: string, description: string, amount: number,
) {
  const { data: existing } = await supabase.database.from('alerts').select('id')
    .eq('user_id', userId).eq('type', type).eq('title', title).eq('status', 'pending').maybeSingle()
  if (existing) return
  await supabase.database.from('alerts').insert([{
    user_id: userId, transaction_id: transactionId, budget_line_id: budgetLineId,
    severity, type, title, description, amount, status: 'pending',
  }])
}
