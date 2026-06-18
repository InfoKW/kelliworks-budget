import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'

// Plaid sends webhooks as POST with JSON body.
// TODO: Add Plaid webhook signature verification via the `Plaid-Verification` JWT header
// before deploying to production. See: https://plaid.com/docs/api/webhooks/webhook-verification/

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { webhook_type, webhook_code, asset_report_id, user_token, error } = body

  const supabase = await createClient()

  // ── Item webhooks (login errors, consent expiry, self-healing) ───────────────
  if (webhook_type === 'ITEM') {
    const item_id: string | undefined = body.item_id

    if (item_id) {
      if (webhook_code === 'ITEM_LOGIN_REQUIRED') {
        // Credentials expired or access revoked — user must re-authenticate via update mode
        await supabase.database
          .from('plaid_items')
          .update({ item_status: 'login_required' })
          .eq('item_id', item_id)
      }

      if (webhook_code === 'PENDING_EXPIRATION') {
        // Consent expires in 7 days (UK/EU) — prompt user to re-auth soon
        await supabase.database
          .from('plaid_items')
          .update({
            item_status: 'pending_expiration',
            consent_expiration_time: body.consent_expiration_time ?? null,
          })
          .eq('item_id', item_id)
      }

      if (webhook_code === 'PENDING_DISCONNECT') {
        // Consent expires in 7 days (US/CA) — prompt user to re-auth soon
        await supabase.database
          .from('plaid_items')
          .update({
            item_status: 'pending_disconnect',
            consent_expiration_time: body.consent_expiration_time ?? null,
          })
          .eq('item_id', item_id)
      }

      if (webhook_code === 'LOGIN_REPAIRED') {
        // Another app's update mode fixed this Item (self-healing) — clear error state
        await supabase.database
          .from('plaid_items')
          .update({ item_status: 'good', consent_expiration_time: null })
          .eq('item_id', item_id)
      }

      if (webhook_code === 'ERROR') {
        await supabase.database
          .from('plaid_items')
          .update({ item_status: 'error' })
          .eq('item_id', item_id)
      }
    }
  }

  // ── Assets webhooks ──────────────────────────────────────────────────────────
  if (webhook_type === 'ASSETS' && webhook_code === 'PRODUCT_READY' && asset_report_id) {
    // Look up the pending report by asset_report_id
    const { data: report } = await supabase.database
      .from('asset_reports')
      .select('*')
      .eq('asset_report_id', asset_report_id)
      .maybeSingle()

    if (!report) {
      console.warn('[Plaid webhook] asset_report_id not found:', asset_report_id)
      return NextResponse.json({ received: true })
    }

    try {
      const res = await plaidClient.assetReportGet({
        asset_report_token: report.asset_report_token,
        include_insights: false,
      })

      await supabase.database
        .from('asset_reports')
        .update({
          status: 'ready',
          report_data: res.data.report,
          updated_at: new Date().toISOString(),
        })
        .eq('id', report.id)
    } catch (err: any) {
      console.error('[Plaid webhook] Failed to fetch report:', err.response?.data || err.message)
    }
  }

  if (webhook_type === 'ASSETS' && webhook_code === 'ERROR' && asset_report_id) {
    const errorMsg = error?.error_message ?? 'Report generation failed'
    await supabase.database
      .from('asset_reports')
      .update({ status: 'error', error_message: errorMsg, updated_at: new Date().toISOString() })
      .eq('asset_report_id', asset_report_id)
  }

  // ── Statements webhooks ──────────────────────────────────────────────────────
  // STATEMENTS_REFRESH_COMPLETE fires after /statements/refresh finishes.
  // Touch last_synced_at so the client knows to re-call GET /api/plaid/statements/list.
  if (webhook_type === 'STATEMENTS' && webhook_code === 'STATEMENTS_REFRESH_COMPLETE') {
    const item_id: string | undefined = body.item_id
    if (item_id) {
      await supabase.database
        .from('plaid_items')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('item_id', item_id)
    }
  }

  // ── Transactions webhooks ────────────────────────────────────────────────────
  // SYNC_UPDATES_AVAILABLE fires when Plaid has new/modified/removed transactions.
  // We touch last_synced_at so the cron/client knows to call sync-transactions.
  if (webhook_type === 'TRANSACTIONS' && webhook_code === 'SYNC_UPDATES_AVAILABLE') {
    const item_id: string | undefined = body.item_id
    if (item_id) {
      await supabase.database
        .from('plaid_items')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('item_id', item_id)
    }
  }

  // ── Liabilities webhooks ─────────────────────────────────────────────────────
  // Plaid refreshes liabilities ~once daily and fires DEFAULT_UPDATE when data changes.
  // We log the event so the next client GET picks up fresh data automatically.
  if (webhook_type === 'LIABILITIES') {
    const item_id: string | undefined = body.item_id
    if (item_id) {
      await supabase.database
        .from('plaid_items')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('item_id', item_id)
    }
  }

  // ── Income webhooks ──────────────────────────────────────────────────────────
  if (webhook_type === 'INCOME' && user_token) {
    // Look up user by their plaid_user_token
    const { data: profile } = await supabase.database
      .from('profiles')
      .select('id')
      .eq('plaid_user_token', user_token)
      .maybeSingle()

    if (profile) {
      if (webhook_code === 'INCOME_VERIFICATION') {
        // Mark the most recent pending income report as ready so the next GET fetches from Plaid
        await supabase.database
          .from('income_reports')
          .update({ status: 'ready', updated_at: new Date().toISOString() })
          .eq('user_id', profile.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
      }

      if (webhook_code === 'INCOME_VERIFICATION_REFRESH_RECONNECT_NEEDED') {
        await supabase.database
          .from('income_reports')
          .update({ status: 'error', error_message: 'Reconnect required', updated_at: new Date().toISOString() })
          .eq('user_id', profile.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
      }
    }
  }

  return NextResponse.json({ received: true })
}
