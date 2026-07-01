import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { SectionLabel } from '@/components/ui'
import ClientTransactionsTable from '@/components/admin/ClientTransactionsTable'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClientTransactionsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: profile, error: profileError } = await supabase.database
    .from('profiles').select('full_name, email').eq('id', id).single()

  // Only 404 if the client genuinely doesn't exist — not on auth/network errors
  if (!profile && !profileError) notFound()

  // Fetch all transactions for this client (no month filter — all time)
  const { data: transactions } = await supabase.database
    .from('transactions')
    .select('*')
    .eq('user_id', id)
    .order('date', { ascending: false })

  // Fetch all budgets for this client to get budget lines
  const { data: budgets } = await supabase.database
    .from('budgets')
    .select('id, month')
    .eq('user_id', id)
    .order('month', { ascending: false })

  const budgetIds = (budgets ?? []).map((b: any) => b.id)

  const { data: budgetLines } = budgetIds.length > 0
    ? await supabase.database
        .from('budget_lines')
        .select('id, budget_id, category, description, notes, estimated_amount')
        .in('budget_id', budgetIds)
    : { data: [] }

  const displayName = profile.full_name || profile.email

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Back link */}
      <Link href={`/admin/clients/${id}`} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: 'var(--c-slate-500)', fontWeight: 500,
        textDecoration: 'none', marginBottom: -16,
      }}>
        <ArrowLeft size={13} /> {displayName}
      </Link>

      {/* Header */}
      <div>
        <SectionLabel style={{ marginBottom: 8 }}>Admin · Transactions</SectionLabel>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--c-navy-950)' }}>
          Match Transactions
        </h1>
        <p style={{ fontSize: 13, color: 'var(--c-slate-500)', marginTop: 4 }}>
          {displayName} — search, filter, and bulk-match transactions to budget lines.
        </p>
      </div>

      <ClientTransactionsTable
        transactions={(transactions ?? []) as any[]}
        budgetLines={(budgetLines ?? []) as any[]}
        budgets={(budgets ?? []) as any[]}
        clientId={id}
      />

    </div>
  )
}
