import * as XLSX from 'xlsx'

export interface ExcelBudgetRow {
  vendor_name: string
  category: string
  estimated_amount: number
  actual_amount: number
  frequency: string | null
  due_day: number | null
  due_week: number | null
  payment_account: string | null
  auto_pay: boolean
  status: string
  notes: string | null
  bill_type: 'business' | 'personal'
}

export interface CalendarItem {
  week: number           // 1–4
  vendor: string
  category: string
  amount: number
  account: string | null
  auto_pay: boolean
  due_day: number | null
  notes: string | null
}

export interface ForecastItem {
  vendor: string
  category: string
  m1_budget: number
  m1_projected: number
  m2_budget: number
  m2_projected: number
  m3_budget: number
  m3_projected: number
  frequency: string | null
  notes: string | null
}

export interface ExcelParseResult {
  rows: ExcelBudgetRow[]
  total_estimated: number
  total_actual: number
  biz_count: number
  personal_count: number
  calendarItems: CalendarItem[]
  forecastItems: ForecastItem[]
}

// Column header patterns for the KelliWorks template
const COL_PATTERNS = {
  num:             /^#$/i,
  vendor:          /vendor|description/i,
  category:        /^category$/i,
  budget_amount:   /budget\s*amount/i,
  actual_amount:   /actual\s*amount/i,
  frequency:       /frequency/i,
  due_day:         /due\s*day/i,
  due_week:        /due\s*week/i,
  payment_account: /payment\s*account/i,
  auto_pay:        /auto\s*pay/i,
  status:          /^status$/i,
  notes:           /^notes$/i,
}

// Normalize Excel cell text: collapse line breaks and extra spaces
function normalizeHeader(h: unknown): string {
  return String(h ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i]
    const text = row.map(c => normalizeHeader(c).toLowerCase()).join(' ')
    if (text.includes('budget amount') || text.includes('vendor') || text.includes('category')) {
      return i
    }
  }
  return -1
}

function mapColumns(headerRow: unknown[]): Record<keyof typeof COL_PATTERNS, number> {
  const result = {} as Record<keyof typeof COL_PATTERNS, number>
  for (const [key, pattern] of Object.entries(COL_PATTERNS)) {
    result[key as keyof typeof COL_PATTERNS] = headerRow.findIndex(
      h => pattern.test(normalizeHeader(h))
    )
  }
  return result
}

function isDataRow(row: unknown[], numCol: number): boolean {
  if (numCol === -1) return false
  const val = row[numCol]
  // Data rows have a numeric row number in the first column
  return val !== null && val !== undefined && val !== '' && !isNaN(Number(val))
}

function toNum(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0
  const n = parseFloat(String(val).replace(/[$,\s]/g, ''))
  return isNaN(n) ? 0 : n
}

function toStr(val: unknown): string | null {
  const s = String(val ?? '').trim()
  return s === '' || s === 'null' || s === 'undefined' ? null : s
}

function parseAutoPay(val: unknown): boolean {
  return /^yes$/i.test(String(val ?? '').trim())
}

function parseStatus(val: unknown): string {
  const s = String(val ?? '').trim().toLowerCase()
  if (!s) return 'active'
  if (s === 'cancel' || s === 'cancelled') return 'cancelled'
  if (s === 'pending') return 'pending'
  if (s === 'seasonal') return 'seasonal'
  return 'active'
}

function parseDueDay(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = parseInt(String(val).replace(/\D/g, ''), 10)
  return isNaN(n) || n < 1 || n > 31 ? null : n
}

function parseSheet(ws: XLSX.WorkSheet, billType: 'business' | 'personal'): ExcelBudgetRow[] {
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  if (!raw.length) return []

  const headerRowIdx = findHeaderRow(raw)
  if (headerRowIdx === -1) return []

  const cols = mapColumns(raw[headerRowIdx])
  const dataRows = raw.slice(headerRowIdx + 1)
  const results: ExcelBudgetRow[] = []

  for (const row of dataRows) {
    // Only process rows with a numeric row index (actual data rows)
    if (!isDataRow(row, cols.num)) continue

    const vendor = toStr(row[cols.vendor])
    const category = toStr(row[cols.category])

    // Skip rows with no vendor or budget amount
    if (!vendor && !category) continue
    const estimatedAmount = toNum(row[cols.budget_amount])
    if (estimatedAmount === 0 && !vendor) continue

    results.push({
      vendor_name:     vendor ?? category ?? 'Unknown',
      category:        category ?? 'Uncategorized',
      estimated_amount: estimatedAmount,
      actual_amount:   toNum(row[cols.actual_amount]),
      frequency:       toStr(row[cols.frequency]),
      due_day:         parseDueDay(row[cols.due_day]),
      due_week:        parseDueDay(row[cols.due_week]),
      payment_account: toStr(row[cols.payment_account]),
      auto_pay:        parseAutoPay(row[cols.auto_pay]),
      status:          parseStatus(row[cols.status]),
      notes:           toStr(row[cols.notes]),
      bill_type:       billType,
    })
  }

  return results
}

// ── Payment Calendar sheet parser ─────────────────────────────────────────────

function parseCalendarSheet(ws: XLSX.WorkSheet): CalendarItem[] {
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const items: CalendarItem[] = []
  let currentWeek = 0

  // Find the header row (has "Vendor" and "Budget Amount")
  let headerRowIdx = -1
  for (let i = 0; i < Math.min(raw.length, 15); i++) {
    const text = raw[i].map(c => normalizeHeader(c).toLowerCase()).join(' ')
    if (text.includes('vendor') || text.includes('budget amount') || text.includes('budget')) {
      headerRowIdx = i
      break
    }
  }
  if (headerRowIdx === -1) return []

  const headerRow = raw[headerRowIdx]
  const vendorCol   = headerRow.findIndex(h => /vendor|description/i.test(normalizeHeader(h)))
  const categoryCol = headerRow.findIndex(h => /^category$/i.test(normalizeHeader(h)))
  const amountCol   = headerRow.findIndex(h => /budget\s*(amount)?/i.test(normalizeHeader(h)))
  const accountCol  = headerRow.findIndex(h => /account/i.test(normalizeHeader(h)))
  const autoPayCol  = headerRow.findIndex(h => /auto\s*pay/i.test(normalizeHeader(h)))
  const notesCol    = headerRow.findIndex(h => /^notes$/i.test(normalizeHeader(h)))

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const row = raw[i]
    const rawCell0 = String(row[0] ?? '').trim()
    const cell0 = normalizeHeader(row[0])
    if (!cell0) continue

    // Detect week section headers: "WEEK 1 (Days 1–7)" or "📅 WEEK 1 ..."
    const weekMatch = cell0.match(/WEEK\s+(\d)/i)
    if (weekMatch) {
      currentWeek = parseInt(weekMatch[1], 10)
      continue
    }

    // Skip subtotal / total rows
    if (/subtotal|^\s*total/i.test(cell0)) continue

    // Data rows need an amount (or a vendor name)
    const amount = toNum(row[amountCol >= 0 ? amountCol : 2])
    if (amount === 0 && !cell0) continue

    // Extract "[Day N]" from end of vendor string and use it as due_day
    let vendorName = vendorCol >= 0 ? (toStr(row[vendorCol]) ?? cell0) : cell0
    let due_day: number | null = null
    const dayMatch = vendorName.match(/\[Day\s+(\d+)\]\s*$/i)
    if (dayMatch) {
      due_day = parseInt(dayMatch[1], 10)
      vendorName = vendorName.replace(/\s*\[Day\s+\d+\]\s*$/i, '').trim()
    }

    items.push({
      week:     currentWeek > 0 ? currentWeek : 1,
      vendor:   vendorName || 'Unknown',
      category: categoryCol >= 0 ? (toStr(row[categoryCol]) ?? 'Uncategorized') : 'Uncategorized',
      amount,
      account:  accountCol >= 0 ? toStr(row[accountCol]) : null,
      auto_pay: autoPayCol >= 0 ? parseAutoPay(row[autoPayCol]) : false,
      due_day,
      notes:    notesCol >= 0 ? toStr(row[notesCol]) : null,
    })
  }

  return items
}

// ── Forecast sheet parser ─────────────────────────────────────────────────────

function parseForecastSheet(ws: XLSX.WorkSheet): ForecastItem[] {
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const items: ForecastItem[] = []

  // Find the top header row: has "Vendor / Description" AND "Month 1"
  let topHeaderIdx = -1
  for (let i = 0; i < Math.min(raw.length, 15); i++) {
    const text = raw[i].map(c => normalizeHeader(c).toLowerCase()).join(' ')
    if ((text.includes('month 1') || text.includes('month1')) && text.includes('vendor')) {
      topHeaderIdx = i
      break
    }
  }
  if (topHeaderIdx === -1) return []

  const topRow = raw[topHeaderIdx]

  // Locate column groups from top header
  const vendorCol   = topRow.findIndex(h => /vendor|description/i.test(normalizeHeader(h)))
  const categoryCol = topRow.findIndex(h => /^category$/i.test(normalizeHeader(h)))
  const freqCol     = topRow.findIndex(h => /freq/i.test(normalizeHeader(h)))
  const notesCol    = topRow.findIndex(h => /^notes$/i.test(normalizeHeader(h)))

  // Month columns: "Month 1", "Month 2", "Month 3"
  // Each spans 2 columns: Budget ($) then Projected ($) in the sub-header row
  const m1Col = topRow.findIndex(h => /month\s*1/i.test(normalizeHeader(h)))
  const m2Col = topRow.findIndex(h => /month\s*2/i.test(normalizeHeader(h)))
  const m3Col = topRow.findIndex(h => /month\s*3/i.test(normalizeHeader(h)))

  // Data starts 2 rows after top header (skip the sub-header row "Budget ($) / Projected ($)")
  const dataStart = topHeaderIdx + 2

  for (let i = dataStart; i < raw.length; i++) {
    const row = raw[i]
    const cell0 = normalizeHeader(row[0])
    if (!cell0) continue
    // Skip total rows
    if (/total/i.test(cell0)) continue

    const vendor = vendorCol >= 0 ? (toStr(row[vendorCol]) ?? cell0) : cell0
    const category = categoryCol >= 0 ? (toStr(row[categoryCol]) ?? 'Uncategorized') : 'Uncategorized'

    items.push({
      vendor,
      category,
      m1_budget:    m1Col >= 0 ? toNum(row[m1Col])     : 0,
      m1_projected: m1Col >= 0 ? toNum(row[m1Col + 1]) : 0,
      m2_budget:    m2Col >= 0 ? toNum(row[m2Col])     : 0,
      m2_projected: m2Col >= 0 ? toNum(row[m2Col + 1]) : 0,
      m3_budget:    m3Col >= 0 ? toNum(row[m3Col])     : 0,
      m3_projected: m3Col >= 0 ? toNum(row[m3Col + 1]) : 0,
      frequency:    freqCol >= 0 ? toStr(row[freqCol]) : null,
      notes:        notesCol >= 0 ? toStr(row[notesCol]) : null,
    })
  }

  return items
}

// ── Main export ───────────────────────────────────────────────────────────────

export function parseExcelBudget(buffer: Buffer, budgetType: 'business' | 'personal' | 'both' = 'both'): ExcelParseResult {
  const wb = XLSX.read(buffer, { type: 'buffer' })

  const includeBiz      = budgetType === 'business' || budgetType === 'both'
  const includePersonal = budgetType === 'personal' || budgetType === 'both'

  const bizSheet = includeBiz      ? wb.Sheets['BIZ Budget']      : undefined
  const perSheet = includePersonal ? wb.Sheets['PERSONAL Budget'] : undefined

  if (budgetType === 'business' && !bizSheet) {
    throw new Error('Could not find "BIZ Budget" sheet in the uploaded file. Make sure you are using the KelliWorks budget template.')
  }
  if (budgetType === 'personal' && !perSheet) {
    throw new Error('Could not find "PERSONAL Budget" sheet in the uploaded file. Make sure you are using the KelliWorks budget template.')
  }
  if (!bizSheet && !perSheet) {
    throw new Error('Could not find "BIZ Budget" or "PERSONAL Budget" sheets. Make sure you are uploading the KelliWorks budget template.')
  }

  const bizRows      = bizSheet  ? parseSheet(bizSheet,  'business') : []
  const personalRows = perSheet  ? parseSheet(perSheet, 'personal')  : []
  const rows         = [...bizRows, ...personalRows]

  if (rows.length === 0) {
    throw new Error('No budget lines found. Make sure the template has data rows filled in.')
  }

  const calSheet   = wb.Sheets['Payment Calendar']
  const foreSheet  = wb.Sheets['Forecast']

  const calendarItems = calSheet  ? parseCalendarSheet(calSheet)  : []
  const forecastItems = foreSheet ? parseForecastSheet(foreSheet) : []

  return {
    rows,
    total_estimated: rows.reduce((s, r) => s + r.estimated_amount, 0),
    total_actual:    rows.reduce((s, r) => s + r.actual_amount,    0),
    biz_count:       bizRows.length,
    personal_count:  personalRows.length,
    calendarItems,
    forecastItems,
  }
}
