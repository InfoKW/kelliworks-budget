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
    return NextResponse.json({ items: [] })
  }

  const results = await Promise.allSettled(
    items.map(async (item: { id: string; access_token: string; institution_name: string | null }) => {
      const res = await plaidClient.statementsList({ access_token: item.access_token })
      return {
        plaid_item_id: item.id,
        institution_name: item.institution_name,
        institution_id: res.data.institution_id,
        item_id: res.data.item_id,
        accounts: res.data.accounts,
      }
    })
  )

  const now = new Date().toISOString()
  const allItems: unknown[] = []
  const snapshotRows: {
    user_id: string
    plaid_item_id: string
    institution_name: string | null
    statement_id: string
    account_id: string
    account_name: string
    account_type: string
    month: number
    year: number
    fetched_at: string
  }[] = []

  for (const result of results) {
    if (result.status === 'rejected') {
      const code = result.reason?.response?.data?.error_code
      if (code !== 'PRODUCTS_NOT_SUPPORTED') {
        console.error('[Statements list] error:', result.reason?.response?.data || result.reason?.message)
      }
      continue
    }

    const { plaid_item_id, institution_name, accounts, ...rest } = result.value
    allItems.push({ plaid_item_id, institution_name, accounts, ...rest })

    for (const acct of accounts) {
      for (const stmt of acct.statements) {
        snapshotRows.push({
          user_id: user.id,
          plaid_item_id,
          institution_name,
          statement_id: stmt.statement_id,
          account_id: acct.account_id,
          account_name: acct.account_name,
          account_type: acct.account_type,
          month: stmt.month,
          year: stmt.year,
          fetched_at: now,
        })
      }
    }
  }

  // Upsert statement metadata so we can look up access_token later during download
  if (snapshotRows.length > 0) {
    await supabase.database
      .from('statement_metadata')
      .upsert(snapshotRows, { onConflict: 'statement_id', ignoreDuplicates: true })
  }

  return NextResponse.json({ items: allItems })
}
