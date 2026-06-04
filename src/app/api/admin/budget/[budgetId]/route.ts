import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ budgetId: string }>
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { budgetId } = await params
  const insforge = await createClient()

  const { data: { user } } = await insforge.auth.getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await insforge.database
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // budget_lines cascade on delete via FK, so deleting the budget is enough
  const { error } = await insforge.database
    .from('budgets').delete().eq('id', budgetId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
