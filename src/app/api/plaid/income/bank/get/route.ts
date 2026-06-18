import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Return cached report if ready
  const { data: cached } = await supabase.database
    .from('income_reports')
    .select('*')
    .eq('user_id', user.id)
    .eq('income_type', 'bank')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (cached?.status === 'ready') {
    return NextResponse.json({ status: 'ready', report: cached.report_data })
  }
  if (cached?.status === 'error') {
    return NextResponse.json({ status: 'error', error: cached.error_message })
  }

  const { data: profile } = await supabase.database
    .from('profiles')
    .select('plaid_user_token')
    .eq('id', user.id)
    .single()

  if (!profile?.plaid_user_token) {
    return NextResponse.json({ status: 'none' })
  }

  try {
    const res = await plaidClient.creditBankIncomeGet({
      user_token: profile.plaid_user_token,
    })

    const reportData = res.data.bank_income?.[0] ?? null

    if (!reportData) {
      return NextResponse.json({ status: cached ? 'pending' : 'none' })
    }

    // Upsert report into DB
    if (cached) {
      await supabase.database
        .from('income_reports')
        .update({ status: 'ready', report_data: reportData, updated_at: new Date().toISOString() })
        .eq('id', cached.id)
    } else {
      await supabase.database.from('income_reports').insert([{
        user_id: user.id,
        income_type: 'bank',
        status: 'ready',
        report_data: reportData,
      }])
    }

    return NextResponse.json({ status: 'ready', report: reportData })
  } catch (err: any) {
    console.error('Bank income get error:', err.response?.data || err.message)
    return NextResponse.json({ status: 'error', error: err.message })
  }
}
