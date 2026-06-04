export interface SheetRow {
  category: string
  description: string | null
  estimated: number
  actual: number
  status: 'paid' | 'partial' | 'overdue' | 'pending'
  dueDay: number | null
  dueWeek: number | null
  frequency: string | null
  paymentAccount: string | null
  autoPay: boolean
  billType: 'business' | 'personal'
}

export interface SheetParseResult {
  rows: SheetRow[]
  detectedColumns: Record<string, string>
  totalEstimated: number
  totalActual: number
  sheetId: string
}

// ── URL helpers ────────────────────────────────────────────────

export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match?.[1] ?? null
}

export function extractGid(url: string): string | null {
  const hashMatch = url.match(/[#&]gid=(\d+)/)
  const paramMatch = url.match(/[?&]gid=(\d+)/)
  return (hashMatch ?? paramMatch)?.[1] ?? null
}

export function buildCsvUrl(sheetId: string, gid?: string | null): string {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
  return gid ? `${base}&gid=${gid}` : base
}

// ── CSV parser ─────────────────────────────────────────────────

function parseCsv(raw: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    const next = raw[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++ }
      else if (ch === '"')            { inQuotes = false }
      else                            { field += ch }
    } else {
      if      (ch === '"')              { inQuotes = true }
      else if (ch === ',')              { row.push(field.trim()); field = '' }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++
        row.push(field.trim())
        if (row.some(c => c !== '')) rows.push(row)
        row = []; field = ''
      }
      else { field += ch }
    }
  }
  // last row
  row.push(field.trim())
  if (row.some(c => c !== '')) rows.push(row)

  return rows
}

// ── Column auto-detect ─────────────────────────────────────────

const PATTERNS: Record<string, RegExp> = {
  category:       /^(category|name|item|expense|label|line)/i,
  description:    /^(description|vendor|memo|detail|comment)/i,
  estimated:      /^(estimated?|budget(ed)?|planned|limit|est\.?)/i,
  actual:         /^(actual|spent|paid|amount|total|act\.?)/i,
  status:         /^(status|state|flag)/i,
  dueDay:         /^(due[\s_-]?day|due[\s_-]?date|day|date)/i,
  dueWeek:        /^(due[\s_-]?week|week)/i,
  frequency:      /^(frequency|freq|recurrence|how\s*often)/i,
  paymentAccount: /^(payment[\s_-]?account|account|pay\s*from|card|bank)/i,
  autoPay:        /^(auto[\s_-]?pay|automatic|autopay)/i,
  billType:       /^(bill[\s_-]?type|type|biz|business|personal|category[\s_-]?type)/i,
}

function findColumn(headers: string[], key: keyof typeof PATTERNS): number {
  return headers.findIndex(h => PATTERNS[key].test(h.trim()))
}

function parseNumber(v: string): number {
  const clean = v.replace(/[$,\s]/g, '')
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

function parseDay(raw: string): number | null {
  const n = parseInt(raw.replace(/\D/g, ''), 10)
  return isNaN(n) || n < 1 ? null : n
}

function parseFrequency(raw: string): string | null {
  const v = raw.trim().toLowerCase()
  if (!v) return null
  if (/weekly|week/i.test(v))   return 'Weekly'
  if (/monthly|month/i.test(v)) return 'Monthly'
  if (/annual|yearly|year/i.test(v)) return 'Annual'
  if (/quarterly|quarter/i.test(v)) return 'Quarterly'
  return raw.trim() || null
}

function inferStatus(raw: string, estimated: number, actual: number): SheetRow['status'] {
  const v = raw.trim().toLowerCase()
  if (!v || v === 'pending' || v === 'unpaid')  return 'pending'
  if (v === 'paid' || v === 'complete' || v === 'done' || v === 'yes') return 'paid'
  if (v === 'partial' || v === 'partially paid') return 'partial'
  if (v === 'overdue' || v === 'late' || v === 'missed') return 'overdue'
  // infer from amounts
  if (actual >= estimated && estimated > 0) return 'paid'
  if (actual > 0 && actual < estimated)     return 'partial'
  return 'pending'
}

// ── Main entry ─────────────────────────────────────────────────

export async function fetchAndParseSheet(sheetUrl: string): Promise<SheetParseResult> {
  const sheetId = extractSheetId(sheetUrl)
  if (!sheetId) throw new Error('Invalid Google Sheets URL')

  const gid = extractGid(sheetUrl)
  const csvUrl = buildCsvUrl(sheetId, gid)

  const res = await fetch(csvUrl, { cache: 'no-store' })

  if (!res.ok) {
    throw new Error('Could not fetch the sheet. Make sure it is shared as "Anyone with the link → Viewer".')
  }

  const text = await res.text()

  // Detect login redirect (sheet is private)
  if (text.includes('accounts.google.com') || text.includes('<html') || text.includes('<!DOCTYPE')) {
    throw new Error('Sheet is private. Please set sharing to "Anyone with the link → Viewer" and try again.')
  }

  const allRows = parseCsv(text)
  if (allRows.length < 2) throw new Error('Sheet appears empty or has no data rows.')

  const headers = allRows[0]
  const dataRows = allRows.slice(1)

  const colIdx = {
    category:       findColumn(headers, 'category'),
    description:    findColumn(headers, 'description'),
    estimated:      findColumn(headers, 'estimated'),
    actual:         findColumn(headers, 'actual'),
    status:         findColumn(headers, 'status'),
    dueDay:         findColumn(headers, 'dueDay'),
    dueWeek:        findColumn(headers, 'dueWeek'),
    frequency:      findColumn(headers, 'frequency'),
    paymentAccount: findColumn(headers, 'paymentAccount'),
    autoPay:        findColumn(headers, 'autoPay'),
    billType:       findColumn(headers, 'billType'),
  }

  // Need at least category + one amount column
  if (colIdx.category === -1) {
    throw new Error('Could not find a "Category" or "Name" column. Please ensure your sheet has a column named Category.')
  }
  if (colIdx.estimated === -1 && colIdx.actual === -1) {
    throw new Error('Could not find an amount column. Please add a column named "Estimated" or "Actual".')
  }

  const detectedColumns: Record<string, string> = {}
  for (const [key, idx] of Object.entries(colIdx)) {
    if (idx !== -1) detectedColumns[key] = headers[idx]
  }

  const rows: SheetRow[] = dataRows
    .map(row => {
      const category = row[colIdx.category]?.trim()
      if (!category) return null

      const estimated = colIdx.estimated !== -1 ? parseNumber(row[colIdx.estimated] ?? '') : 0
      const actual    = colIdx.actual    !== -1 ? parseNumber(row[colIdx.actual]    ?? '') : 0

      // Skip rows that look like section headers or totals (no numeric amount and short text)
      if (estimated === 0 && actual === 0 && category.length < 50) {
        const lc = category.toLowerCase()
        if (lc.includes('total') || lc.includes('subtotal') || lc === category.toUpperCase()) return null
      }

      const rawStatus    = colIdx.status         !== -1 ? (row[colIdx.status]         ?? '') : ''
      const rawDueDay    = colIdx.dueDay          !== -1 ? (row[colIdx.dueDay]         ?? '') : ''
      const rawDueWeek   = colIdx.dueWeek         !== -1 ? (row[colIdx.dueWeek]        ?? '') : ''
      const rawFreq      = colIdx.frequency       !== -1 ? (row[colIdx.frequency]      ?? '') : ''
      const rawAccount   = colIdx.paymentAccount  !== -1 ? (row[colIdx.paymentAccount] ?? '') : ''
      const rawAutoPay   = colIdx.autoPay         !== -1 ? (row[colIdx.autoPay]        ?? '') : ''
      const rawBillType  = colIdx.billType        !== -1 ? (row[colIdx.billType]       ?? '') : ''

      const billType = /biz|business/i.test(rawBillType) ? 'business' : 'personal'

      return {
        category,
        description: colIdx.description !== -1 ? (row[colIdx.description]?.trim() || null) : null,
        estimated,
        actual,
        status:         inferStatus(rawStatus, estimated, actual),
        dueDay:         parseDay(rawDueDay),
        dueWeek:        parseDay(rawDueWeek),
        frequency:      parseFrequency(rawFreq),
        paymentAccount: rawAccount.trim() || null,
        autoPay:        /^yes$/i.test(rawAutoPay.trim()),
        billType,
      } satisfies SheetRow
    })
    .filter(Boolean) as SheetRow[]

  const totalEstimated = rows.reduce((s, r) => s + r.estimated, 0)
  const totalActual    = rows.reduce((s, r) => s + r.actual, 0)

  return { rows, detectedColumns, totalEstimated, totalActual, sheetId }
}
