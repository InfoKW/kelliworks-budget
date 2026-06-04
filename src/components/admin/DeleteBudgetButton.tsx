'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

interface Props {
  budgetId: string
  clientId: string
}

export default function DeleteBudgetButton({ budgetId, clientId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this budget? All lines will be permanently removed.')) return
    setLoading(true)

    const res = await fetch(`/api/admin/budget/${budgetId}`, { method: 'DELETE' })
    setLoading(false)

    if (res.ok) {
      router.push(`/admin/clients/${clientId}`)
      router.refresh()
    } else {
      const json = await res.json()
      alert(json.error ?? 'Failed to delete budget.')
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Delete budget"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 38, height: 38, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
        background: loading ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)',
        color: 'var(--c-red-500)',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.18)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = loading ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)' }}
    >
      <Trash2 size={16} />
    </button>
  )
}
