import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'

// Enables Signal data collection on all of the user's linked Items.
// Call this once after a user connects a bank, or for existing Items that
// were linked before Signal was added to additional_consented_products.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: items } = await supabase.database
    .from('plaid_items')
    .select('id, access_token')
    .eq('user_id', user.id)

  if (!items || items.length === 0) {
    return NextResponse.json({ prepared: 0 })
  }

  const results = await Promise.allSettled(
    items.map((item: { id: string; access_token: string }) =>
      plaidClient.signalPrepare({ access_token: item.access_token })
    )
  )

  const prepared = results.filter(r => r.status === 'fulfilled').length
  const errors = results
    .filter(r => r.status === 'rejected')
    .map(r => (r as PromiseRejectedResult).reason?.response?.data?.error_code ?? 'unknown')

  if (errors.length > 0) {
    console.error('[Signal prepare] errors:', errors)
  }

  return NextResponse.json({ prepared, total: items.length })
}
