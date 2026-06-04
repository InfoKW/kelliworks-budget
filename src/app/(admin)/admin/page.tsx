import { createClient } from '@/lib/supabase/server'
import { Card, SectionLabel } from '@/components/ui'
import { Users, AlertTriangle, BadgeCheck, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { data: clientRows },
    { data: alertRows },
    { data: activeSubRows },
    { data: budgetRows },
  ] = await Promise.all([
    supabase.database.from('profiles').select('id').in('role', ['client', 'admin']),
    supabase.database.from('alerts').select('id').eq('status', 'pending'),
    supabase.database.from('profiles').select('id').eq('subscription_status', 'active').in('role', ['client', 'admin']),
    supabase.database.from('budgets').select('id'),
  ])

  const stats = [
    { label: 'Total Clients',        value: (clientRows ?? []).length,    icon: Users,         color: 'var(--c-gold-500)',  href: '/admin/clients' },
    { label: 'Open Alerts',          value: (alertRows ?? []).length,     icon: AlertTriangle, color: 'var(--c-red-500)',   href: '/admin/alerts'  },
    { label: 'Active Subscriptions', value: (activeSubRows ?? []).length, icon: BadgeCheck,    color: 'var(--c-green-500)', href: '/admin/clients' },
    { label: 'Budgets Created',      value: (budgetRows ?? []).length,    icon: TrendingUp,    color: 'var(--c-gold-400)',  href: '/admin/budgets' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Header */}
      <div>
        <SectionLabel style={{ marginBottom: 10 }}>Admin</SectionLabel>
        <h1 style={{ fontSize: 32, color: 'var(--c-navy-950)' }}>Overview</h1>
        <p style={{ fontSize: 14, color: 'var(--c-slate-500)', marginTop: 6 }}>
          Welcome back, Kelli. Here's what's happening.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} style={{ textDecoration: 'none' }}>
            <Card padding={24} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `color-mix(in srgb, ${color} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} color={color} />
                </div>
              </div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--c-navy-950)', lineHeight: 1, marginBottom: 6 }}>
                {value}
              </p>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-slate-500)' }}>
                {label}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card padding={28} accent>
          <SectionLabel style={{ marginBottom: 14 }}>Quick Actions</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {[
              { label: 'Add a new client',          href: '/admin/clients' },
              { label: 'Upload a client budget',     href: '/admin/budgets' },
              { label: 'Review pending alerts',      href: '/admin/alerts'  },
              { label: 'View all client budgets',    href: '/admin/budgets' },
            ].map(({ label, href }) => (
              <Link key={label} href={href} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8,
                background: 'var(--c-slate-100)', border: '1px solid var(--c-slate-200)',
                fontSize: 13, fontWeight: 600, color: 'var(--c-navy-950)',
                textDecoration: 'none', transition: 'all 0.15s',
              }}>
                {label}
                <span style={{ color: 'var(--c-gold-500)', fontSize: 16 }}>→</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card padding={28}>
          <SectionLabel style={{ marginBottom: 14 }}>System Status</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
            {[
              { label: 'Database',     status: 'Operational' },
              { label: 'Plaid Sync',   status: 'Operational' },
              { label: 'AI (Kelly)',   status: 'Operational' },
              { label: 'Stripe',       status: 'Operational' },
            ].map(({ label, status }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--c-slate-600)', fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-green-500)', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 10px', borderRadius: 99 }}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  )
}
