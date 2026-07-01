import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseExcelBudget } from '@/lib/excel/parser'

export async function POST(req: NextRequest) {
  const insforge = await createClient()
  const { data: { user } } = await insforge.auth.getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await insforge.database
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const file        = formData.get('file') as File | null
  const client_id   = formData.get('client_id') as string | null
  const month       = formData.get('month') as string | null
  const budget_type = (formData.get('budget_type') as string | null) ?? 'both'

  if (!file || !client_id || !month) {
    return NextResponse.json({ error: 'file, client_id, and month are required' }, { status: 400 })
  }

  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    return NextResponse.json({ error: 'Only .xlsx or .xls files are supported.' }, { status: 400 })
  }

  // Parse the Excel file
  let result
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    result = parseExcelBudget(buffer, budget_type as 'business' | 'personal' | 'both')
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 422 })
  }

  const fullMonth = month.length === 7 ? `${month}-01` : month
  const total = result.total_estimated

  // Embed calendar and forecast data into budget.notes as JSON
  const budgetNotes = JSON.stringify({
    source:         `Imported from Excel: ${file.name}`,
    calendarItems:  result.calendarItems,
    forecastItems:  result.forecastItems,
  })

  // Upsert budget record
  const { data: existing } = await insforge.database
    .from('budgets').select('id').eq('user_id', client_id).eq('month', fullMonth).single()

  let budgetId: string
  if (existing) {
    await insforge.database.from('budgets')
      .update({ total_estimated: total, notes: budgetNotes })
      .eq('id', existing.id)
    budgetId = existing.id
  } else {
    const { data: created } = await insforge.database
      .from('budgets')
      .insert([{
        user_id:         client_id,
        month:           fullMonth,
        total_estimated: total,
        notes:           budgetNotes,
        created_by:      user.id,
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
    description:      row.vendor_name,
    estimated_amount: row.estimated_amount,
    actual_amount:    row.actual_amount,
    // DB only accepts: pending | paid | partial | overdue
    // Store the original Excel status inside the notes JSON
    status:           'pending' as const,
    due_day:          row.due_day ?? null,
    notes:            JSON.stringify({
      bill_type:       row.bill_type,
      frequency:       row.frequency       ?? null,
      payment_account: row.payment_account ?? null,
      auto_pay:        row.auto_pay,
      due_week:        row.due_week        ?? null,
      original_status: row.status,         // e.g. 'active', 'cancelled', 'seasonal'
      original_notes:  row.notes           ?? null,
    }),
  }))

  const { error: insertError } = await insforge.database
    .from('budget_lines')
    .insert(insertRows)

  if (insertError) {
    return NextResponse.json({ error: `Failed to save budget lines: ${insertError.message}` }, { status: 500 })
  }

  return NextResponse.json({
    ok:              true,
    imported:        result.rows.length,
    biz_count:       result.biz_count,
    personal_count:  result.personal_count,
    total_estimated: total,
    budget_id:       budgetId,
  })
}
