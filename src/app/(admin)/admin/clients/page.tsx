import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { Card, Badge, SectionLabel } from '@/components/ui'
import AddClientModal from '@/components/admin/AddClientModal'
import SyncNamesButton from '@/components/admin/SyncNamesButton'

export default async function AdminClientsPage() {
  const supabase = await createClient()

  const { data: clients } = await supabase.database
    .from('profiles')
    .select('*')
    .in('role', ['client', 'admin'])
    .order('created_at', { ascending: false })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <SectionLabel style={{ marginBottom: 10 }}>Admin · Clients</SectionLabel>
          <h1 style={{ fontSize: 32, color: 'var(--c-navy-950)' }}>Clients</h1>
          <p style={{ fontSize: 14, color: 'var(--c-slate-500)', marginTop: 6 }}>
            {(clients ?? []).length} client{(clients ?? []).length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <SyncNamesButton />
          <AddClientModal />
        </div>
      </div>

      {/* Table */}
      {(clients ?? []).length === 0 ? (
        <Card padding="56px 32px" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: 'var(--c-slate-400)', marginBottom: 16 }}>No clients yet.</p>
          <p style={{ fontSize: 13, color: 'var(--c-slate-400)' }}>
            Click <strong style={{ color: 'var(--c-gold-600)' }}>Add Client</strong> to create the first one.
          </p>
        </Card>
      ) : (
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--c-slate-200)', background: 'var(--c-slate-100)' }}>
                {['Name', 'Email', 'Subscription', 'Joined', ''].map(h => (
                  <th key={h} style={{
                    padding: '12px 20px', textAlign: 'left',
                    fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: 'var(--c-slate-500)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(clients ?? []).map((client: {
                id: string; full_name: string | null; email: string
                subscription_status: string; created_at: string; role: string
              }, i: number) => (
                <tr key={client.id} style={{
                  borderTop: i > 0 ? '1px solid var(--c-slate-100)' : 'none',
                  transition: 'background 0.12s',
                }}>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--c-navy-950)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {client.full_name || <span style={{ color: 'var(--c-slate-400)', fontWeight: 400 }}>No name</span>}
                      {client.role === 'admin' && (
                        <span style={{
                          fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                          letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 5,
                          background: 'var(--c-gold-100)', color: 'var(--c-gold-700)',
                        }}>
                          Admin
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--c-slate-500)' }}>{client.email}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <Badge variant={client.subscription_status === 'active' ? 'green' : 'red'}>
                      {client.subscription_status}
                    </Badge>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--c-slate-500)' }}>{formatDate(client.created_at)}</td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <a
                      href={`/admin/clients/${client.id}`}
                      style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-gold-600)', textDecoration: 'none' }}
                    >
                      View →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
