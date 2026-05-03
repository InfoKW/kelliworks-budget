import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const insforge = await createClient()
  const { data: { user } } = await insforge.auth.getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await insforge.database
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="min-h-screen" style={{ background: 'var(--navy-950)' }}>
      <nav className="border-b border-slate-700" style={{ background: 'var(--slate-800)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-8">
          <h1 className="text-lg font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--gold-400)' }}>
            KelliWorks Admin
          </h1>
          <div className="flex gap-6 text-sm text-slate-400">
            <a href="/admin" className="hover:text-white transition-colors">Overview</a>
            <a href="/admin/clients" className="hover:text-white transition-colors">Clients</a>
            <a href="/admin/budgets" className="hover:text-white transition-colors">Budgets</a>
            <a href="/admin/alerts" className="hover:text-white transition-colors">Alerts</a>
          </div>
          <div className="ml-auto">
            <a href="/dashboard" className="text-sm text-amber-400 hover:text-amber-300">→ Client View</a>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
