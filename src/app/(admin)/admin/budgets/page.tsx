'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentMonth } from '@/lib/utils'
import AdminBudgetImport from '@/components/budget/AdminBudgetImport'
import { SectionLabel } from '@/components/ui'
import { FileSpreadsheet, PenLine } from 'lucide-react'

interface Profile { id: string; full_name: string | null; email: string }
interface BudgetLine { id?: string; category: string; description: string; estimated_amount: number; due_day: number | null }

export default function AdminBudgetsPage() {
  const [clients, setClients] = useState<Profile[]>([])
  const [tab, setTab] = useState<'sheet' | 'manual'>('sheet')

  // Manual editor state
  const [selectedClientId, setSelectedClientId] = useState('')
  const [month, setMonth] = useState(getCurrentMonth().slice(0, 7))
  const [lines, setLines] = useState<BudgetLine[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const insforge = createClient()
    insforge.database.from('profiles').select('id, full_name, email').in('role', ['client', 'admin']).order('full_name', { ascending: true }).then(({ data }) => {
      setClients(data ?? [])
    })
  }, [])

  useEffect(() => {
    if (!selectedClientId) return
    const insforge = createClient()
    const fullMonth = month + '-01'
    insforge.database.from('budgets').select('*').eq('user_id', selectedClientId).eq('month', fullMonth).single().then(({ data: budget }) => {
      if (budget) {
        setNotes(budget.notes ?? '')
        insforge.database.from('budget_lines').select('*').eq('budget_id', budget.id).then(({ data: bl }) => {
          setLines((bl ?? []).map((l: BudgetLine & { id: string }) => ({
            id: l.id,
            category: l.category,
            description: l.description ?? '',
            estimated_amount: l.estimated_amount,
            due_day: l.due_day,
          })))
        })
      } else {
        setLines([])
        setNotes('')
      }
    })
  }, [selectedClientId, month])

  function addLine() {
    setLines(prev => [...prev, { category: '', description: '', estimated_amount: 0, due_day: null }])
  }
  function updateLine(i: number, field: keyof BudgetLine, value: string | number | null) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }
  function removeLine(i: number) {
    setLines(prev => prev.filter((_, idx) => idx !== i))
  }

  async function save() {
    if (!selectedClientId) return
    setSaving(true)
    const insforge = createClient()
    const fullMonth = month + '-01'
    const total = lines.reduce((s, l) => s + Number(l.estimated_amount), 0)
    const { data: { user } } = await insforge.auth.getCurrentUser()

    const { data: existing } = await insforge.database
      .from('budgets').select('id').eq('user_id', selectedClientId).eq('month', fullMonth).single()

    let budgetId: string
    if (existing) {
      await insforge.database.from('budgets').update({ total_estimated: total, notes }).eq('id', existing.id)
      budgetId = existing.id
    } else {
      const { data: created } = await insforge.database
        .from('budgets')
        .insert([{ user_id: selectedClientId, month: fullMonth, total_estimated: total, notes, created_by: user!.id }])
        .select('id').single()
      budgetId = created!.id
    }

    await insforge.database.from('budget_lines').delete().eq('budget_id', budgetId)
    for (const line of lines) {
      await insforge.database.from('budget_lines').insert([{
        budget_id: budgetId, user_id: selectedClientId,
        category: line.category, description: line.description || null,
        estimated_amount: Number(line.estimated_amount), actual_amount: 0,
        status: 'pending', due_day: line.due_day ? Number(line.due_day) : null,
      }])
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif', marginBottom: 8 }}>
        Budget Editor
      </h2>
      <p style={{ fontSize: 13, color: 'var(--c-slate-500)', marginBottom: 28 }}>
        Upload a client's budget via Google Sheet or enter it manually.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'var(--c-slate-100)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {([
          { id: 'sheet',  label: 'Import from Sheet', icon: FileSpreadsheet },
          { id: 'manual', label: 'Manual Entry',       icon: PenLine },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              background: tab === id ? 'white' : 'transparent',
              color: tab === id ? 'var(--c-navy-950)' : 'var(--c-slate-500)',
              boxShadow: tab === id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Sheet Import Tab */}
      {tab === 'sheet' && <AdminBudgetImport clients={clients} />}

      {/* Manual Entry Tab */}
      {tab === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="input"
              style={{ maxWidth: 280, cursor: 'pointer' }}
            >
              <option value="">Select client…</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.full_name ?? c.email}</option>
              ))}
            </select>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="input"
              style={{ maxWidth: 180 }}
            />
          </div>

          {selectedClientId && (
            <div className="rounded-xl border border-slate-700 p-6" style={{ background: 'var(--slate-800)' }}>
              <SectionLabel style={{ marginBottom: 16 }}>Budget Lines</SectionLabel>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {lines.map((line, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 3fr 2fr 1.5fr auto', gap: 8, alignItems: 'center' }}>
                    <input
                      placeholder="Category"
                      value={line.category}
                      onChange={e => updateLine(i, 'category', e.target.value)}
                      className="input"
                      style={{ fontSize: 13, padding: '9px 12px' }}
                    />
                    <input
                      placeholder="Description"
                      value={line.description}
                      onChange={e => updateLine(i, 'description', e.target.value)}
                      className="input"
                      style={{ fontSize: 13, padding: '9px 12px' }}
                    />
                    <input
                      type="number"
                      placeholder="Estimated $"
                      value={line.estimated_amount}
                      onChange={e => updateLine(i, 'estimated_amount', e.target.value)}
                      className="input"
                      style={{ fontSize: 13, padding: '9px 12px' }}
                    />
                    <input
                      type="number"
                      placeholder="Due day"
                      value={line.due_day ?? ''}
                      onChange={e => updateLine(i, 'due_day', e.target.value ? Number(e.target.value) : null)}
                      className="input"
                      style={{ fontSize: 13, padding: '9px 12px' }}
                    />
                    <button onClick={() => removeLine(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#f87171', lineHeight: 1, padding: '0 4px' }}>×</button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={addLine}
                  className="btn btn-outline"
                  style={{ fontSize: 13 }}
                >
                  + Add Line
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="btn btn-gold"
                  style={{ fontSize: 13, opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Budget'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
