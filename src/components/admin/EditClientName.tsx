'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X } from 'lucide-react'

interface Props {
  clientId: string
  currentName: string | null
}

export default function EditClientName({ clientId, currentName }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentName ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (value.trim() === (currentName ?? '')) { setEditing(false); return }
    setSaving(true)
    await fetch(`/api/admin/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: value.trim() }),
    })
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  function cancel() {
    setValue(currentName ?? '')
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        title="Edit name"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, color: 'var(--c-slate-400)', fontWeight: 500,
          padding: '3px 6px', borderRadius: 6,
          marginTop: 4,
        }}
      >
        <Pencil size={11} />
        Edit name
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
        placeholder="Full name"
        style={{
          fontSize: 13, fontWeight: 600,
          padding: '5px 10px', borderRadius: 8,
          border: '1px solid var(--c-slate-300)',
          outline: 'none', color: 'var(--c-navy-950)',
          width: 220,
        }}
      />
      <button
        onClick={save}
        disabled={saving}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 7, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
          background: 'var(--c-gold-500)', color: 'white',
        }}
      >
        <Check size={13} />
      </button>
      <button
        onClick={cancel}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 7, border: '1px solid var(--c-slate-200)',
          cursor: 'pointer', background: 'white', color: 'var(--c-slate-500)',
        }}
      >
        <X size={13} />
      </button>
    </div>
  )
}
