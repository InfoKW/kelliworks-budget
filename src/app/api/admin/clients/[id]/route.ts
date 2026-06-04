import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const insforge = await createClient()

  const { data: { user: adminUser } } = await insforge.auth.getCurrentUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await insforge.database
    .from('profiles').select('role').eq('id', adminUser.id).single()
  if (adminProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { full_name } = await req.json()

  const { error } = await insforge.database
    .from('profiles')
    .update({ full_name: full_name || null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const insforge = await createClient()

  // Verify caller is admin
  const { data: { user: adminUser } } = await insforge.auth.getCurrentUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await insforge.database
    .from('profiles').select('role').eq('id', adminUser.id).single()
  if (adminProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify the target is a client profile
  const { data: clientProfile } = await insforge.database
    .from('profiles').select('id, role, email').eq('id', id).single()
  if (!clientProfile) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  if (clientProfile.role === 'admin') {
    return NextResponse.json({ error: 'Cannot delete an admin account' }, { status: 403 })
  }

  // Delete child records first to avoid FK constraint errors
  await insforge.database.from('alerts').delete().eq('user_id', id)
  await insforge.database.from('transactions').delete().eq('user_id', id)
  await insforge.database.from('plaid_items').delete().eq('user_id', id)

  // Budget lines depend on budgets — delete lines first
  const { data: budgets } = await insforge.database
    .from('budgets').select('id').eq('user_id', id)
  if (budgets && budgets.length > 0) {
    const budgetIds = budgets.map((b: { id: string }) => b.id)
    for (const bid of budgetIds) {
      await insforge.database.from('budget_lines').delete().eq('budget_id', bid)
    }
    await insforge.database.from('budgets').delete().eq('user_id', id)
  }

  // Delete profile — this immediately revokes portal access
  const { error: deleteError } = await insforge.database
    .from('profiles').delete().eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Remove from auth.users so the account can't be re-used and is fully gone.
  // Uses a SECURITY DEFINER function because direct auth.users deletes are blocked.
  await insforge.database.rpc('delete_auth_user', { target_user_id: id })

  return NextResponse.json({ ok: true })
}
