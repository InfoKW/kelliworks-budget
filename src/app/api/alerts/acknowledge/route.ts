import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  alert_id: z.string().uuid(),
  confirmation: z.string().optional(),
})

export async function POST(request: Request) {
  const insforge = await createClient()
  const { data: { user } } = await insforge.auth.getCurrentUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = schema.safeParse(await request.json())
  if (!body.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { data: alert } = await insforge.database
    .from('alerts')
    .select('severity, user_id')
    .eq('id', body.data.alert_id)
    .single()

  if (!alert) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (alert.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (alert.severity === 'red' && body.data.confirmation !== 'I understand') {
    return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })
  }

  await insforge.database.from('alerts').update({
    status: 'acknowledged',
    acknowledged_at: new Date().toISOString(),
    acknowledged_by: user.id,
  }).eq('id', body.data.alert_id)

  return NextResponse.json({ success: true })
}
