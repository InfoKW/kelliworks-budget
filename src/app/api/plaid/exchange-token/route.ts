import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  public_token: z.string(),
  institution_name: z.string().nullable().optional(),
  institution_id: z.string().nullable().optional(),
  link_session_id: z.string().optional(),
  account_type: z.enum(['personal', 'business']).optional(),
})

export async function POST(request: Request) {
  const insforge = await createClient()
  const { data: { user } } = await insforge.auth.getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = schema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token: body.data.public_token })
  const { access_token, item_id, request_id } = exchangeRes.data
  console.log('[Plaid] exchange-token request_id:', request_id, '| item_id:', item_id, '| link_session_id:', body.data.link_session_id ?? 'n/a')

  // Duplicate Item detection — Plaid guarantees the same credentials always
  // produce the same item_id, so an existing row means this bank is already linked.
  const { data: existing } = await insforge.database
    .from('plaid_items')
    .select('id')
    .eq('user_id', user.id)
    .eq('item_id', item_id)
    .maybeSingle()

  if (existing) {
    // Already linked — no duplicate insert. Return success so the UI doesn't error.
    return NextResponse.json({ success: true, duplicate: true })
  }

  await insforge.database.from('plaid_items').insert([{
    user_id: user.id,
    access_token,
    item_id,
    institution_name: body.data.institution_name ?? null,
    institution_id: body.data.institution_id ?? null,
    account_type: body.data.account_type ?? 'personal',
  }])

  return NextResponse.json({ success: true, duplicate: false })
}
