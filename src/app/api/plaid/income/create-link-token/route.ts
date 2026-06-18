import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'
import { CountryCode, IncomeVerificationPayrollFlowType, IncomeVerificationSourceType, Products } from 'plaid'
import { z } from 'zod'

const schema = z.object({
  income_type: z.enum(['bank', 'document', 'payroll']),
  days_requested: z.number().int().min(1).max(730).default(90),
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

  // Require existing user_token
  const { data: profile } = await supabase.database
    .from('profiles')
    .select('plaid_user_token')
    .eq('id', user.id)
    .single()

  if (!profile?.plaid_user_token) {
    return NextResponse.json({ error: 'User token not found. Call /api/plaid/income/create-user-token first.' }, { status: 400 })
  }

  const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/webhook`
    : undefined

  const { income_type, days_requested } = body.data

  try {
    const incomeVerification = income_type === 'bank'
      ? {
          income_source_types: [IncomeVerificationSourceType.Bank],
          bank_income: { days_requested },
        }
      : {
          income_source_types: [IncomeVerificationSourceType.Payroll],
          payroll_income: {
            flow_types: income_type === 'document'
              ? [IncomeVerificationPayrollFlowType.DocumentIncome]
              : [IncomeVerificationPayrollFlowType.DigitalIncome],
          },
        }

    const res = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      user_token: profile.plaid_user_token,
      client_name: 'KelliWorks Client Portal',
      products: [Products.IncomeVerification],
      country_codes: [CountryCode.Us],
      language: 'en',
      ...(webhookUrl ? { webhook: webhookUrl } : {}),
      income_verification: incomeVerification,
    })

    return NextResponse.json({ link_token: res.data.link_token })
  } catch (err: any) {
    console.error('Income link token error:', err.response?.data || err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
