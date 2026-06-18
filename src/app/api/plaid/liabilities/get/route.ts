import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: items } = await supabase.database
    .from('plaid_items')
    .select('id, access_token, institution_name')
    .eq('user_id', user.id)

  if (!items || items.length === 0) {
    return NextResponse.json({ credit: [], student: [], mortgage: [] })
  }

  // Fetch liabilities from all linked items in parallel
  const results = await Promise.allSettled(
    items.map(async (item: { id: string; access_token: string; institution_name: string | null }) => {
      const res = await plaidClient.liabilitiesGet({ access_token: item.access_token })
      return { item, liabilities: res.data.liabilities, accounts: res.data.accounts }
    })
  )

  const now = new Date().toISOString()
  const allCredit: unknown[] = []
  const allStudent: unknown[] = []
  const allMortgage: unknown[] = []
  const snapshots: {
    user_id: string
    plaid_item_id: string
    institution_name: string | null
    credit_data: unknown
    student_data: unknown
    mortgage_data: unknown
    fetched_at: string
  }[] = []

  for (const result of results) {
    if (result.status === 'rejected') {
      const code = result.reason?.response?.data?.error_code
      // PRODUCTS_NOT_SUPPORTED means this item has no liability accounts — skip silently
      if (code !== 'PRODUCTS_NOT_SUPPORTED' && code !== 'NO_LIABILITY_ACCOUNTS') {
        console.error('Liabilities fetch error:', result.reason?.response?.data || result.reason?.message)
      }
      continue
    }

    const { item, liabilities } = result.value
    const credit = liabilities.credit ?? []
    const student = liabilities.student ?? []
    const mortgage = liabilities.mortgage ?? []

    allCredit.push(...credit)
    allStudent.push(...student)
    allMortgage.push(...mortgage)

    snapshots.push({
      user_id: user.id,
      plaid_item_id: item.id,
      institution_name: item.institution_name,
      credit_data: credit,
      student_data: student,
      mortgage_data: mortgage,
      fetched_at: now,
    })
  }

  // Snapshot for historical tracking
  if (snapshots.length > 0) {
    await supabase.database.from('liability_snapshots').insert(snapshots)
  }

  return NextResponse.json({
    credit: allCredit,
    student: allStudent,
    mortgage: allMortgage,
    fetched_at: now,
  })
}
