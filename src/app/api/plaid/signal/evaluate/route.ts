import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  // Our internal plaid_items.id — used to resolve the access_token server-side
  plaid_item_id: z.string().uuid(),
  account_id: z.string(),
  client_transaction_id: z.string().max(36),
  amount: z.number().positive(),
  ruleset_key: z.string().optional(),
  is_recurring: z.boolean().optional(),
  user: z.object({
    name: z.object({ prefix: z.string().optional(), given_name: z.string().optional(), family_name: z.string().optional() }).optional(),
    phone_number: z.string().optional(),
    email_address: z.string().optional(),
  }).optional(),
  device: z.object({
    ip_address: z.string().optional(),
    user_agent: z.string().optional(),
  }).optional(),
})

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

  const { plaid_item_id, account_id, client_transaction_id, amount, ruleset_key, is_recurring, user: userInfo, device } = body.data

  // Resolve access_token — enforce ownership
  const { data: item } = await supabase.database
    .from('plaid_items')
    .select('access_token')
    .eq('id', plaid_item_id)
    .eq('user_id', user.id)
    .single()

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  try {
    const res = await plaidClient.signalEvaluate({
      access_token: item.access_token,
      account_id,
      client_transaction_id,
      amount,
      ...(ruleset_key ? { ruleset_key } : {}),
      ...(is_recurring !== undefined ? { is_recurring } : {}),
      ...(userInfo ? { user: userInfo } : {}),
      ...(device ? { device } : {}),
    })

    const { scores, core_attributes, ruleset: rulesetResult, warnings } = res.data

    // Log the evaluation for auditing and model feedback
    await supabase.database.from('signal_evaluations').insert([{
      user_id: user.id,
      plaid_item_id,
      account_id,
      client_transaction_id,
      amount,
      customer_return_risk_score: scores?.customer_initiated_return_risk?.score ?? null,
      customer_return_risk_tier: scores?.customer_initiated_return_risk?.risk_tier ?? null,
      bank_return_risk_score: scores?.bank_initiated_return_risk?.score ?? null,
      bank_return_risk_tier: scores?.bank_initiated_return_risk?.risk_tier ?? null,
      ruleset_result: rulesetResult?.result ?? null,
      core_attributes: core_attributes ?? null,
    }])

    return NextResponse.json({
      scores,
      ruleset: rulesetResult,
      warnings: warnings ?? [],
    })
  } catch (err: any) {
    console.error('Signal evaluate error:', err.response?.data || err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
