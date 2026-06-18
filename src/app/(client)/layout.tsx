import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientNav from '@/components/ui/ClientNav'
import PlaidReconnectCheck from '@/components/ui/PlaidReconnectCheck'
// import KellyAIBubble from '@/components/ai/KellyAIBubble'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const insforge = await createClient()
  const { data: { user } } = await insforge.auth.getCurrentUser()

  if (!user) redirect('/login')

  const { data: profile } = await insforge.database
    .from('profiles').select('*').eq('id', user.id).single()

  if (!profile) {
    // User was not pre-added by an admin — deny access
    await insforge.auth.signOut()
    redirect('/login?error=not_registered')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--c-bg)', position: 'relative' }}>
      <ClientNav profile={profile} />
      <main style={{ flex: 1, position: 'relative', zIndex: 1, padding: '32px 0' }}>
        <div className="container-page">
          <PlaidReconnectCheck />
          {children}
        </div>
      </main>
      {/* <KellyAIBubble /> */}
    </div>
  )
}
