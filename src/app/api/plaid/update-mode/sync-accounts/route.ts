import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const accountSchema = z.object({
  id: z.string(),           // Plaid account_id
  name: z.string(),
  mask: z.string().nullable().optional(),
  type: z.string(),
  subtype: z.string().nullable().optional(),
})

const schema = z.object({
  plaid_item_id: z.string().uuid(),
  // The full accounts array from PlaidLink onSuccess metadata.accounts
  accounts: z.array(accountSchema),
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

  const { plaid_item_id, accounts: newAccounts } = body.data

  // Verify ownership
  const { data: item } = await supabase.database
    .from('plaid_items')
    .select('id, access_token')
    .eq('id', plaid_item_id)
    .eq('user_id', user.id)
    .single()

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  // Fetch previously authorized accounts for this item
  const { data: prevAccounts } = await supabase.database
    .from('plaid_accounts')
    .select('account_id, name')
    .eq('plaid_item_id', plaid_item_id)
    .is('removed_at', null)

  const prevIds = new Set((prevAccounts ?? []).map((a: { account_id: string }) => a.account_id))
  const newIds  = new Set(newAccounts.map(a => a.id))

  const added   = newAccounts.filter(a => !prevIds.has(a.id))
  const removed = (prevAccounts ?? []).filter((a: { account_id: string }) => !newIds.has(a.account_id))

  const now = new Date().toISOString()

  // Insert newly authorized accounts
  if (added.length > 0) {
    await supabase.database.from('plaid_accounts').insert(
      added.map(a => ({
        user_id: user.id,
        plaid_item_id,
        account_id: a.id,
        name: a.name,
        mask: a.mask ?? null,
        type: a.type,
        subtype: a.subtype ?? null,
        authorized_at: now,
      }))
    )
  }

  // Soft-remove de-selected accounts — mark their transactions as untracked so they
  // don't affect budget matching, but preserve history for audit purposes.
  // Exception: Chase accounts cannot be removed via update mode (user must use Chase Security Center).
  if (removed.length > 0) {
    const removedIds = removed.map((a: { account_id: string }) => a.account_id)

    await supabase.database
      .from('plaid_accounts')
      .update({ removed_at: now })
      .in('account_id', removedIds)
      .eq('plaid_item_id', plaid_item_id)

    // Un-match transactions from removed accounts so they don't skew budget actuals
    await supabase.database
      .from('transactions')
      .update({ is_matched: false, budget_line_id: null, is_untracked: true })
      .in('account_id', removedIds)
      .eq('user_id', user.id)
  }

  // Upsert all current accounts so the table stays in sync
  if (newAccounts.length > 0) {
    await supabase.database.from('plaid_accounts').upsert(
      newAccounts.map(a => ({
        user_id: user.id,
        plaid_item_id,
        account_id: a.id,
        name: a.name,
        mask: a.mask ?? null,
        type: a.type,
        subtype: a.subtype ?? null,
        removed_at: null, // re-authorize if previously removed
      })),
      { onConflict: 'plaid_item_id,account_id' }
    )
  }

  // Trigger a transactions refresh so newly added accounts are picked up immediately.
  // Per Plaid docs, recurring calculations won't run until the next periodic update
  // or a manual refresh — so we always refresh after account selection.
  try {
    await plaidClient.transactionsRefresh({ access_token: item.access_token })
  } catch (err: any) {
    // Non-fatal — sync will happen on next webhook
    console.warn('[sync-accounts] refresh error:', err.response?.data?.error_code)
  }

  // Clear error state
  await supabase.database
    .from('plaid_items')
    .update({ item_status: 'good', consent_expiration_time: null })
    .eq('id', plaid_item_id)

  return NextResponse.json({
    added: added.map(a => ({ account_id: a.id, name: a.name })),
    removed: removed.map((a: { account_id: string; name: string }) => ({ account_id: a.account_id, name: a.name })),
  })
}
