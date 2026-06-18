import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  client_transaction_id: z.string().max(36),
  return_code: z.string(), // standard ACH return code e.g. "R01"
  return_received_at: z.string().datetime().optional(), // ISO 8601
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

  const { client_transaction_id, return_code, return_received_at } = body.data

  // Verify ownership
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
    await plaidClient.signalReturnReport({
      client_transaction_id,
      return_code,
      ...(return_received_at ? { return_received_at } : {}),
    })

    // Record the return in the evaluation log
    await supabase.database
      .from('signal_evaluations')
      .update({
        return_code,
        returned_at: return_received_at ?? new Date().toISOString(),
      })
      .eq('id', evaluation.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Signal return report error:', err.response?.data || err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
