'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminBudgetImport from '@/components/budget/AdminBudgetImport'

interface Profile { id: string; full_name: string | null; email: string }

export default function AdminBudgetsPage() {
  const [clients, setClients] = useState<Profile[]>([])

  useEffect(() => {
    const insforge = createClient()
    insforge.database.from('profiles').select('id, full_name, email').in('role', ['client', 'admin']).order('full_name', { ascending: true }).then(({ data }) => {
      setClients(data ?? [])
    })
  }, [])

  return (
    <div style={{ maxWidth: 760 }}>
      <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif', marginBottom: 8 }}>
        Budget Editor
      </h2>
      <p style={{ fontSize: 13, color: 'var(--c-slate-500)', marginBottom: 28 }}>
        Upload a client's budget by importing an Excel file.
      </p>
      <AdminBudgetImport clients={clients} />
    </div>
  )
}
