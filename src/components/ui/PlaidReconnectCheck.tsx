import { createClient } from '@/lib/supabase/server'
import PlaidReconnectBanner from './PlaidReconnectBanner'

// Server component — queries broken items, renders nothing if all connections are healthy.
export default async function PlaidReconnectCheck() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getCurrentUser()
  if (!user) return null

  const { data: items } = await supabase.database
    .from('plaid_items')
    .select('id, item_id, institution_name, item_status, consent_expiration_time')
    .eq('user_id', user.id)
    .not('item_status', 'eq', 'good')

  if (!items || items.length === 0) return null

  return <PlaidReconnectBanner items={items} />
}
