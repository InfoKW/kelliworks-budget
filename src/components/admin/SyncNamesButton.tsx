'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export default function SyncNamesButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function sync() {
    setLoading(true)
    setResult(null)
    const res = await fetch('/api/admin/sync-names', { method: 'POST' })
    const json = await res.json()
    setLoading(false)
    if (res.ok) {
      setResult(`${json.updated} name${json.updated !== 1 ? 's' : ''} updated`)
      router.refresh()
    } else {
      setResult(json.error ?? 'Failed')
    }
    setTimeout(() => setResult(null), 4000)
  }

  return (
    <button
      onClick={sync}
      disabled={loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 9, border: '1px solid var(--c-slate-200)',
        background: 'white', cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: 12, fontWeight: 600, color: result?.includes('updated') ? 'var(--c-green-600)' : 'var(--c-slate-600)',
        opacity: loading ? 0.6 : 1, transition: 'all 0.15s',
      }}
    >
      <RefreshCw size={12} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
      {loading ? 'Syncing…' : result ?? 'Sync names from auth'}
    </button>
  )
}
