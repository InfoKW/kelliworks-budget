import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, SectionLabel, Badge } from '@/components/ui'
import AdminReviewTable from '@/components/admin/AdminReviewTable'
import { AlertTriangle, Clock } from 'lucide-react'

export default async function AdminReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.database
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  // All unmatched transactions that need attention (needs-review + untracked)
  const { data: transactions } = await supabase.database
    .from('transactions')
    .select('*')
    .eq('is_matched', false)
    .order('date', { ascending: false })
    .limit(500)

  // Profiles for display
  const { data: profiles } = await supabase.database
    .from('profiles').select('id, full_name, email')

  // All budget lines (for matching modal)
  const { data: budgets } = await supabase.database
    .from('budgets').select('id, month, user_id')

  const { data: budgetLines } = await supabase.database
    .from('budget_lines').select('id, budget_id, category, description, estimated_amount, actual_amount, user_id')

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]))

  const needsReview = (transactions ?? []).filter((t: any) => !t.is_untracked && (t.match_confidence ?? 0) >= 40)
  const untracked   = (transactions ?? []).filter((t: any) => t.is_untracked)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div>
        <SectionLabel style={{ marginBottom: 10 }}>Admin · Transaction Review</SectionLabel>
        <h1 style={{ fontSize: 32 }}>Review Queue</h1>
        <p style={{ fontSize: 14, color: 'var(--c-slate-500)', marginTop: 6 }}>
          Transactions that could not be auto-matched or were flagged as untracked.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Card padding={20}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-slate-500)', marginBottom: 8 }}>
            Needs Review
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--c-amber-500)', lineHeight: 1 }}>
            {needsReview.length}
          </p>
          <p style={{ fontSize: 12, color: 'var(--c-slate-400)', marginTop: 4 }}>Partial confidence — needs human decision</p>
        </Card>
        <Card padding={20}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-slate-500)', marginBottom: 8 }}>
            Untracked
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--c-red-500)', lineHeight: 1 }}>
            {untracked.length}
          </p>
          <p style={{ fontSize: 12, color: 'var(--c-slate-400)', marginTop: 4 }}>No budget line found — may need new line</p>
        </Card>
        <Card padding={20}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-slate-500)', marginBottom: 8 }}>
            Total Unmatched
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--c-navy-950)', lineHeight: 1 }}>
            {(transactions ?? []).length}
          </p>
          <p style={{ fontSize: 12, color: 'var(--c-slate-400)', marginTop: 4 }}>Across all clients</p>
        </Card>
      </div>

      {(transactions ?? []).length === 0 ? (
        <Card padding="48px 32px" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-navy-950)', marginBottom: 8 }}>All caught up</p>
          <p style={{ fontSize: 14, color: 'var(--c-slate-400)' }}>No transactions need review right now.</p>
        </Card>
      ) : (
        <AdminReviewTable
          transactions={(transactions ?? []) as any}
          profileMap={Object.fromEntries(profileMap)}
          budgets={(budgets ?? []) as any}
          budgetLines={(budgetLines ?? []) as any}
        />
      )}
    </div>
  )
}
