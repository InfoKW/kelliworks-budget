import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  plaid_item_id: z.string().uuid(),
})

// Sandbox-only: forces an Item into ITEM_LOGIN_REQUIRED state so you can test update mode.
// Plaid will fire an ITEM_LOGIN_REQUIRED webhook after this call.
export async function POST(request: Request) {
  if (process.env.PLAID_ENV !== 'sandbox') {
    return NextResponse.json({ error: 'Only available in sandbox' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = schema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { data: item } = await supabase.database
    .from('plaid_items')
    .select('access_token')
    .eq('id', body.data.plaid_item_id)
    .eq('user_id', user.id)
    .single()

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  try {
    await plaidClient.sandboxItemResetLogin({ access_token: item.access_token })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Sandbox reset login] error:', err.response?.data || err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
