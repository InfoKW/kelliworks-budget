import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'

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
    return NextResponse.json({ accounts: [] })
  }

  // Fetch balances from all linked items in parallel
  const results = await Promise.allSettled(
    items.map(async (item: { id: string; access_token: string; institution_name: string | null }) => {
      const res = await plaidClient.accountsBalanceGet({
        access_token: item.access_token,
      })
      return { item, accounts: res.data.accounts }
    })
  )

  const now = new Date().toISOString()
  const allAccounts: {
    plaid_item_id: string
    institution_name: string | null
    account_id: string
    account_name: string
    official_name: string | null
    type: string
    subtype: string | null
    mask: string | null
    available: number | null
    current_balance: number | null
    credit_limit: number | null
    iso_currency_code: string | null
  }[] = []

  const snapshots: {
    user_id: string
    plaid_item_id: string
    account_id: string
    account_name: string
    account_type: string
    account_subtype: string | null
    account_mask: string | null
    available: number | null
    current_balance: number | null
    credit_limit: number | null
    iso_currency_code: string | null
    fetched_at: string
  }[] = []

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Balance fetch error:', result.reason?.response?.data || result.reason?.message)
      continue
    }

    const { item, accounts } = result.value
    for (const acct of accounts) {
      const row = {
        plaid_item_id: item.id,
        institution_name: item.institution_name,
        account_id: acct.account_id,
        account_name: acct.name,
        official_name: acct.official_name ?? null,
        type: acct.type,
        subtype: acct.subtype ?? null,
        mask: acct.mask ?? null,
        available: acct.balances.available ?? null,
        current_balance: acct.balances.current ?? null,
        credit_limit: acct.balances.limit ?? null,
        iso_currency_code: acct.balances.iso_currency_code ?? null,
      }
      allAccounts.push(row)
      snapshots.push({
        user_id: user.id,
        plaid_item_id: item.id,
        account_id: acct.account_id,
        account_name: acct.name,
        account_type: acct.type,
        account_subtype: acct.subtype ?? null,
        account_mask: acct.mask ?? null,
        available: acct.balances.available ?? null,
        current_balance: acct.balances.current ?? null,
        credit_limit: acct.balances.limit ?? null,
        iso_currency_code: acct.balances.iso_currency_code ?? null,
        fetched_at: now,
      })
    }
  }

  // Snapshot balances for historical tracking
  if (snapshots.length > 0) {
    await supabase.database.from('account_balances').insert(snapshots)
  }

  return NextResponse.json({ accounts: allAccounts, fetched_at: now })
}
