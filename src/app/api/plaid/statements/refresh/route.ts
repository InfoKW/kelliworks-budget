import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'

// Triggers Plaid to fetch the latest statements from the institution.
// Listen for STATEMENTS_REFRESH_COMPLETE webhook, then re-call GET /api/plaid/statements/list.
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

  // Default to last 24 months
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(startDate.getFullYear() - 2)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const results = await Promise.allSettled(
    items.map((item: { id: string; access_token: string }) =>
      plaidClient.statementsRefresh({
        access_token: item.access_token,
        start_date: fmt(startDate),
        end_date: fmt(endDate),
      })
    )
  )

  const refreshed = results.filter(r => r.status === 'fulfilled').length
  const errors = results
    .filter(r => r.status === 'rejected')
    .map(r => (r as PromiseRejectedResult).reason?.response?.data?.error_code ?? 'unknown')

  if (errors.length > 0) {
    console.error('[Statements refresh] errors:', errors)
  }

  return NextResponse.json({ refreshed, total: items.length })
}
