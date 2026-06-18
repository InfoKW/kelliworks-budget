import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'

// Retrieves payroll income data — covers both digital payroll and document income (pay stubs, W-2s, 1099s).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check for any cached payroll/document report
  const { data: cached } = await supabase.database
    .from('income_reports')
    .select('*')
    .eq('user_id', user.id)
    .in('income_type', ['payroll', 'document'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (cached?.status === 'ready') {
    return NextResponse.json({ status: 'ready', report: cached.report_data, employment: cached.employment_data })
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
    const [payrollRes, employmentRes] = await Promise.all([
      plaidClient.creditPayrollIncomeGet({ user_token: profile.plaid_user_token }),
      plaidClient.creditEmploymentGet({ user_token: profile.plaid_user_token }),
    ])

    const reportData = payrollRes.data
    const employmentData = employmentRes.data

    const incomeType = cached?.income_type ?? 'payroll'

    if (cached) {
      await supabase.database
        .from('income_reports')
        .update({
          status: 'ready',
          report_data: reportData,
          employment_data: employmentData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cached.id)
    } else {
      await supabase.database.from('income_reports').insert([{
        user_id: user.id,
        income_type: incomeType,
        status: 'ready',
        report_data: reportData,
        employment_data: employmentData,
      }])
    }

    return NextResponse.json({ status: 'ready', report: reportData, employment: employmentData })
  } catch (err: any) {
    console.error('Payroll income get error:', err.response?.data || err.message)
    return NextResponse.json({ status: 'error', error: err.message })
  }
}
