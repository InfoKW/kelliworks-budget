'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentMonth } from '@/lib/utils'

interface Profile { id: string; full_name: string | null; email: string }
interface BudgetLine { id?: string; category: string; description: string; estimated_amount: number; due_day: number | null }

export default function AdminBudgetsPage() {
  const [clients, setClients] = useState<Profile[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [month, setMonth] = useState(getCurrentMonth().slice(0, 7))
  const [lines, setLines] = useState<BudgetLine[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const insforge = createClient()
    insforge.database.from('profiles').select('id, full_name, email').eq('role', 'client').then(({ data }) => {
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
      .from('budgets')
      .select('id')
      .eq('user_id', selectedClientId)
      .eq('month', fullMonth)
      .single()

    let budgetId: string
    if (existing) {
      await insforge.database.from('budgets').update({ total_estimated: total, notes }).eq('id', existing.id)
      budgetId = existing.id
    } else {
      const { data: created } = await insforge.database
        .from('budgets')
        .insert([{ user_id: selectedClientId, month: fullMonth, total_estimated: total, notes, created_by: user!.id }])
        .select('id')
        .single()
      budgetId = created!.id
    }

    // Delete and re-insert lines
    await insforge.database.from('budget_lines').delete().eq('budget_id', budgetId)
    for (const line of lines) {
      await insforge.database.from('budget_lines').insert([{
        budget_id: budgetId,
        user_id: selectedClientId,
        category: line.category,
        description: line.description || null,
        estimated_amount: Number(line.estimated_amount),
        actual_amount: 0,
        status: 'pending',
        due_day: line.due_day ? Number(line.due_day) : null,
      }])
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
        Budget Editor
      </h2>

      <div className="flex gap-4">
        <select
          value={selectedClientId}
          onChange={e => setSelectedClientId(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white text-sm"
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
          className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white text-sm"
        />
      </div>

      {selectedClientId && (
        <div className="rounded-xl border border-slate-700 p-6" style={{ background: 'var(--slate-800)' }}>
          <div className="space-y-3 mb-4">
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  placeholder="Category"
                  value={line.category}
                  onChange={e => updateLine(i, 'category', e.target.value)}
                  className="col-span-3 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white"
                />
                <input
                  placeholder="Description"
                  value={line.description}
                  onChange={e => updateLine(i, 'description', e.target.value)}
                  className="col-span-3 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white"
                />
                <input
                  type="number"
                  placeholder="Estimated $"
                  value={line.estimated_amount}
                  onChange={e => updateLine(i, 'estimated_amount', e.target.value)}
                  className="col-span-3 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white"
                />
                <input
                  type="number"
                  placeholder="Due day"
                  value={line.due_day ?? ''}
                  onChange={e => updateLine(i, 'due_day', e.target.value ? Number(e.target.value) : null)}
                  className="col-span-2 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white"
                />
                <button onClick={() => removeLine(i)} className="col-span-1 text-red-400 hover:text-red-300 text-lg">×</button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={addLine}
              className="text-sm px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white transition-all"
            >
              + Add Line
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="text-sm px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
              style={{ background: 'var(--gold-500)', color: 'var(--navy-950)' }}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Budget'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
