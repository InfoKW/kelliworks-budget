import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Overview',  href: '/admin' },
  { label: 'Clients',   href: '/admin/clients' },
  { label: 'Budgets',   href: '/admin/budgets' },
  { label: 'Alerts',    href: '/admin/alerts' },
  { label: 'Review Queue', href: '/admin/review' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const insforge = await createClient()
  const { data: { user } } = await insforge.auth.getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await insforge.database
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)' }}>

      {/* Nav */}
      <nav className="glass-nav" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container-page" style={{ display: 'flex', alignItems: 'center', height: 64, gap: 32 }}>

          {/* Brand */}
          <Link href="/admin" style={{
            fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--c-navy-950)',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            KelliWorks
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'var(--c-gold-500)', color: 'white',
              padding: '2px 7px', borderRadius: 4,
            }}>
              Admin
            </span>
          </Link>

          {/* Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={href} href={href} style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                color: 'var(--c-slate-600)', textDecoration: 'none',
                transition: 'all 0.15s',
              }}
              className="admin-nav-link"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Back to portal */}
          <Link href="/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 600, color: 'var(--c-gold-600)',
            textDecoration: 'none', padding: '7px 14px',
            border: '1px solid rgba(212,160,23,0.25)', borderRadius: 8,
            transition: 'all 0.15s',
          }}>
            ← Client Portal
          </Link>
        </div>
      </nav>

      <main className="container-page" style={{ padding: '40px 24px' }}>
        {children}
      </main>
    </div>
  )
}
