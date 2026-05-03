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

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'KelliWorks Client Portal',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    })
    return NextResponse.json({ link_token: response.data.link_token })
  } catch (err: any) {
    console.error('PLAID LINK TOKEN ERROR:', err.response?.data || err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
