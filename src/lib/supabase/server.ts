import { createClient as createInsforgeClient } from '@insforge/sdk'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('insforge_access_token')?.value
  
  console.log('Server createClient: sessionToken found?', !!sessionToken)

  return createInsforgeClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    isServerMode: true,
    edgeFunctionToken: sessionToken,
    headers: {
      'Cookie': cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; '),
    },
  })
}
