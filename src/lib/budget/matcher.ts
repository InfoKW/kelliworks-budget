import { createClient } from '@/lib/supabase/server'
import type { Transaction, BudgetLine } from '@/types'

function fuzzyMatch(transactionName: string, budgetCategory: string, budgetDescription: string | null): boolean {
  const txn = transactionName.toLowerCase()
  const cat = budgetCategory.toLowerCase()
  const desc = (budgetDescription ?? '').toLowerCase()
  return txn.includes(cat) || cat.includes(txn) || (desc.length > 2 && txn.includes(desc))
}

function withinAmountTolerance(actual: number, estimated: number, tolerancePct = 0.05): boolean {
  return Math.abs(actual - estimated) / estimated <= tolerancePct
}

export async function matchTransactionsForUser(userId: string, month: string) {
  const supabase = await createClient()

  // Get budget lines for this month
  const { data: budget } = await supabase
    .database.from('budgets')
    .select('id')
    .eq('user_id', userId)
    .eq('month', month)
    .single()

  if (!budget) return

  const { data: budgetLines } = await supabase
    .database.from('budget_lines')
    .select('*')
    .eq('budget_id', budget.id)

  if (!budgetLines || budgetLines.length === 0) return

  // Get unmatched transactions for this month
  const monthStart = month
  const d = new Date(month)
  d.setMonth(d.getMonth() + 1)
  const monthEnd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`

  const { data: transactions } = await supabase
    .database.from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', monthStart)
    .lt('date', monthEnd)

  if (!transactions) return

  const today = new Date()

  for (const txn of transactions) {
    let bestMatch: BudgetLine | null = null

    for (const line of budgetLines as BudgetLine[]) {
      const nameMatch = fuzzyMatch(txn.name, line.category, line.description)
      const amountMatch = withinAmountTolerance(txn.amount, line.estimated_amount)
      if (nameMatch && amountMatch) {
        bestMatch = line
        break
      }
    }

    if (bestMatch) {
      const status = txn.amount >= bestMatch.estimated_amount ? 'paid' : 'partial'
      await supabase
        .database.from('transactions')
        .update({ budget_line_id: bestMatch.id, is_matched: true, is_untracked: false })
        .eq('id', txn.id)

      await supabase
        .database.from('budget_lines')
        .update({ actual_amount: txn.amount, status, paid_date: txn.date })
        .eq('id', bestMatch.id)

      // Alert: over budget > 150%
      if (txn.amount > bestMatch.estimated_amount * 1.5) {
        await createAlert(supabase, userId, txn.id, bestMatch.id, 'red', 'large_transaction',
          `${bestMatch.category} exceeds budget by 50%+`,
          `Charged ${formatCurrency(txn.amount)} vs estimated ${formatCurrency(bestMatch.estimated_amount)}`,
          txn.amount)
      } else if (txn.amount > bestMatch.estimated_amount * 1.1) {
        await createAlert(supabase, userId, txn.id, bestMatch.id, 'yellow', 'over_budget',
          `${bestMatch.category} slightly over budget`,
          `Charged ${formatCurrency(txn.amount)} vs estimated ${formatCurrency(bestMatch.estimated_amount)}`,
          txn.amount)
      }
    } else {
      await supabase
        .database.from('transactions')
        .update({ is_untracked: true, is_matched: false })
        .eq('id', txn.id)

      const severity = txn.amount >= 500 ? 'red' : 'yellow'
      await createAlert(supabase, userId, txn.id, null, severity, 'untracked_expense',
        `Untracked expense: ${txn.name}`,
        `Amount: ${formatCurrency(txn.amount)} on ${txn.date}`,
        txn.amount)
    }
  }

  // Check overdue lines
  for (const line of budgetLines as BudgetLine[]) {
    if (line.status === 'pending' && line.due_day) {
      const dueDate = new Date(today.getFullYear(), today.getMonth(), line.due_day)
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysOverdue > 0) {
        await supabase
          .database.from('budget_lines')
          .update({ status: 'overdue' })
          .eq('id', line.id)

        const severity = daysOverdue > 3 ? 'red' : 'yellow'
        await createAlert(supabase, userId, null, line.id, severity, 'missed_payment',
          `${line.category} payment overdue`,
          `${daysOverdue} day(s) past due date`,
          line.estimated_amount)
      }
    }
  }
}

async function createAlert(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  transactionId: string | null,
  budgetLineId: string | null,
  severity: 'yellow' | 'red',
  type: string,
  title: string,
  description: string,
  amount: number
) {
  // Avoid duplicate alerts
  const { data: existing } = await supabase
    .database.from('alerts')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('title', title)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return

  await supabase.database.from('alerts').insert([{
    user_id: userId,
    transaction_id: transactionId,
    budget_line_id: budgetLineId,
    severity,
    type,
    title,
    description,
    amount,
    status: 'pending',
  }])
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}
