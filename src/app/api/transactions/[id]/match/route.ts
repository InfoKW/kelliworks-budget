import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recalculateBudgetLineActual } from '@/lib/budget/matcher'
import { z } from 'zod'

const matchSchema = z.object({
  budget_line_id: z.string().uuid(),
  save_rule: z.boolean().optional(),
  merchant_pattern: z.string().optional(),
})

interface RouteParams { params: Promise<{ id: string }> }

// POST — manually link a transaction to a budget line
export async function POST(req: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = matchSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { budget_line_id, save_rule, merchant_pattern } = body.data

  // Fetch the transaction to verify access and get merchant name
  const { data: txn } = await supabase.database
    .from('transactions').select('id, user_id, budget_line_id, merchant_name, name, amount')
    .eq('id', id).single()
  if (!txn) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  // Remember the old budget line so we can recalculate it too
  const oldLineId = txn.budget_line_id as string | null

  // Update transaction
  await supabase.database.from('transactions').update({
    budget_line_id,
    is_matched: true,
    is_untracked: false,
    match_source: 'manual',
    match_confidence: 100,
  }).eq('id', id)

  // Recalculate actual_amount for both the old and new budget lines
  const recalcs: Promise<any>[] = [recalculateBudgetLineActual(supabase, budget_line_id)]
  if (oldLineId && oldLineId !== budget_line_id) {
    recalcs.push(recalculateBudgetLineActual(supabase, oldLineId))
  }
  await Promise.all(recalcs)

  // Save merchant rule if requested
  if (save_rule && merchant_pattern) {
    const { data: line } = await supabase.database
      .from('budget_lines').select('category').eq('id', budget_line_id).single()
    if (line) {
      await supabase.database.from('merchant_rules').upsert([{
        user_id: txn.user_id,
        merchant_pattern: merchant_pattern.toLowerCase(),
        budget_line_category: line.category,
      }], { onConflict: 'user_id,merchant_pattern' })
    }
  }

  return NextResponse.json({ success: true })
}

// DELETE — unlink a transaction from its budget line
export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: txn } = await supabase.database
    .from('transactions').select('id, budget_line_id')
    .eq('id', id).single()
  if (!txn) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  const oldLineId = txn.budget_line_id as string | null

  await supabase.database.from('transactions').update({
    budget_line_id: null,
    is_matched: false,
    is_untracked: false,
    match_source: null,
    match_confidence: 0,
  }).eq('id', id)

  if (oldLineId) {
    await recalculateBudgetLineActual(supabase, oldLineId)
  }

  return NextResponse.json({ success: true })
}
