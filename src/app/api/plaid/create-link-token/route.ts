import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'
import { CountryCode, Products } from 'plaid'

export async function POST() {
  const insforge = await createClient()
  const { data: { user } } = await insforge.auth.getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[Plaid] ENV:', process.env.PLAID_ENV, '| CLIENT_ID set:', !!process.env.PLAID_CLIENT_ID, '| SECRET set:', !!process.env.PLAID_SECRET)

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'KelliWorks Client Portal',
      products: [Products.Transactions, Products.Assets, Products.Liabilities],
      // Signal doesn't gate the Link flow — consent is collected via additional_consented_products
      // and activated per-item with /signal/prepare
      additional_consented_products: [Products.Signal],
      // Statements isn't supported at all institutions — use required_if_supported_products
      // so users aren't blocked at banks that don't offer it
      required_if_supported_products: [Products.Statements],
      statements: { start_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] },
      transactions: { days_requested: 730 },
      country_codes: [CountryCode.Us],
      language: 'en',
      redirect_uri: process.env.PLAID_REDIRECT_URI,
    })
    return NextResponse.json({ link_token: response.data.link_token })
  } catch (err: any) {
    console.error('PLAID LINK TOKEN ERROR:', err.response?.data || err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
