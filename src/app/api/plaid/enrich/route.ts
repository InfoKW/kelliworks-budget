import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'
import { EnrichTransactionDirection } from 'plaid'
import { z } from 'zod'

const BATCH_SIZE = 100

const schema = z.object({
  // Optional: specific transaction UUIDs to enrich. If omitted, enriches all un-enriched transactions.
  transaction_ids: z.array(z.string().uuid()).max(500).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = schema.safeParse(await request.json().catch(() => ({})))
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // Fetch transactions to enrich
  let query = supabase.database
    .from('transactions')
    .select('id, plaid_transaction_id, name, amount, account_id, pending, removed_at')
    .eq('user_id', user.id)
    .is('removed_at', null)
    .is('enriched_at', null) // skip already-enriched unless specific IDs given

  if (body.data.transaction_ids?.length) {
    query = supabase.database
      .from('transactions')
      .select('id, plaid_transaction_id, name, amount, account_id, pending, removed_at')
      .eq('user_id', user.id)
      .in('id', body.data.transaction_ids)
  }

  const { data: txns } = await query.limit(500)

  if (!txns || txns.length === 0) {
    return NextResponse.json({ enriched: 0 })
  }

  // Resolve account_type per account_id from the most recent balance snapshot
  const accountIds = [...new Set(txns.map((t: { account_id: string }) => t.account_id))]
  const { data: balanceRows } = await supabase.database
    .from('account_balances')
    .select('account_id, account_type')
    .eq('user_id', user.id)
    .in('account_id', accountIds)

  const accountTypeMap = new Map<string, string>()
  for (const row of (balanceRows ?? [])) {
    if (!accountTypeMap.has(row.account_id)) {
      accountTypeMap.set(row.account_id, row.account_type)
    }
  }

  // Batch into chunks of 100
  let totalEnriched = 0
  const chunks: typeof txns[] = []
  for (let i = 0; i < txns.length; i += BATCH_SIZE) {
    chunks.push(txns.slice(i, i + BATCH_SIZE))
  }

  for (const chunk of chunks) {
    // Group by account_type since Enrich requires one account_type per request
    const byAccountType = new Map<string, typeof chunk>()
    for (const txn of chunk) {
      const acctType = accountTypeMap.get(txn.account_id) === 'credit' ? 'credit' : 'depository'
      const existing = byAccountType.get(acctType) ?? []
      existing.push(txn)
      byAccountType.set(acctType, existing)
    }

    for (const [accountType, group] of byAccountType) {
      try {
        const res = await plaidClient.transactionsEnrich({
          account_type: accountType as 'depository' | 'credit',
          transactions: group.map((txn: { id: string; name: string; amount: number; pending: boolean }) => ({
            id: txn.id,
            description: txn.name,
            amount: Math.abs(txn.amount),
            direction: txn.amount >= 0 ? EnrichTransactionDirection.Outflow : EnrichTransactionDirection.Inflow,
            iso_currency_code: 'USD',
          })),
        })

        const enrichedTxns = res.data.enriched_transactions
        const now = new Date().toISOString()

        // Update each transaction with its enrichment results
        for (const enriched of enrichedTxns) {
          const e = enriched.enrichments
          await supabase.database
            .from('transactions')
            .update({
              enriched_merchant_name: e.merchant_name ?? null,
              enriched_logo_url: e.logo_url ?? null,
              enriched_website: e.website ?? null,
              enriched_phone_number: e.phone_number ?? null,
              enriched_payment_channel: e.payment_channel ?? null,
              enriched_location: e.location ?? null,
              enriched_counterparties: e.counterparties ?? null,
              enriched_personal_finance_category: e.personal_finance_category ?? null,
              enriched_at: now,
            })
            .eq('id', enriched.id)

          totalEnriched++
        }
      } catch (err: any) {
        console.error('[Enrich] batch error:', err.response?.data || err.message)
      }
    }
  }

  return NextResponse.json({ enriched: totalEnriched })
}
