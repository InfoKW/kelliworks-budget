import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  days_requested: z.number().int().min(1).max(731).default(90),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = schema.safeParse(await request.json().catch(() => ({})))
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // Fetch all linked Plaid items for this user
  const { data: items } = await supabase.database
    .from('plaid_items')
    .select('access_token')
    .eq('user_id', user.id)

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No linked bank accounts found' }, { status: 400 })
  }

  const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/webhook`
    : undefined

  try {
    const res = await plaidClient.assetReportCreate({
      access_tokens: items.map((i: { access_token: string }) => i.access_token),
      days_requested: body.data.days_requested,
      options: {
        ...(webhookUrl ? { webhook: webhookUrl } : {}),
        user: {
          client_user_id: user.id,
        },
      },
    })

    const { asset_report_token, asset_report_id } = res.data

    await supabase.database.from('asset_reports').insert([{
      user_id: user.id,
      asset_report_id,
      asset_report_token,
      days_requested: body.data.days_requested,
      status: 'pending',
    }])

    return NextResponse.json({ asset_report_id, status: 'pending' })
  } catch (err: any) {
    console.error('Asset report create error:', err.response?.data || err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
