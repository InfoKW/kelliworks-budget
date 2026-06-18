import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'

// Returns recurring transaction streams (subscriptions, bills, income deposits)
// across all of the user's linked items.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: items } = await supabase.database
    .from('plaid_items')
    .select('id, access_token, institution_name')
    .eq('user_id', user.id)

  if (!items || items.length === 0) {
    return NextResponse.json({ inflow_streams: [], outflow_streams: [] })
  }

  // Fetch recurring streams from all items in parallel
  const results = await Promise.allSettled(
    items.map(async (item: { id: string; access_token: string; institution_name: string | null }) => {
      const res = await plaidClient.transactionsRecurringGet({
        access_token: item.access_token,
        account_ids: [],
        options: { include_personal_finance_category: true },
      })
      return {
        institution_name: item.institution_name,
        inflow_streams: res.data.inflow_streams,
        outflow_streams: res.data.outflow_streams,
      }
    })
  )

  const inflowStreams: unknown[] = []
  const outflowStreams: unknown[] = []

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Recurring get error:', result.reason?.response?.data || result.reason?.message)
      continue
    }
    inflowStreams.push(...result.value.inflow_streams)
    outflowStreams.push(...result.value.outflow_streams)
  }

  return NextResponse.json({ inflow_streams: inflowStreams, outflow_streams: outflowStreams })
}
