import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ budgetId: string }>
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { budgetId } = await params
  const insforge = await createClient()

  const { data: { user } } = await insforge.auth.getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await insforge.database
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: lines, error } = await insforge.database
    .from('budget_lines')
    .select('id, category, description, estimated_amount, actual_amount, status, due_day, notes')
    .eq('budget_id', budgetId)
    .order('due_day')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Parse notes JSON and return flat debug view
  const debug = (lines ?? []).map((l: any, i: number) => {
    let meta: any = {}
    if (l.notes?.startsWith('{')) {
      try { meta = JSON.parse(l.notes) } catch {}
    }
    return {
      row:             i + 1,
      category:        l.category,
      description:     l.description,
      estimated:       l.estimated_amount,
      actual:          l.actual_amount,
      due_day:         l.due_day,
      due_week:        meta.due_week ?? null,
      frequency:       meta.frequency ?? null,
      bill_type:       meta.bill_type ?? null,
      payment_account: meta.payment_account ?? null,
      auto_pay:        meta.auto_pay ?? null,
      original_status: meta.original_status ?? null,
      original_notes:  meta.original_notes ?? null,
    }
  })

  return NextResponse.json({ total: debug.length, lines: debug })
}
