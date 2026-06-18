import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'

// Triggers Plaid to fetch the latest data from a user's institution on-demand.
// After calling this, listen for the SYNC_UPDATES_AVAILABLE webhook, then call
// POST /api/plaid/sync-transactions to pull the fresh data.
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
    return NextResponse.json({ refreshed: 0 })
  }

  const results = await Promise.allSettled(
    items.map((item: { id: string; access_token: string }) =>
      plaidClient.transactionsRefresh({ access_token: item.access_token })
    )
  )

  const refreshed = results.filter(r => r.status === 'fulfilled').length
  const errors = results
    .filter(r => r.status === 'rejected')
    .map(r => (r as PromiseRejectedResult).reason?.response?.data?.error_code ?? 'unknown')

  if (errors.length > 0) {
    console.error('[Transactions refresh] errors:', errors)
  }

  return NextResponse.json({ refreshed, total: items.length })
}
