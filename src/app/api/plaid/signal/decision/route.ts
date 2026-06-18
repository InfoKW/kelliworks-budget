import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'
import { SignalPaymentMethod } from 'plaid'
import { z } from 'zod'

const schema = z.object({
  client_transaction_id: z.string().max(36),
  initiated: z.boolean(),
  days_funds_on_hold: z.number().int().min(0).optional(),
  payment_decision: z.enum(['APPROVE', 'REVIEW', 'REJECT', 'TAKE_OTHER_RISK_MEASURES', 'NOT_EVALUATED']).optional(),
  payment_method: z.enum(['SAME_DAY_ACH', 'NEXT_DAY_ACH', 'STANDARD_ACH', 'MULTIPLE_PAYMENT_METHODS']).optional(),
  amount_instantly_available: z.number().optional(),
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

  const { client_transaction_id, initiated, days_funds_on_hold, payment_decision, payment_method, amount_instantly_available } = body.data

  // Verify the evaluation belongs to this user
  const { data: evaluation } = await supabase.database
    .from('signal_evaluations')
    .select('id')
    .eq('user_id', user.id)
    .eq('client_transaction_id', client_transaction_id)
    .single()

  if (!evaluation) {
    return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
  }

  try {
    await plaidClient.signalDecisionReport({
      client_transaction_id,
      initiated,
      ...(days_funds_on_hold !== undefined ? { days_funds_on_hold } : {}),
      ...(payment_decision ? { payment_decision } : {}),
      ...(payment_method ? { payment_method: payment_method as SignalPaymentMethod } : {}),
      ...(amount_instantly_available !== undefined ? { amount_instantly_available } : {}),
    })

    // Update the evaluation log with the decision
    await supabase.database
      .from('signal_evaluations')
      .update({
        initiated,
        payment_decision: payment_decision ?? null,
        decided_at: new Date().toISOString(),
      })
      .eq('id', evaluation.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Signal decision report error:', err.response?.data || err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
