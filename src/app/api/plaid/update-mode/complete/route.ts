import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  plaid_item_id: z.string().uuid(),
})

// Called after a successful update mode Link session.
// No token re-exchange needed — access_token is unchanged.
// Just clears the error state in the DB.
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

  const { error } = await supabase.database
    .from('plaid_items')
    .update({
      item_status: 'good',
      consent_expiration_time: null,
      last_synced_at: new Date().toISOString(),
    })
    .eq('id', body.data.plaid_item_id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
