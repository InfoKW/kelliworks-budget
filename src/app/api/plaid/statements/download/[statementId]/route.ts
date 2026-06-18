import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ statementId: string }> }
) {
  const { statementId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Look up which item owns this statement — enforces ownership
  const { data: meta } = await supabase.database
    .from('statement_metadata')
    .select('plaid_item_id, account_name, month, year')
    .eq('statement_id', statementId)
    .eq('user_id', user.id)
    .single()

  if (!meta) {
    return NextResponse.json({ error: 'Statement not found' }, { status: 404 })
  }

  const { data: item } = await supabase.database
    .from('plaid_items')
    .select('access_token')
    .eq('id', meta.plaid_item_id)
    .eq('user_id', user.id)
    .single()

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  try {
    const res = await plaidClient.statementsDownload(
      { access_token: item.access_token, statement_id: statementId },
      { responseType: 'arraybuffer' }
    )

    const filename = `statement_${meta.account_name}_${meta.year}_${String(meta.month).padStart(2, '0')}.pdf`
      .replace(/[^a-zA-Z0-9._-]/g, '_')

    return new Response(res.data as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err: any) {
    console.error('[Statements download] error:', err.response?.data || err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
