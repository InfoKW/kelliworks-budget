import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recalculateBudgetLineActual } from '@/lib/budget/matcher'
import { z } from 'zod'

const schema = z.object({
  transaction_ids: z.array(z.string().uuid()).min(1),
  budget_line_id:  z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error: profileErr } = await supabase.database
    .from('profiles').select('role').eq('id', user.id).single()
  console.log('[bulk-match] user.id:', user.id, '| profile:', JSON.stringify(profile), '| profileErr:', JSON.stringify(profileErr))
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden', debug: { userId: user.id, profile, profileErr } }, { status: 403 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { transaction_ids, budget_line_id } = body.data

  // Fetch existing transactions to collect old budget_line_ids for recalculation
  const { data: txns } = await supabase.database
    .from('transactions')
    .select('id, budget_line_id')
    .in('id', transaction_ids)

  const oldLineIds = new Set<string>(
    (txns ?? [])
      .map((t: any) => t.budget_line_id as string | null)
      .filter((id): id is string => !!id && id !== budget_line_id)
  )

  // Update each transaction individually
  await Promise.all(
    transaction_ids.map((id: string) =>
      supabase.database.from('transactions').update({
        budget_line_id,
        is_matched:       true,
        is_untracked:     false,
        match_source:     'manual',
        match_confidence: 100,
      }).eq('id', id)
    )
  )

  // Recalculate actuals for the new line + any old lines
  const recalcs = [
    recalculateBudgetLineActual(supabase, budget_line_id),
    ...[...oldLineIds].map(id => recalculateBudgetLineActual(supabase, id)),
  ]
  await Promise.all(recalcs)

  return NextResponse.json({ ok: true, updated: transaction_ids.length })
}
