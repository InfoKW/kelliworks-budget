'use client'

import { useState, useRef, useEffect } from 'react'
import { FileSpreadsheet, CheckCircle2, AlertCircle, Upload } from 'lucide-react'
import { Button, Card, SectionLabel } from '@/components/ui'
import { formatCurrency, getCurrentMonth } from '@/lib/utils'

interface Client { id: string; full_name: string | null; email: string }

interface ImportResult {
  imported: number
  total_estimated: number
  budget_id: string
  biz_count?: number
  personal_count?: number
}

export default function AdminBudgetImport({ clients }: { clients: Client[] }) {
  const [clientId, setClientId] = useState('')
  const [budgetType, setBudgetType] = useState<'business' | 'personal' | ''>('')
  const [month, setMonth] = useState(getCurrentMonth().slice(0, 7))
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Animate progress bar during upload
  useEffect(() => {
    if (loading) {
      setProgress(0)
      let current = 0
      progressRef.current = setInterval(() => {
        // Accelerate quickly to 60%, then slow down, cap at 88%
        const step = current < 60 ? 4 : current < 80 ? 1.5 : 0.4
        current = Math.min(current + step, 88)
        setProgress(current)
      }, 80)
    } else {
      if (progressRef.current) clearInterval(progressRef.current)
      if (progress > 0) {
        setProgress(100)
        setTimeout(() => setProgress(0), 600)
      }
    }
    return () => { if (progressRef.current) clearInterval(progressRef.current) }
  }, [loading])

  function resetState() {
    setResult(null)
    setError(null)
  }

  async function handleExcelImport(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    resetState()
    setLoading(true)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('client_id', clientId)
    fd.append('month', month)
    fd.append('budget_type', budgetType)

    const res = await fetch('/api/admin/budget/import-excel', { method: 'POST', body: fd })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) { setError(json.error ?? 'Import failed'); return }
    setResult(json)
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const selectedClient = clients.find(c => c.id === clientId)

  // Shared fields (client + budget type + month)
  const sharedFields = (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-slate-700)' }}>Client</label>
          <select
            value={clientId}
            onChange={e => { setClientId(e.target.value); resetState() }}
            required
            className="input"
            style={{ cursor: 'pointer' }}
          >
            <option value="">Select a client…</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.full_name ?? c.email} — {c.email}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-slate-700)' }}>Budget Type</label>
          <select
            value={budgetType}
            onChange={e => { setBudgetType(e.target.value as typeof budgetType); resetState() }}
            required
            className="input"
            style={{ cursor: 'pointer' }}
          >
            <option value="">Select type…</option>
            <option value="personal">Personal Budget</option>
            <option value="business">Business Budget</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-slate-700)' }}>Budget Month</label>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          required
          className="input"
        />
      </div>
    </>
  )

  const feedback = (
    <>
      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 14px', borderRadius: 10,
          background: '#fef2f2', border: '1px solid #fecaca',
          fontSize: 13, color: '#991b1b',
        }}>
          <AlertCircle size={15} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      {result && (
        <div style={{ padding: '14px 16px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                {result.imported} line{result.imported !== 1 ? 's' : ''} imported for{' '}
                <strong>{selectedClient?.full_name ?? selectedClient?.email}</strong>
              </p>
              {result.biz_count !== undefined && (
                <p style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>
                  {result.biz_count} business · {result.personal_count} personal
                </p>
              )}
              <p style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>
                Total estimated: {formatCurrency(result.total_estimated)}
              </p>
            </div>
          </div>
          <a
            href={`/admin/clients/${clientId}/budget?month=${month}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12,
              fontSize: 13, fontWeight: 600, color: '#166534', textDecoration: 'none',
              background: 'rgba(22,163,74,0.1)', border: '1px solid #bbf7d0',
              padding: '7px 14px', borderRadius: 8,
            }}
          >
            Preview full budget →
          </a>
        </div>
      )}
    </>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card padding={28} accent>
        <form onSubmit={handleExcelImport} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <SectionLabel style={{ marginBottom: 4 }}>KelliWorks Budget Template (.xlsx)</SectionLabel>
          {sharedFields}

          {/* File picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-slate-700)' }}>Budget File</label>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
              border: `2px dashed ${file ? 'var(--c-gold-400)' : 'var(--c-slate-300)'}`,
              background: file ? 'rgba(212,160,23,0.04)' : 'var(--c-slate-50)',
              transition: 'all 0.15s',
            }}>
              <FileSpreadsheet size={20} color={file ? 'var(--c-gold-500)' : 'var(--c-slate-400)'} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {file ? (
                  <>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-navy-950)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--c-slate-400)', marginTop: 2 }}>{(file.size / 1024).toFixed(1)} KB</p>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--c-slate-500)' }}>Click to choose .xlsx file</p>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={e => { setFile(e.target.files?.[0] ?? null); resetState() }}
              />
            </label>
          </div>

          {feedback}

          {loading ? (
            <div style={{ position: 'relative', height: 44, borderRadius: 10, overflow: 'hidden', background: 'rgba(184,134,11,0.15)' }}>
              <div style={{
                position: 'absolute', inset: 0, width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--c-gold-600), var(--c-gold-400))',
                transition: 'width 0.15s ease-out',
                borderRadius: 10,
              }} />
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-navy-950)', zIndex: 1 }}>
                  Importing… {Math.round(progress)}%
                </span>
              </div>
            </div>
          ) : (
            <Button type="submit" variant="gold" size="md" disabled={!clientId || !file || !budgetType}>
              <Upload size={14} />
              Import Budget
            </Button>
          )}
        </form>
      </Card>

      {/* Format note */}
      <div style={{ padding: '14px 18px', borderRadius: 10, background: 'var(--c-slate-100)', border: '1px solid var(--c-slate-200)', fontSize: 12, color: 'var(--c-slate-500)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--c-slate-700)' }}>Use the KelliWorks Budget Template.</strong>
        {' '}Select <em>Personal Budget</em> to import the <code>PERSONAL Budget</code> sheet, or <em>Business Budget</em> to import the <code>BIZ Budget</code> sheet.
      </div>
    </div>
  )
}
