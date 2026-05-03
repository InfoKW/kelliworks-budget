import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMonth } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  const insforge = await createClient()
  const { data: { user } } = await insforge.auth.getCurrentUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const { messages } = await request.json()
  if (!Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 })
  }

  // ── Fetch financial context ─────────────────────────────
  const month = getCurrentMonth()

  const [profileRes, budgetRes, transactionsRes, alertsRes] = await Promise.all([
    insforge.database.from('profiles').select('full_name, email').eq('id', user.id).single(),
    insforge.database.from('budgets').select('total_estimated, notes, budget_lines(category, description, estimated_amount, actual_amount, status, due_day)').eq('user_id', user.id).eq('month', month).single(),
    insforge.database.from('transactions').select('date, name, merchant_name, amount, is_matched, is_untracked').eq('user_id', user.id).gte('date', month).order('date', { ascending: false }).limit(30),
    insforge.database.from('alerts').select('severity, type, title, amount, status').eq('user_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(20),
  ])

  const profile = profileRes.data
  const budget = budgetRes.data
  const transactions = transactionsRes.data ?? []
  const alerts = alertsRes.data ?? []

  const budgetLines = (budget as any)?.budget_lines ?? []
  const totalEstimated = budget?.total_estimated ?? 0
  const totalSpent = budgetLines.reduce((s: number, l: any) => s + (l.actual_amount ?? 0), 0)
  const remaining = totalEstimated - totalSpent
  const pct = totalEstimated > 0 ? Math.round((totalSpent / totalEstimated) * 100) : 0

  // ── Build system prompt ─────────────────────────────────
  const systemPrompt = `You are Kelly AI, a financial assistant built into the KelliWorks client portal.
You help clients understand their budget, analyze spending, spot issues, and plan their finances.
Be concise, direct, and data-specific — always reference actual numbers from the client's data when relevant.
Never make up numbers. If data is missing, say so honestly.
IMPORTANT formatting rules — follow these strictly:
- No markdown. No bold (**text**), no italics, no headers, no bullet points with dashes or asterisks.
- No emojis of any kind.
- Write in plain prose. Use short paragraphs or simple numbered lists (1. 2. 3.) when listing things.
- Do not use a greeting like "Hi there!" or sign off. Get straight to the answer.
Today's date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
Client: ${profile?.full_name ?? profile?.email ?? 'Client'}

CURRENT BUDGET (${month}):
  Total Estimated: $${totalEstimated.toFixed(2)}
  Total Spent:     $${totalSpent.toFixed(2)}
  Remaining:       $${remaining.toFixed(2)}
  % Used:          ${pct}%

BUDGET LINES (${budgetLines.length} total):
${budgetLines.length === 0 ? '  No budget lines defined for this period.' : budgetLines.map((l: any) =>
  `  - ${l.category}${l.description ? ` (${l.description})` : ''}: estimated $${(l.estimated_amount ?? 0).toFixed(2)}, actual $${(l.actual_amount ?? 0).toFixed(2)}, status: ${l.status}${l.due_day ? `, due day ${l.due_day}` : ''}`
).join('\n')}

RECENT TRANSACTIONS (${transactions.length} shown):
${transactions.length === 0 ? '  No transactions found for this period.' : transactions.map((t: any) =>
  `  - ${t.date} | ${t.merchant_name ?? t.name} | $${(t.amount ?? 0).toFixed(2)} | ${t.is_untracked ? 'untracked' : t.is_matched ? 'matched' : 'pending'}`
).join('\n')}

PENDING ALERTS (${alerts.length} total):
${alerts.length === 0 ? '  No pending alerts.' : alerts.map((a: any) =>
  `  - [${a.severity?.toUpperCase()}] ${a.type}: ${a.title}${a.amount ? ` — $${(a.amount).toFixed(2)}` : ''}`
).join('\n')}`

  // ── Stream from Claude ─────────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        const claudeStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
        })

        for await (const chunk of claudeStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch (err) {
        controller.enqueue(new TextEncoder().encode('\n[Error contacting Kelly AI. Please try again.]'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
