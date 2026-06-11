import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: Request) {
  const insforge = await createClient()
  const { data: { user } } = await insforge.auth.getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { item_id } = await request.json()
  if (!item_id) {
    return NextResponse.json({ error: 'Missing item_id' }, { status: 400 })
  }

  // Fetch the item to verify ownership and get access_token
  const { data: item } = await insforge.database
    .from('plaid_items')
    .select('id, access_token')
    .eq('item_id', item_id)
    .eq('user_id', user.id)
    .single()

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  // Remove from Plaid
  try {
    await plaidClient.itemRemove({ access_token: item.access_token })
  } catch {
    // Continue with local removal even if Plaid call fails
  }

  // Remove from database
  await insforge.database.from('plaid_items').delete().eq('id', item.id)

  return NextResponse.json({ success: true })
}
