import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  public_token: z.string(),
  institution_name: z.string().nullable().optional(),
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

  const { data: { access_token, item_id } } = await plaidClient.itemPublicTokenExchange({
    public_token: body.data.public_token,
  })

  await insforge.database.from('plaid_items').insert([{
    user_id: user.id,
    access_token,
    item_id,
    institution_name: body.data.institution_name ?? null,
  }])

  return NextResponse.json({ success: true })
}
