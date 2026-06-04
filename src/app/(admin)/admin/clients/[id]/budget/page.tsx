import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getMonthLabel, getCurrentMonth } from '@/lib/utils'
import { Card, SectionLabel } from '@/components/ui'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import BudgetBreakdown from '@/components/budget/BudgetBreakdown'
import DeleteBudgetButton from '@/components/admin/DeleteBudgetButton'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ month?: string }>
}

export default async function AdminClientBudgetPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { month: monthParam } = await searchParams
  const raw = monthParam ?? getCurrentMonth()
  // DB stores months as YYYY-MM-DD (with -01 suffix); normalise both formats
  const month = raw.length === 7 ? `${raw}-01` : raw

  const insforge = await createClient()

  const [{ data: profile }, { data: budget }] = await Promise.all([
    insforge.database.from('profiles').select('full_name, email').eq('id', id).single(),
    insforge.database.from('budgets').select('*').eq('user_id', id).eq('month', month).single(),
  ])

  if (!profile) notFound()

  const { data: lines } = budget
    ? await insforge.database.from('budget_lines').select('*').eq('budget_id', budget.id).order('due_day')
    : { data: [] }

  const displayName = profile.full_name || profile.email

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Back */}
      <div>
        <Link href={`/admin/clients/${id}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: 'var(--c-slate-500)', fontWeight: 500,
          textDecoration: 'none', marginBottom: 16,
        }}>
          <ArrowLeft size={13} /> Back to {displayName}
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <SectionLabel style={{ marginBottom: 10 }}>Admin · Budget Preview</SectionLabel>
            <h1 style={{ fontSize: 32, color: 'var(--c-navy-950)' }}>
              {getMonthLabel(month)} Budget
            </h1>
            <p style={{ fontSize: 14, color: 'var(--c-slate-500)', marginTop: 4 }}>
              {displayName} · {profile.email}
            </p>
          </div>
          {budget && (
            <div style={{ paddingTop: 4 }}>
              <DeleteBudgetButton budgetId={budget.id} clientId={id} />
            </div>
          )}
        </div>
      </div>

      {!budget ? (
        <Card padding="56px 32px" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-navy-950)', marginBottom: 8 }}>
            No budget for {getMonthLabel(month)}
          </p>
          <p style={{ fontSize: 13, color: 'var(--c-slate-400)', marginBottom: 20 }}>
            Upload a budget for this client from the Budgets page.
          </p>
          <Link
            href="/admin/budgets"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: 'var(--c-gold-500)', color: 'white', textDecoration: 'none',
            }}
          >
            Upload Budget →
          </Link>
        </Card>
      ) : (
        <BudgetBreakdown lines={lines ?? []} budget={budget} month={month} />
      )}
    </div>
  )
}
