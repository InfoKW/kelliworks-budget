import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get the most recent asset report for this user
  const { data: report } = await supabase.database
    .from('asset_reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!report) {
    return NextResponse.json({ status: 'none' })
  }

  // Already resolved — return cached data
  if (report.status === 'ready') {
    return NextResponse.json({ status: 'ready', report: report.report_data, asset_report_id: report.asset_report_id })
  }

  if (report.status === 'error') {
    return NextResponse.json({ status: 'error', error: report.error_message })
  }

  // Still pending — attempt to fetch from Plaid
  try {
    const res = await plaidClient.assetReportGet({
      asset_report_token: report.asset_report_token,
      include_insights: false,
    })

    const reportData = res.data.report

    // Cache the result
    await supabase.database
      .from('asset_reports')
      .update({ status: 'ready', report_data: reportData, updated_at: new Date().toISOString() })
      .eq('id', report.id)

    return NextResponse.json({ status: 'ready', report: reportData, asset_report_id: report.asset_report_id })
  } catch (err: any) {
    const code = err.response?.data?.error_code
    if (code === 'PRODUCT_NOT_READY') {
      return NextResponse.json({ status: 'pending' })
    }

    console.error('Asset report get error:', err.response?.data || err.message)
    return NextResponse.json({ status: 'error', error: err.message })
  }
}
