import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'
import { matchTransactionsForUser } from '@/lib/budget/matcher'

type TxnRow = {
  plaid_transaction_id: string
  user_id: string
  account_id: string
  amount: number
  date: string
  name: string
  merchant_name: string | null
  category: string[]
  personal_finance_category_detailed: string | null
  pending: boolean
  bill_type: 'personal' | 'business'
}

function toTxnRow(txn: any, userId: string, accountType: 'personal' | 'business'): TxnRow {
  return {
    plaid_transaction_id: txn.transaction_id,
    user_id: userId,
    account_id: txn.account_id,
    amount: Math.abs(txn.amount),
    date: txn.date,
    name: txn.name,
    merchant_name: txn.merchant_name ?? null,
    category: txn.personal_finance_category
      ? [txn.personal_finance_category.primary]
      : (txn.category ?? []),
    personal_finance_category_detailed: txn.personal_finance_category?.detailed ?? null,
    pending: txn.pending ?? false,
    bill_type: accountType,
  }
}

export async function POST() {
  const supabase = await createClient()

  const { data: items } = await supabase.database.from('plaid_items').select('*')
  if (!items) return NextResponse.json({ synced: 0 })

  let totalSynced = 0

  for (const item of items) {
    // Preserve the cursor at the start of this item's pagination loop.
    // If Plaid returns TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION we revert to it.
    const savedCursor = item.cursor

    try {
      // Fetch budget months so we can run the matcher only where a budget exists.
      // Transactions are stored regardless of whether a budget exists.
      const { data: userBudgets } = await supabase.database
        .from('budgets').select('month').eq('user_id', item.user_id)
      const budgetMonths = new Set(
        (userBudgets ?? []).map((b: { month: string }) => b.month.slice(0, 7))
      )

      let cursor: string | null = item.cursor
      let hasMore = true
      const allAdded: TxnRow[] = []
      const allModified: TxnRow[] = []
      const removedIds: string[] = []

      while (hasMore) {
        let res: Awaited<ReturnType<typeof plaidClient.transactionsSync>>
        try {
          res = await plaidClient.transactionsSync({
            access_token: item.access_token,
            cursor: cursor ?? undefined,
            options: { include_personal_finance_category: true },
          })
        } catch (syncErr: any) {
          const code = syncErr?.response?.data?.error_code
          if (code === 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION') {
            // Plaid mutated the dataset mid-page — restart from the saved cursor
            cursor = savedCursor
            hasMore = true
            allAdded.length = 0
            allModified.length = 0
            removedIds.length = 0
            continue
          }
          throw syncErr
        }

        const { added, modified, removed, next_cursor, has_more } = res.data

        const accountType: 'personal' | 'business' = item.account_type === 'business' ? 'business' : 'personal'
        for (const txn of added)     allAdded.push(toTxnRow(txn, item.user_id, accountType))
        for (const txn of modified)  allModified.push(toTxnRow(txn, item.user_id, accountType))
        for (const txn of removed)   removedIds.push(txn.transaction_id)

        cursor = next_cursor
        hasMore = has_more
      }

      // ── Added ────────────────────────────────────────────────────────────────
      if (allAdded.length > 0) {
        await supabase.database.from('transactions').upsert(
          allAdded,
          { onConflict: 'plaid_transaction_id', ignoreDuplicates: true },
        )
        totalSynced += allAdded.length
      }

      // ── Modified ─────────────────────────────────────────────────────────────
      for (const txn of allModified) {
        await supabase.database.from('transactions')
          .update({
            amount: txn.amount,
            date: txn.date,
            name: txn.name,
            merchant_name: txn.merchant_name,
            category: txn.category,
            personal_finance_category_detailed: txn.personal_finance_category_detailed,
            pending: txn.pending,
          })
          .eq('plaid_transaction_id', txn.plaid_transaction_id)
      }

      // ── Removed ──────────────────────────────────────────────────────────────
      if (removedIds.length > 0) {
        await supabase.database.from('transactions')
          .update({ removed_at: new Date().toISOString() })
          .in('plaid_transaction_id', removedIds)
      }

      // Advance cursor
      await supabase.database.from('plaid_items')
        .update({ cursor, last_synced_at: new Date().toISOString() })
        .eq('id', item.id)

      // Re-run matcher only for months that have a budget
      const monthsToMatch = new Set([
        ...allAdded.filter(t => budgetMonths.has(t.date.slice(0, 7))).map(t => `${t.date.slice(0, 7)}-01`),
        ...allModified.filter(t => budgetMonths.has(t.date.slice(0, 7))).map(t => `${t.date.slice(0, 7)}-01`),
      ])
      for (const month of monthsToMatch) {
        await matchTransactionsForUser(item.user_id, month)
      }
    } catch (err) {
      console.error('Sync error for item', item.id, err)
    }
  }

  return NextResponse.json({ synced: totalSynced })
}
