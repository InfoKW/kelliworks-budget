import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createInsforgeClient } from '@insforge/sdk'

export async function POST(req: NextRequest) {
  const insforge = await createClient()

  // Verify caller is admin
  const { data: { user: adminUser } } = await insforge.auth.getCurrentUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await insforge.database
    .from('profiles').select('role').eq('id', adminUser.id).single()
  if (adminProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { full_name, email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  // Sign up the new client using a fresh public client
  const publicClient = createInsforgeClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
  })

  const { data: signUpData, error: signUpError } = await publicClient.auth.signUp({
    email,
    password,
    name: full_name || '',
  })

  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 422 })
  }

  const newUserId = (signUpData as any)?.user?.id ?? (signUpData as any)?.id

  if (!newUserId) {
    return NextResponse.json({ error: 'Account created but could not retrieve user ID. Client may need to log in once.' }, { status: 207 })
  }

  // Use a SECURITY DEFINER function to bypass RLS — the anon-key client cannot
  // update another user's profile row directly.
  await insforge.database.rpc('upsert_client_profile', {
    p_id: newUserId,
    p_email: email,
    p_full_name: full_name || null,
    p_role: 'client',
  })

  return NextResponse.json({ ok: true, user_id: newUserId })
}
