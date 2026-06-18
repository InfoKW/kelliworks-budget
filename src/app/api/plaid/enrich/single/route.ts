import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'
import { EnrichTransactionDirection } from 'plaid'
import { z } from 'zod'

const txnSchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.number(),
  direction: z.enum(['INFLOW', 'OUTFLOW']),
  iso_currency_code: z.string().default('USD'),
  date_posted: z.string().optional(),
  mcc: z.string().optional(),
})

const schema = z.object({
  account_type: z.enum(['depository', 'credit']).default('depository'),
  transactions: z.array(txnSchema).min(1).max(100),
})

// Enriches arbitrary raw transactions without requiring them to be in the DB.
// Useful for previewing enrichment before a full bank sync.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = schema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  try {
    const res = await plaidClient.transactionsEnrich({
      account_type: body.data.account_type,
      transactions: body.data.transactions.map(t => ({
        id: t.id,
        description: t.description,
        amount: Math.abs(t.amount),
        direction: t.direction as EnrichTransactionDirection,
        iso_currency_code: t.iso_currency_code,
        ...(t.date_posted ? { date_posted: t.date_posted } : {}),
        ...(t.mcc ? { mcc: t.mcc } : {}),
      })),
    })

    return NextResponse.json({ transactions: res.data.enriched_transactions })
  } catch (err: any) {
    console.error('[Enrich single] error:', err.response?.data || err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
