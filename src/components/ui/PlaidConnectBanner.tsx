import { createClient } from '@/lib/supabase/server'
import { Building2 } from 'lucide-react'
import Link from 'next/link'

export default async function PlaidConnectBanner() {
  const insforge = await createClient()
  const { data: { user } } = await insforge.auth.getCurrentUser()
  if (!user) return null

  const { data: plaidItems } = await insforge.database
    .from('plaid_items').select('id').eq('user_id', user.id).limit(1)

  if ((plaidItems ?? []).length > 0) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, padding: '14px 20px', borderRadius: 12,
      background: 'var(--c-gold-50, #fffbeb)',
      border: '1px solid var(--c-gold-200, #fde68a)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 9, flexShrink: 0,
          background: 'var(--c-gold-100, #fef3c7)',
          border: '1px solid var(--c-gold-200, #fde68a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Building2 size={17} color="var(--c-gold-600, #d97706)" />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-navy-950)', marginBottom: 2 }}>
            Connect your bank to track actuals
          </p>
          <p style={{ fontSize: 13, color: 'var(--c-slate-500)' }}>
            Link your accounts via Plaid to automatically match transactions to your budget lines.
          </p>
        </div>
      </div>
      <Link
        href="/connectors"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
          padding: '9px 20px', borderRadius: 99, fontSize: 13, fontWeight: 700,
          background: 'var(--c-gold-500)', color: 'white', textDecoration: 'none',
          boxShadow: '0 2px 8px rgba(184,134,11,0.25)',
          whiteSpace: 'nowrap',
        }}
      >
        Connect Bank →
      </Link>
    </div>
  )
}
