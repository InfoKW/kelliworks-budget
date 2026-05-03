'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export default function ClientNav({ profile }: { profile: Profile }) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    const insforge = createClient()
    await insforge.auth.signOut()
    // Clear the manual session cookie
    document.cookie = 'insforge_access_token=; path=/; max-age=0; SameSite=Lax'
    router.push('/login')
    router.refresh()
  }

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Trends', href: '/trends' },
    { name: 'Recurring', href: '/recurring' },
    { name: 'Subscriptions', href: '/subscriptions' },
    { name: 'Goals', href: '/goals' },
    { name: 'Budget', href: '/budget' },
    { name: 'Transactions', href: '/transactions' },
    { name: 'Connectors', href: '/connectors' },
  ]

  const displayName = profile.full_name ?? profile.email ?? ''
  const initial = displayName[0]?.toUpperCase() ?? '?'

  return (
    <nav className="glass-nav" style={{ position: 'sticky', top: 0, zIndex: 50, width: '100%' }}>
      <div className="container-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

        {/* Brand */}
        <button
          onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-display)', fontSize: 22 }}
          className="text-navy-950"
        >
          KelliWorks
        </button>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <a
                key={link.name}
                href={link.href}
                style={{
                  display: 'inline-flex', alignItems: 'center', position: 'relative',
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--c-gold-600)' : 'var(--c-slate-500)',
                  background: isActive ? 'var(--c-slate-100)' : 'transparent',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  textDecoration: 'none',
                }}
              >
                {link.name}
              </a>
            )
          })}
          {/* Kelly AI tab */}
          {(() => {
            const isActive = pathname === '/kelly-ai' || pathname.startsWith('/kelly-ai/')
            return (
              <a
                href="/kelly-ai"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '8px 14px', borderRadius: 8, fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--c-gold-600)' : 'var(--c-gold-500)',
                  background: isActive ? 'rgba(212,160,23,0.1)' : 'transparent',
                  border: isActive ? 'none' : '1px solid rgba(212,160,23,0.25)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  textDecoration: 'none',
                  marginLeft: 4,
                }}
              >
                <Sparkles size={12} />
                Kelly AI
              </a>
            )
          })()}
        </div>

        {/* User + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--c-slate-100)', border: '1px solid var(--c-slate-200)',
              fontSize: 12, fontWeight: 700, color: 'var(--c-navy-950)',
            }}>
              {initial}
            </div>
            <span style={{ fontSize: 13, color: 'var(--c-slate-600)', fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </span>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
