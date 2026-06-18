import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'

// Creates a Plaid user_token for the authenticated user if one doesn't exist yet.
// The user_token is required for all Income product endpoints.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Return existing token if already created
  const { data: profile } = await supabase.database
    .from('profiles')
    .select('plaid_user_token')
    .eq('id', user.id)
    .single()

  if (profile?.plaid_user_token) {
    return NextResponse.json({ user_token: profile.plaid_user_token })
  }

  try {
    const res = await plaidClient.userCreate({ client_user_id: user.id })
    const { user_token } = res.data

    await supabase.database
      .from('profiles')
      .update({ plaid_user_token: user_token })
      .eq('id', user.id)

    return NextResponse.json({ user_token })
  } catch (err: any) {
    console.error('Plaid user create error:', err.response?.data || err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
