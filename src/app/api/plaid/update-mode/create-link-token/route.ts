import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'
import { CountryCode } from 'plaid'
import { z } from 'zod'

const schema = z.object({
  // Our internal plaid_items.id — resolves to access_token server-side
  plaid_item_id: z.string().uuid(),
  // Optional: enable account selection so user can add/remove accounts
  account_selection_enabled: z.boolean().default(false),
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

  // Resolve access_token — enforce ownership
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
    const res = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'KelliWorks Client Portal',
      country_codes: [CountryCode.Us],
      language: 'en',
      // Passing access_token puts Link into update mode for this specific Item.
      // The user's access_token does NOT change after update mode — no token re-exchange needed.
      access_token: item.access_token,
      redirect_uri: process.env.PLAID_REDIRECT_URI,
      ...(body.data.account_selection_enabled
        ? { update: { account_selection_enabled: true } }
        : {}),
    })

    return NextResponse.json({ link_token: res.data.link_token })
  } catch (err: any) {
    console.error('[Update mode] link token error:', err.response?.data || err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
