import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'
import { matchTransactionsForUser } from '@/lib/budget/matcher'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: items } = await supabase.database.from('plaid_items').select('*')
  if (!items) return NextResponse.json({ synced: 0 })

  let totalSynced = 0

  for (const item of items) {
    try {
      // Fetch the months that have uploaded budgets for this user.
      // We only store and match transactions for months with a budget.
      const { data: userBudgets } = await supabase.database
        .from('budgets').select('month').eq('user_id', item.user_id)
      const budgetMonths = new Set(
        (userBudgets ?? []).map((b: { month: string }) => b.month.slice(0, 7)) // 'YYYY-MM'
      )

      // Pull all new transactions from Plaid via cursor
      let cursor = item.cursor
      let hasMore = true
      const allAdded: {
        plaid_transaction_id: string; user_id: string; account_id: string
        amount: number; date: string; name: string
        merchant_name: string | null; category: string[]
      }[] = []

      while (hasMore) {
        const res = await plaidClient.transactionsSync({
          access_token: item.access_token,
          cursor: cursor ?? undefined,
        })
        const { added, next_cursor, has_more } = res.data

        for (const txn of added) {
          allAdded.push({
            plaid_transaction_id: txn.transaction_id,
            user_id: item.user_id,
            account_id: txn.account_id,
            amount: Math.abs(txn.amount),
            date: txn.date,
            name: txn.name,
            merchant_name: txn.merchant_name ?? null,
            category: txn.personal_finance_category ? [txn.personal_finance_category.primary] : [],
          })
        }

        cursor = next_cursor
        hasMore = has_more
      }

      // Only keep transactions that fall within a month that has an uploaded budget
      const budgetMonthTxns = allAdded.filter(t => budgetMonths.has(t.date.slice(0, 7)))

      if (budgetMonthTxns.length > 0) {
        await supabase.database.from('transactions').upsert(
          budgetMonthTxns,
          { onConflict: 'plaid_transaction_id', ignoreDuplicates: true },
        )
        totalSynced += budgetMonthTxns.length
      }

      // Always advance the cursor so Plaid doesn't re-send skipped transactions
      await supabase.database.from('plaid_items')
        .update({ cursor, last_synced_at: new Date().toISOString() })
        .eq('id', item.id)

      // Run the matcher for every distinct budget month that received new transactions
      const monthsToMatch = new Set(
        budgetMonthTxns.map(t => `${t.date.slice(0, 7)}-01`)
      )
      for (const month of monthsToMatch) {
        await matchTransactionsForUser(item.user_id, month)
      }
    } catch (err) {
      console.error('Sync error for item', item.id, err)
    }
  }

  return NextResponse.json({ synced: totalSynced })
}
