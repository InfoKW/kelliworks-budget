# KelliWorks Budget Dashboard — Product Requirements Document

**Version:** 1.0
**Last Updated:** June 2026
**Product:** KelliWorks Client Budget Portal
**Audience:** Developers inheriting or extending this codebase

---

## 1. Product Overview

KelliWorks Budget Dashboard is a private, advisor-managed financial portal built for KelliWorks clients. It is **not a self-serve consumer product** — clients are onboarded by the KelliWorks admin team, who upload monthly budgets prepared outside the system (via the KelliWorks Excel budget template). Clients log in to review their budget, track spending, acknowledge alerts, and view financial insights.

The system bridges two workflows:

1. **Admin workflow** — Kelli (or team) prepares a budget in Excel, uploads it to the portal, and monitors client spending/alerts.
2. **Client workflow** — Client logs in to see their budget, connected bank transactions, alerts, subscriptions, goals, and trends.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js App Router (v16.2.4) — uses Server + Client Components |
| Language | TypeScript |
| Database / Auth / BaaS | Insforge (`@insforge/sdk`) — Supabase-compatible API |
| Bank integration | Plaid (Link, transactions sync) |
| Payments | Stripe (webhooks, subscription status) |
| Excel parsing | SheetJS (`xlsx`) — server-side |
| Google Sheets parsing | Custom `src/lib/sheets/parser.ts` |
| Animations | Framer Motion |
| Charts | Recharts (AreaChart, PieChart) |
| Icons | Lucide React |
| Deployment | Vercel (assumed) |
| Styling | CSS variables + inline styles (no Tailwind for component styling — admin uses Tailwind class names for some text utilities only) |

**Important:** This project uses `@insforge/sdk`, not the standard `@supabase/supabase-js`. The API surface is Supabase-compatible but the dashboard and migration runner are at `https://insforge.dev/dashboard/project/27694133-76cb-43d6-a372-40a8d4db7511`. All SQL migrations must be run there, not via the Supabase CLI.

---

## 3. User Types

### 3.1 Admin (`role = 'admin'`)

A KelliWorks team member. There is currently one admin (Kelli). Admins:

- Access the `/admin/*` route group
- Create and manage client accounts
- Upload monthly budgets (Excel or manual entry)
- View all client data, alerts, transactions, and budgets
- Delete budgets and client accounts
- See a system-wide alert feed

**Admin does not have a separate auth system.** They log in via the same `/login` page. Their `role` field in `profiles` is `'admin'`. Middleware enforces access to `/admin/*` based on role.

### 3.2 Client (`role = 'client'`)

An end client of KelliWorks. Clients:

- Access the `/(client)/*` route group
- View their own budget, transactions, alerts, goals, subscriptions, recurring expenses, and trends
- Connect their bank accounts via Plaid
- Acknowledge alerts
- Cannot upload or edit their own budget (read-only on budget data)

---

## 4. Authentication

- Built on Insforge Auth (Supabase-compatible magic link / email + password)
- Login page: `/login` — animated shader background, email/password form
- Password reset: `/reset-password`
- Auth callback: `/auth/callback` — handles OAuth/magic link redirects
- A database trigger (`handle_new_user`) auto-creates a `profiles` row on signup with `role = 'client'`
- Row Level Security (RLS) enforces that clients only see their own data; admins see all data
- Sessions are managed by the Insforge SDK middleware (`src/lib/supabase/middleware.ts`)

---

## 5. Database Schema

All tables live in the `public` schema on Insforge. RLS is enabled on every table.

### Core Tables

#### `profiles`
Extends `auth.users`. One row per user.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | References `auth.users(id)` |
| `full_name` | text | Nullable |
| `email` | text | Unique |
| `role` | text | `'client'` or `'admin'` |
| `stripe_customer_id` | text | Nullable |
| `subscription_status` | text | `active / inactive / past_due / canceled` |
| `created_at` | timestamptz | |

#### `budgets`
One row per client per month. Unique constraint on `(user_id, month)`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `profiles` |
| `month` | date | Always stored as `YYYY-MM-01` (first of month) |
| `total_estimated` | numeric(12,2) | Sum of all line estimated amounts |
| `notes` | text | JSON string: `{ source, calendarItems, forecastItems }` |
| `created_by` | uuid | FK → `profiles` (admin who uploaded) |
| `created_at` | timestamptz | |

**`budgets.notes` format (after Excel import):**
```json
{
  "source": "Imported from Excel: filename.xlsx",
  "calendarItems": [ ...CalendarItem[] ],
  "forecastItems":  [ ...ForecastItem[] ]
}
```

#### `budget_lines`
Individual line items within a budget. Cascade deletes when budget is deleted.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `budget_id` | uuid | FK → `budgets` (cascade delete) |
| `user_id` | uuid | FK → `profiles` |
| `category` | text | e.g. "Software & Subscriptions" |
| `description` | text | Vendor name |
| `estimated_amount` | numeric(12,2) | |
| `actual_amount` | numeric(12,2) | Default 0; updated by transaction matcher |
| `status` | text | `pending / paid / partial / overdue` (DB CHECK constraint) |
| `due_day` | int | Day of month (1–31), nullable |
| `paid_date` | date | Set by matcher when matched |
| `notes` | text | JSON string (see below) |
| `created_at` | timestamptz | |

**`budget_lines.notes` format:**
```json
{
  "bill_type": "business" | "personal",
  "frequency": "Monthly" | "Annual" | "Weekly" | null,
  "payment_account": "Business Card" | null,
  "auto_pay": true | false,
  "due_week": 1 | 2 | 3 | 4 | null,
  "original_status": "active" | "cancelled" | "seasonal",
  "original_notes": "string or null"
}
```

The `status` column in the DB is always `pending` on import (the DB CHECK constraint only allows `pending / paid / partial / overdue`). The original Excel status (e.g. `active`, `cancelled`, `seasonal`) is preserved in `notes.original_status` and displayed in the UI as `display_status`.

#### `transactions`
Raw bank transactions pulled from Plaid. One row per transaction.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `profiles` |
| `plaid_transaction_id` | text | Unique — prevents duplicate imports |
| `account_id` | text | Plaid account ID |
| `amount` | numeric(12,2) | Always positive (abs value stored) |
| `date` | date | Transaction date |
| `name` | text | Transaction name from Plaid |
| `merchant_name` | text | Nullable |
| `category` | text[] | Plaid personal finance category |
| `budget_line_id` | uuid | FK → `budget_lines` — set when matched |
| `is_matched` | boolean | True after fuzzy matching succeeds |
| `is_untracked` | boolean | True when no budget line match found |
| `created_at` | timestamptz | |

#### `alerts`
Flags issued to clients based on transaction analysis.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `profiles` |
| `transaction_id` | uuid | FK → `transactions`, nullable |
| `budget_line_id` | uuid | FK → `budget_lines`, nullable |
| `severity` | text | `yellow` or `red` |
| `type` | text | See alert types below |
| `title` | text | Short alert title |
| `description` | text | Detail message |
| `amount` | numeric(12,2) | Transaction amount, nullable |
| `status` | text | `pending / acknowledged / resolved / escalated` |
| `acknowledged_at` | timestamptz | |
| `acknowledged_by` | uuid | FK → `profiles` |
| `created_at` | timestamptz | |

**Alert types:** `untracked_expense`, `over_budget`, `large_transaction`, `duplicate_payment`, `missed_payment`, `unusual_merchant`

#### `plaid_items`
One row per connected bank institution per user.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `profiles` |
| `access_token` | text | Plaid access token (encrypted at rest by Plaid) |
| `item_id` | text | Plaid item ID |
| `institution_name` | text | Bank name |
| `cursor` | text | Plaid sync cursor for incremental sync |
| `last_synced_at` | timestamptz | |

### Session 2 Tables (schema exists, UI partially built)

These tables have full schema and RLS but their UI pages are in early/placeholder state:

- **`recurring_expenses`** + **`recurring_expense_history`** — fixed monthly bills, optional Plaid-auto-detection
- **`monthly_summaries`** — pre-computed income/expense roll-ups per month
- **`trend_insights`** — AI-generated trend flags
- **`subscriptions`** + **`subscription_audits`** — subscription management with keep/cancel workflow
- **`income_sources`** — tracked income streams per client
- **`savings_goals`** + **`goal_contributions`** — goal tracking with contribution history

---

## 6. Admin Features

### 6.1 Admin Layout (`/admin/*`)

Route: `src/app/(admin)/layout.tsx`

All `/admin` pages share a side navigation. Middleware enforces `role = 'admin'` — non-admins are redirected.

### 6.2 Admin Dashboard (`/admin`)

Route: `src/app/(admin)/admin/page.tsx`

Overview stats across all clients: total clients, active budgets, pending alerts, connected banks.

### 6.3 Client List (`/admin/clients`)

Route: `src/app/(admin)/admin/clients/page.tsx`

Table of all clients with name, email, subscription status, and alert count. Link to each client's detail page.

**Add Client:** Modal form (`AddClientModal`) that calls `POST /api/admin/clients` — creates a new user via Insforge Auth invite.

### 6.4 Client Detail (`/admin/clients/[id]`)

Route: `src/app/(admin)/admin/clients/[id]/page.tsx`

Shows for a single client:
- Stat cards: subscription status, open alert count, current month budget total, number of banks connected
- Budget progress bar for current month
- Budget lines list (current month)
- Open alerts list
- Recent 20 transactions table (Date, Name, Amount, Match Status)
- Buttons: "View Budget →", "Upload Budget →", "Delete Client" (modal confirmation)

**Delete Client:** `DeleteClientModal` → `DELETE /api/admin/clients/[id]` — deletes the profile and cascades all related data.

### 6.5 Budget Editor (`/admin/budgets`)

Route: `src/app/(admin)/admin/budgets/page.tsx`

Two tabs:

#### Tab A — Import from Sheet (Excel)
Component: `AdminBudgetImport`

1. Admin selects a client and a month
2. Uploads the KelliWorks Excel budget template (`.xlsx` or `.xls`)
3. During upload: the Import button morphs into an animated gold progress bar showing upload percentage
4. On success: shows imported line counts (BIZ + Personal) and a "Preview Full Budget →" link to `/(admin)/admin/clients/[id]/budget?month=YYYY-MM-DD`

**API:** `POST /api/admin/budget/import-excel`

The parser (`src/lib/excel/parser.ts`) reads three sheets from the Excel file:
- **`BIZ Budget`** — business expense lines
- **`PERSONAL Budget`** — personal expense lines
- **`Payment Calendar`** — curated weekly payment schedule (stored in `budget.notes.calendarItems`)
- **`Forecast`** — 3-month forward budget (stored in `budget.notes.forecastItems`)

If a budget already exists for that client + month, it is **replaced** (old lines deleted, new ones inserted). The `budgets.notes` field is updated with fresh calendar/forecast JSON.

#### Tab B — Manual Entry
Admin selects a client, picks a month, then adds budget lines manually (Category, Description, Estimated Amount, Due Day). Saves via upsert to `budgets` + `budget_lines`.

Note: Manual entry does **not** populate `budget.notes` with calendar/forecast data. Those tabs will show "Re-upload to populate" when viewing a manually-entered budget.

#### Google Sheets Import (legacy)
API: `POST /api/admin/budget/import` — parses a Google Sheets export. Uses `src/lib/sheets/parser.ts`. Still functional but Excel import is the primary path.

### 6.6 Budget Preview (`/admin/clients/[id]/budget`)

Route: `src/app/(admin)/admin/clients/[id]/budget/page.tsx`

Admin view of a client's budget for a selected month. Uses the same `BudgetBreakdown` component as the client view. Has a red trash icon button (Delete Budget) in the header — calls `DELETE /api/admin/budget/[budgetId]`, which deletes the budget and all lines (cascade).

Month selector (`?month=YYYY-MM-DD`) lets admin navigate between months.

### 6.7 Alerts (`/admin/alerts`)

Route: `src/app/(admin)/admin/alerts/page.tsx`

System-wide view of all **pending** alerts across all clients. Sorted by severity (red first), then by date. Each card shows: severity badge, client name, alert title, description, and amount.

---

## 7. Client Features

### 7.1 Client Layout (`/(client)/*`)

Route: `src/app/(client)/layout.tsx`

All client pages share a side navigation (`ClientNav`). Middleware enforces authentication — unauthenticated users are redirected to `/login`.

Navigation items:
- Dashboard
- Budget
- Transactions
- Alerts
- Connectors (bank linking)
- Subscriptions
- Fixed Expenses (Recurring)
- Goals
- Trends
- Kelly AI *(placeholder — coming soon)*
- Settings

### 7.2 Client Dashboard (`/dashboard`)

Route: `src/app/(client)/dashboard/page.tsx`

Month-aware (month selector in header). Shows:

- **Header card:** Month label, total spent vs total estimated, month selector
- **Alert banner:** If there are red or yellow pending alerts, shows counts with link to Alerts page
- **Budget Progress bar:** Visual spend percentage
- **Budget Line Items:** Each line item card (category, due day, actual vs estimated, progress bar, status badge)
- **Untracked Expenses sidebar:** Transactions that didn't match any budget line
- **Quick Insight card:** "X budget lines tracked. You're well within budget / close to your limit"

### 7.3 Budget Tool (`/budget`)

Route: `src/app/(client)/budget/page.tsx`

The most feature-rich page. Month-aware via `?month=YYYY-MM-DD` query param. Shows a Plaid connection status banner if no bank is connected.

Uses the `BudgetBreakdown` component (`src/components/budget/BudgetBreakdown.tsx`) which has **5 tabs**:

#### Tab 1 — Dashboard (Overview)
- 6 stat cards: BIZ Monthly Budget, BIZ Actual (MTD), BIZ Variance, Personal Monthly Budget, Personal Actual (MTD), Combined Budget
- **Spending by Category table:** Cross-tab of BIZ vs Personal estimated/actual/variance per category, with grand totals
- **Payments by Account table:** Groups budget lines by payment account, shows bill count, total budget, and list of auto-pay vendors

#### Tab 2 — Business Budget
Full sortable table of all BIZ budget lines grouped by category. Columns:
`#, Vendor/Description, Category, Budget Amount, Actual Amount, Variance ($), Variance (%), Frequency, Due Day, Due Week, Payment Account, Auto Pay, Status, Notes`

Category section headers separate groups. Grand total footer row.

#### Tab 3 — Personal Budget
Same table structure as Business Budget, filtered to `bill_type = 'personal'`.

#### Tab 4 — Payment Calendar
Sourced from **`budget.notes.calendarItems`** (parsed from the `Payment Calendar` sheet of the Excel file on upload).

Groups items by week (1–4). Each week section shows:
- Week label (e.g. "Week 1 — Days 1–7") with week subtotal
- Table: `Vendor/Description, Category, Budget Amount, Due Day, Account, Auto Pay, Notes`
- Week subtotal footer row

If `calendarItems` is empty (manually-entered budget or pre-feature upload), shows a "Re-upload the budget file" prompt.

**CalendarItem shape:**
```typescript
{
  week: number          // 1–4
  vendor: string
  category: string
  amount: number
  account: string | null
  auto_pay: boolean
  due_day: number | null
  notes: string | null
}
```

#### Tab 5 — 3-Month Forecast
Sourced from **`budget.notes.forecastItems`** (parsed from the `Forecast` sheet of the Excel file on upload).

Shows the 7-item curated forecast from the Excel file (not all budget lines):
- 3 stat cards: Month 1 Budget, Month 2 Budget, Month 3 Budget totals
- Table with dual header row (Month 1/2/3 top, Budget($)/Projected($) sub-row)
- Columns: `#, Vendor/Description, Category, M1 Budget, [M1 Projected], M2 Budget, [M2 Projected], M3 Budget, [M3 Projected], Freq., Notes`
- Projected columns only shown if any projected values are non-zero
- Monthly Total footer row

If `forecastItems` is empty, shows a "Re-upload the budget file" prompt.

**ForecastItem shape:**
```typescript
{
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
```

#### Display Details
- All table cells have `whiteSpace: 'nowrap'` — single-line text in every cell
- Status badges use `display_status` = `notes.original_status ?? db_status`
- Status badge colors: `active` → green, `cancelled` → red, `seasonal/pending` → gold
- Auto pay badge: green "Yes" / neutral "No"
- Bill type badge (Calendar tab): gold "Business" / neutral "Personal"

### 7.4 Transaction Tracker (`/transactions`)

Route: `src/app/(client)/transactions/page.tsx`

Shows the last 200 transactions, sorted newest first. Columns:
`Date, Merchant (+ merchant_name subline), Category, Amount, Status`

Status badges:
- **Matched** (green) — `is_matched = true`, linked to a budget line
- **Untracked** (gold/amber) — `is_untracked = true`, no budget line match
- **—** (neutral) — not yet processed

No filtering, pagination, or search in the current implementation.

### 7.5 Alerts (`/alerts`)

Route: `src/app/(client)/alerts/page.tsx`

Two sections: **Pending Action** and **Resolved** (at 55% opacity).

Each alert card shows severity icon (red circle or yellow triangle), title, description, amount, and date. "All clear" state shown when no pending alerts.

**Client can acknowledge alerts** via `POST /api/alerts/acknowledge` — sets `status = 'acknowledged'` and `acknowledged_at`.

Alert severity logic (set by matcher):
- **Red** — transaction > 150% of budget line estimated, OR untracked transaction ≥ $500, OR payment overdue > 3 days
- **Yellow** — transaction 110–150% of budget line, OR untracked < $500, OR payment overdue 1–3 days

### 7.6 Bank Connectors (`/connectors`)

Route: `src/app/(client)/connectors/page.tsx`

Uses Plaid Link (`react-plaid-link`). Flow:
1. `POST /api/plaid/create-link-token` — creates Plaid Link token
2. User completes Plaid Link modal (bank selection + credentials)
3. `POST /api/plaid/exchange-token` — exchanges public token for access token, stores in `plaid_items`

Shows connected banks as a list (institution name + "Active" badge). Placeholder cards for Stripe and Amazon connectors (Coming Soon). "Bank-Grade Security" callout at the bottom.

### 7.7 Subscriptions (`/subscriptions`)

Route: `src/app/(client)/subscriptions/page.tsx`

Reads from `subscriptions` table. Shows:
- Header stat: Active subs count, Monthly Burn total
- Filter tabs: All Services / Auto-Detected / Canceled (UI only, no filter logic yet)
- Cards per subscription: logo/initial, vendor name, category, amount/frequency, next charge date, Keep / Cancel action buttons (UI only)

Empty state: "Run a Subscription Audit" button.

### 7.8 Fixed Expenses / Recurring (`/recurring`)

Route: `src/app/(client)/recurring/page.tsx`

Reads from `recurring_expenses` table ordered by `pay_date` ascending.

Shows:
- Header: "Fixed Expenses" + "Total Committed" stat
- Each expense: icon, vendor name, category + due day, expected amount, status badge, chevron
- Sidebar: Timeline Gauge (static visual), Variance Alerts panel

### 7.9 Savings Goals (`/goals`)

Route: `src/app/(client)/goals/page.tsx`

Reads from `savings_goals` table ordered by priority.

Shows goal cards with:
- Goal name, goal type badge
- Progress: `$current of $target` with animated progress bar and percentage
- Linked account display
- "Add Funds" button (UI only)

Empty state: "What are you saving for?" with "Set Your First Goal" button.

### 7.10 Financial Trends (`/trends`)

Route: `src/app/(client)/trends/page.tsx`

Currently uses **mock data** (`MOCK_TRENDS`). Real data integration (from `monthly_summaries` + `trend_insights` tables) is not yet wired up.

Shows:
- Area chart: Cash Flow Overview (income vs expenses) using Recharts
- Pie chart: Spending Allocation by category
- "Pro Insight" gold card with narrative insight
- 3 stat cards: Revenue Growth, Expense Efficiency, Savings Velocity

Time filter buttons (Last 6 Months / Year to Date) are UI-only, no functional filtering.

### 7.11 Kelly AI (`/kelly-ai`)

Route: `src/app/(client)/kelly-ai/page.tsx`

Currently disabled — shows "Coming soon." The `KellyAIChat` component exists (`src/components/ai/KellyAIChat.tsx`) and an API route (`POST /api/ai/chat`) exists, but the page renders a placeholder.

When enabled, the AI has full access to the client's budget, transactions, and alerts and can answer natural language financial questions.

### 7.12 Settings (`/settings`)

Route: `src/app/(client)/settings/page.tsx`

Profile and account settings page. Details of implementation vary.

---

## 8. Excel Budget Template — Parsing Logic

File: `src/lib/excel/parser.ts`

The KelliWorks budget template has these sheets (only these 4 are read):

### Sheet: `BIZ Budget`
Expected columns (detected by header scan, not hardcoded column index):
`#, Vendor / Description, Category, Budget Amount ($), Actual Amount ($), Variance ($), Variance (%), Frequency, Due Day, Due Week, Payment Account, Auto Pay, Status, Notes`

Data rows are identified by a numeric value in the `#` column. Subtotal and header rows are skipped.

- BIZ budget items: `bill_type = 'business'`
- `due_week` is typically `null` for BIZ items (due days used instead)
- `status` values in the Excel: `active`, `cancelled`, `seasonal` — stored in `notes.original_status`; DB always receives `'pending'`

### Sheet: `PERSONAL Budget`
Same column structure as BIZ Budget. `bill_type = 'personal'`.

- PERSONAL items often have `due_week` set (1–4) for the Payment Calendar

### Sheet: `Payment Calendar`
Columns: `Vendor / Description, Category, Budget Amount, Account, Auto Pay, Notes`

Row types:
- **Week headers:** Rows starting with `📅 WEEK N` or `WEEK N (Days X–Y)` — sets current week context
- **Data rows:** Vendor, category, amount, account, auto pay. Vendor may have `[Day N]` suffix (e.g. "QuickBooks [Day 1]") — the day number is extracted as `due_day` and stripped from the vendor name
- **Subtotal rows:** Contain "SUBTOTAL" — skipped

Parsed into `CalendarItem[]` and stored in `budget.notes.calendarItems`.

### Sheet: `Forecast`
Dual-row header structure:
- Row 1: `Vendor / Description, Category, Month 1 (Current), , Month 2, , Month 3, , Freq., Notes`
- Row 2: `, , Budget ($), Projected ($), Budget ($), Projected ($), Budget ($), Projected ($), ,`

Data rows follow. Total rows (containing "TOTAL") are skipped.

Each Month column spans 2 sub-columns (Budget + Projected). Column indices are detected from the top header row; Budget is col N, Projected is col N+1.

Parsed into `ForecastItem[]` and stored in `budget.notes.forecastItems`.

---

## 9. Transaction Matching Engine

File: `src/lib/budget/matcher.ts`

Runs after each Plaid sync. For a given user and month:

1. Loads budget lines for the month
2. Loads all transactions in the month date range
3. For each transaction, attempts fuzzy match against all budget lines:
   - **Name match:** `txn.name` contains or is contained by `line.category` or `line.description` (case-insensitive)
   - **Amount tolerance:** Within 5% of `line.estimated_amount`
   - Both conditions must be true for a match
4. If matched:
   - Sets `transaction.is_matched = true`, `transaction.budget_line_id`
   - Sets `budget_line.actual_amount = txn.amount`, `budget_line.status = 'paid'` (or `'partial'`), `budget_line.paid_date`
   - If amount > 150% of estimate → red `large_transaction` alert
   - If amount 110–150% of estimate → yellow `over_budget` alert
5. If unmatched:
   - Sets `transaction.is_untracked = true`
   - Red `untracked_expense` alert if ≥ $500; yellow if < $500
6. After all transactions, checks for overdue lines:
   - Lines still `pending` with `due_day` in the past → status updated to `'overdue'`
   - Red `missed_payment` alert if > 3 days overdue; yellow if 1–3 days overdue

**Duplicate alert prevention:** Before inserting an alert, the matcher queries for an existing `pending` alert with the same `user_id + type + title`. If found, skips insertion.

---

## 10. Background Sync (Cron)

Route: `GET /api/cron/daily-sync`

Protected by `Authorization: Bearer <CRON_SECRET>` header. Calls `POST /api/plaid/sync-transactions` internally.

Intended to run daily (configured externally via Vercel Cron or equivalent).

### Plaid Sync (`POST /api/plaid/sync-transactions`)

For each `plaid_items` row:
1. Calls Plaid `transactionsSync` with cursor (incremental — only fetches new/changed transactions)
2. Upserts new transactions into `transactions` table (deduplicated by `plaid_transaction_id`)
3. Updates `plaid_items.cursor` and `last_synced_at`
4. Runs `matchTransactionsForUser` for the current month

---

## 11. API Routes Reference

### Admin

| Method | Route | Description |
|---|---|---|
| GET | `/api/admin/clients` | List all client profiles |
| POST | `/api/admin/clients` | Create/invite a new client |
| DELETE | `/api/admin/clients/[id]` | Delete a client and all their data |
| POST | `/api/admin/budget/import-excel` | Upload KelliWorks Excel template |
| POST | `/api/admin/budget/import` | Upload budget from Google Sheets export |
| DELETE | `/api/admin/budget/[budgetId]` | Delete a budget and all its lines |
| GET | `/api/admin/budget/[budgetId]/lines` | Debug endpoint — returns all lines with parsed notes JSON |

### Client

| Method | Route | Description |
|---|---|---|
| POST | `/api/plaid/create-link-token` | Generate Plaid Link token |
| POST | `/api/plaid/exchange-token` | Exchange Plaid public token for access token |
| POST | `/api/plaid/sync-transactions` | Trigger a manual transaction sync |
| POST | `/api/alerts/acknowledge` | Acknowledge an alert |

### System

| Method | Route | Description |
|---|---|---|
| GET | `/api/cron/daily-sync` | Cron-triggered daily Plaid sync |
| POST | `/api/ai/chat` | Kelly AI chat (disabled in UI) |
| POST | `/api/stripe/webhook` | Stripe webhook handler (subscription events) |

---

## 12. Month Format Convention

**Critical:** The database stores months as `YYYY-MM-DD` (always the first of the month, e.g. `2026-06-01`). However, HTML `<input type="month">` and some URL parameters return `YYYY-MM`.

**Normalization rule** (applied in both `/(client)/budget/page.tsx` and `/(admin)/.../budget/page.tsx`):
```typescript
const month = raw.length === 7 ? `${raw}-01` : raw
```

`getCurrentMonth()` in `src/lib/utils.ts` returns `YYYY-MM-DD`. `getMonthLabel()` accepts both formats by using `month.substring(0, 7)` before parsing.

---

## 13. Feature Status Matrix

| Feature | Status | Notes |
|---|---|---|
| Login / Auth | Live | Email + password via Insforge Auth |
| Admin client management | Live | Create, view, delete clients |
| Excel budget upload | Live | Parses BIZ, PERSONAL, Payment Calendar, Forecast sheets |
| Manual budget entry | Live | Basic category/amount/due_day only |
| Budget breakdown (5 tabs) | Live | All tabs functional after Excel upload |
| Delete budget | Live | Admin-only, red trash icon on preview page |
| Plaid bank connection | Live | Multi-bank, re-connectable |
| Plaid transaction sync | Live | Incremental cursor-based sync |
| Transaction matching | Live | Fuzzy name + 5% amount tolerance |
| Alerts (issue) | Live | Auto-generated by matcher |
| Alerts (acknowledge) | Live | Client-side action |
| Transaction history page | Live | Last 200, read-only |
| Subscriptions page | Partial | Schema live, UI shows data but actions (keep/cancel) are UI-only |
| Fixed Expenses page | Partial | Schema live, UI shows data, no add/edit yet |
| Goals page | Partial | Schema live, UI shows data, no create/fund form yet |
| Trends page | Partial | Charts use mock data — real data not wired |
| Kelly AI | Placeholder | Component + API exist, page disabled |
| Google Sheets import | Live (legacy) | Functional but Excel import is preferred |
| Stripe billing | Partial | Webhook handler exists, subscription_status tracked |
| Settings page | Partial | |

---

## 14. Key File Map

```
src/
├── app/
│   ├── (admin)/
│   │   ├── layout.tsx                        Admin shell + nav
│   │   └── admin/
│   │       ├── page.tsx                      Admin dashboard
│   │       ├── clients/
│   │       │   ├── page.tsx                  Client list
│   │       │   └── [id]/
│   │       │       ├── page.tsx              Client detail
│   │       │       └── budget/page.tsx       Budget preview (admin)
│   │       ├── budgets/page.tsx              Budget editor (upload + manual)
│   │       └── alerts/page.tsx              System-wide alert feed
│   ├── (client)/
│   │   ├── layout.tsx                        Client shell + nav
│   │   ├── dashboard/page.tsx               Main dashboard
│   │   ├── budget/page.tsx                  Budget tool (5-tab breakdown)
│   │   ├── transactions/page.tsx            Transaction history
│   │   ├── alerts/page.tsx                  Alert center
│   │   ├── connectors/page.tsx              Plaid bank linking
│   │   ├── subscriptions/page.tsx           Subscription tracker
│   │   ├── recurring/page.tsx               Fixed expenses
│   │   ├── goals/page.tsx                   Savings goals
│   │   ├── trends/page.tsx                  Financial trends charts
│   │   ├── kelly-ai/page.tsx                Kelly AI (disabled)
│   │   └── settings/page.tsx               Profile settings
│   ├── (auth)/
│   │   ├── login/page.tsx                   Login with shader bg
│   │   └── reset-password/page.tsx          Password reset
│   ├── auth/callback/page.tsx               Auth callback
│   └── api/
│       ├── admin/
│       │   ├── clients/route.ts             CRUD clients
│       │   ├── clients/[id]/route.ts        Delete client
│       │   └── budget/
│       │       ├── import-excel/route.ts    Excel upload handler
│       │       ├── import/route.ts          Google Sheets handler
│       │       └── [budgetId]/
│       │           ├── route.ts             Delete budget
│       │           └── lines/route.ts       Debug: list lines
│       ├── plaid/
│       │   ├── create-link-token/route.ts
│       │   ├── exchange-token/route.ts
│       │   └── sync-transactions/route.ts
│       ├── alerts/acknowledge/route.ts
│       ├── ai/chat/route.ts                 Kelly AI backend
│       ├── stripe/webhook/route.ts
│       └── cron/daily-sync/route.ts
├── components/
│   ├── budget/
│   │   ├── BudgetBreakdown.tsx              5-tab budget viewer (main component)
│   │   └── AdminBudgetImport.tsx            Upload form with progress bar
│   ├── admin/
│   │   ├── AddClientModal.tsx
│   │   ├── DeleteClientModal.tsx
│   │   └── DeleteBudgetButton.tsx
│   ├── dashboard/
│   │   ├── BudgetLineItem.tsx
│   │   ├── BudgetProgress.tsx
│   │   ├── UnmatchedExpenses.tsx
│   │   ├── AlertBanner.tsx
│   │   ├── AlertCard.tsx
│   │   └── MonthSelector.tsx
│   ├── ai/
│   │   ├── KellyAIChat.tsx
│   │   └── KellyAIBubble.tsx
│   └── ui/
│       ├── index.ts                          Re-exports: Card, Badge, Button, Input, SectionLabel, ProgressBar, Spinner, Avatar, Divider
│       └── ClientNav.tsx
├── lib/
│   ├── supabase/
│   │   ├── server.ts                         Server-side Insforge client
│   │   ├── client.ts                         Browser Insforge client
│   │   └── middleware.ts                     Auth session middleware
│   ├── excel/parser.ts                       Excel template parser (SheetJS)
│   ├── sheets/parser.ts                      Google Sheets parser
│   ├── budget/matcher.ts                     Transaction fuzzy matching + alerts
│   ├── plaid/client.ts                       Plaid SDK instance
│   ├── stripe/client.ts                      Stripe SDK instance
│   └── utils.ts                              formatCurrency, formatDate, getMonthLabel, getCurrentMonth
├── types/index.ts                            Shared TypeScript interfaces
migrations/
├── 20260502194723_initial-schema.sql        Core tables (profiles, budgets, budget_lines, transactions, alerts, plaid_items)
├── 20260502234500_session_2_features.sql    Extended tables (recurring, subscriptions, goals, trends, income)
└── 20260603000000_add-budget-lines-notes.sql  Adds notes column to budget_lines
```

---

## 15. Environment Variables Required

```env
# Insforge / Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Plaid
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox|development|production

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=
CRON_SECRET=

# AI (Kelly AI)
ANTHROPIC_API_KEY=
```

---

## 16. Known Behaviors & Constraints

- **Budget re-upload replaces everything.** Uploading Excel for an existing month deletes all old `budget_lines` and re-inserts from the file.
- **`budget.notes` is JSON after Excel upload, plain text after manual entry.** Components check `notes?.startsWith('{')` before parsing.
- **Transaction matching runs per-sync, not retroactively.** If a budget is uploaded after transactions have already synced, matching won't happen until the next sync. Manual trigger via `POST /api/plaid/sync-transactions` works.
- **Plaid is read-only.** The app stores access tokens and pulls transactions. It cannot initiate payments.
- **`due_week` vs `due_day`:** BIZ budget lines typically have `due_day` and `due_week = null`. PERSONAL lines typically have `due_week` set. The Payment Calendar tab is driven by `calendarItems` from the Excel file (not computed from `due_week`/`due_day` on budget_lines).
- **Subscription status** on `profiles` is updated via the Stripe webhook handler when Stripe subscription events fire.
