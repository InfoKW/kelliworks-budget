import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchAndParseSheet } from '@/lib/sheets/parser'

export async function POST(req: NextRequest) {
  const insforge = await createClient()
  const { data: { user } } = await insforge.auth.getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify admin role
  const { data: profile } = await insforge.database
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { client_id, sheet_url, month } = await req.json()

  if (!client_id || !sheet_url || !month) {
    return NextResponse.json({ error: 'client_id, sheet_url, and month are required' }, { status: 400 })
  }

  // Parse the sheet
  let result
  try {
    result = await fetchAndParseSheet(sheet_url)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 422 })
  }

  const fullMonth = month.length === 7 ? `${month}-01` : month
  const total = result.rows.reduce((s, r) => s + r.estimated, 0)

  // Upsert budget record
  const { data: existing } = await insforge.database
    .from('budgets').select('id').eq('user_id', client_id).eq('month', fullMonth).single()

  let budgetId: string
  if (existing) {
    await insforge.database.from('budgets')
      .update({ total_estimated: total, notes: `Imported from sheet: ${sheet_url}` })
      .eq('id', existing.id)
    budgetId = existing.id
  } else {
    const { data: created } = await insforge.database
      .from('budgets')
      .insert([{
        user_id: client_id,
        month: fullMonth,
        total_estimated: total,
        notes: `Imported from sheet: ${sheet_url}`,
        created_by: user.id,
      }])
      .select('id').single()
    budgetId = created!.id
  }

  // Replace all lines
  await insforge.database.from('budget_lines').delete().eq('budget_id', budgetId)

  const insertRows = result.rows.map(row => ({
    budget_id:        budgetId,
    user_id:          client_id,
    category:         row.category,
    description:      row.description ?? null,
    estimated_amount: row.estimated,
    actual_amount:    row.actual,
    status:           row.status,
    due_day:          row.dueDay ?? null,
    notes:            JSON.stringify({
      bill_type:       row.billType,
      frequency:       row.frequency       ?? null,
      payment_account: row.paymentAccount  ?? null,
      auto_pay:        row.autoPay,
      due_week:        row.dueWeek         ?? null,
      original_status: row.status,
      original_notes:  null,
    }),
  }))

  const { error: insertError } = await insforge.database
    .from('budget_lines')
    .insert(insertRows)

  if (insertError) {
    return NextResponse.json({ error: `Failed to save budget lines: ${insertError.message}` }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    imported: result.rows.length,
    total_estimated: total,
    budget_id: budgetId,
  })
}
