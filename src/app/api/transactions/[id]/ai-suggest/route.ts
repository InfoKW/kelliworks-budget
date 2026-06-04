import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get the transaction
  const { data: txn } = await supabase.database
    .from('transactions')
    .select('id, user_id, name, merchant_name, amount, date, category')
    .eq('id', id).single()
  if (!txn) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  // Get budget lines for the transaction's month
  const month = (txn.date as string).slice(0, 7) + '-01'
  const { data: budget } = await supabase.database
    .from('budgets').select('id').eq('user_id', txn.user_id).eq('month', month).single()

  if (!budget) return NextResponse.json({ error: 'No budget for this month' }, { status: 404 })

  const { data: lines } = await supabase.database
    .from('budget_lines').select('id, category, description, estimated_amount, actual_amount')
    .eq('budget_id', budget.id)

  if (!lines || lines.length === 0) {
    return NextResponse.json({ error: 'No budget lines available' }, { status: 404 })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `You are a financial transaction matching assistant for a budget tracking app.

Transaction to match:
- Name: ${txn.name}
- Merchant: ${txn.merchant_name ?? 'N/A'}
- Amount: $${txn.amount}
- Date: ${txn.date}
- Plaid Category: ${(txn.category as string[])?.[0] ?? 'N/A'}

Available budget lines for ${month.slice(0, 7)}:
${lines.map((l, i) => `${i + 1}. ID: ${l.id} | Category: ${l.category} | Description: ${l.description ?? 'N/A'} | Budgeted: $${l.estimated_amount} | Actual so far: $${l.actual_amount}`).join('\n')}

Pick the best matching budget line. If none match, say so.
Respond ONLY with valid JSON (no markdown):
{"budget_line_id": "<uuid or null>", "confidence": <0-100>, "reasoning": "<one sentence>"}`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (response.content[0] as { type: string; text: string }).text.trim()

  try {
    const result = JSON.parse(raw)
    // Look up the line name for display
    const matchedLine = result.budget_line_id
      ? lines.find((l: { id: string; category: string; description: string | null }) => l.id === result.budget_line_id)
      : null

    return NextResponse.json({
      budget_line_id: result.budget_line_id ?? null,
      confidence: result.confidence ?? 0,
      reasoning: result.reasoning ?? '',
      line_name: matchedLine
        ? (matchedLine.description ?? matchedLine.category)
        : null,
    })
  } catch {
    return NextResponse.json({ error: 'AI returned invalid response' }, { status: 500 })
  }
}
