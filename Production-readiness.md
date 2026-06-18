# Production Readiness — KelliWorks Client Portal

_Last updated: 2026-06-17 (OAuth institutions complete)_

---

## Completed (v2_ui branch)

### Update Mode (reconnect flow)
- Routes: `update-mode/create-link-token`, `complete`, `sync-accounts`
- UI: `PlaidReconnectBanner` (4 states), `PlaidReconnectCheck` server component, `PlaidAddAccountsButton`
- Integrated into client `layout.tsx` — banner shows on all pages when a connection is broken

### Webhook handler (`/api/plaid/webhook`)
- Handles: ITEM (login_required, pending_expiration, pending_disconnect, login_repaired, error), ASSETS, STATEMENTS, TRANSACTIONS, LIABILITIES, INCOME

### Sync transactions upgrade
- Handles modified + removed transactions (not just added)
- Pagination error recovery (`TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION`)
- `personal_finance_category_detailed` + `pending` fields

### New product routes (18+ routes)
- Balance, Enrich (+ single), Income (4 routes), Liabilities, Signal (evaluate/decision/prepare/return), Statements (list/download/refresh), Transactions (recurring/refresh), Asset reports (create/get), Sandbox reset-login

### Schema + types
- 7 new tables: `plaid_accounts`, `statement_metadata`, `signal_evaluations`, `liability_snapshots`, `income_reports`, `account_balances`, `asset_reports`
- New columns on existing tables + RLS policies for all new tables
- `src/types/index.ts` updated to match

### create-link-token
- Added `Assets`, `Liabilities`, `Signal` (via `additional_consented_products`), `Statements` (via `required_if_supported_products`)
- `transactions.days_requested: 730` (2 years of history)
- `redirect_uri` field added

### OAuth Institutions (Chase, Wells Fargo, Bank of America, etc.)
- `src/app/plaid-oauth/page.tsx` — redirect callback page; resumes Link with `receivedRedirectUri` after bank OAuth
- All link token fetches (new connect, reconnect, account selection) store token + mode to `sessionStorage` before Link opens, so the token survives the page redirect to the bank
- `update-mode/create-link-token` now includes `redirect_uri` so update mode OAuth also works
- `PLAID_REDIRECT_URI=https://budget.kelliworks.com/plaid-oauth` added to `.env.local` and `insforge.config.json`
- **Remaining manual step:** Register `https://budget.kelliworks.com/plaid-oauth` as an Allowed Redirect URI in the Plaid developer dashboard (API → Allowed redirect URIs)

---

## Remaining — Blockers Before Production

### CRITICAL

- [ ] **Webhook signature verification**
  The `Plaid-Verification` JWT header is not validated in `/api/plaid/webhook/route.ts` (see TODO at line 6). Any server can currently spoof webhook events. This must be implemented before production.
  Reference: https://plaid.com/docs/api/webhooks/webhook-verification/

- [ ] **Missing DB migration file**
  `supabase/schema.sql` was updated with all 7 new tables and new columns, but no corresponding migration file was created. The last migration is `20260604000003_add-matcher-enhancements.sql`. The live Supabase DB will not have the new tables until the diff is applied — either via a new migration file or by running the schema diff manually in the Supabase SQL editor.

### MEDIUM

- [x] **`PLAID_SECRET` set in `.env.local`** — confirmed present

- [x] **`PLAID_REDIRECT_URI` set** — `https://budget.kelliworks.com/plaid-oauth` added to `.env.local` and `insforge.config.json`
  - [ ] **Manual step still needed:** Register this URI in the Plaid dashboard → API → Allowed redirect URIs

### LOW

- [ ] **Remove debug `console.log` in create-link-token**
  `src/app/api/plaid/create-link-token/route.ts` line 14 logs Plaid credential status on every call. Remove before production.

- [ ] **Commit all new and modified files**
  20+ new route files and 3 new components are untracked. Modified files are also unstaged. Nothing from yesterday's session has been committed yet.

- [ ] **No UI pages for new products**
  All product API routes exist but there are no client-facing pages to surface the data. Pending pages:
  - Statements (list + PDF download)
  - Account balances
  - Liabilities overview
  - Income verification
  - Asset reports
  - Signal is backend-only (no UI needed)
  - Enrich is background-only (no UI needed, enriches transaction display)

---

## Environment Variables Checklist

| Variable | Status | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Set | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Set | |
| `SUPABASE_SERVICE_ROLE_KEY` | Set | |
| `PLAID_CLIENT_ID` | Set | |
| `PLAID_SECRET` | Set | |
| `PLAID_ENV` | Set | Already `production` |
| `PLAID_REDIRECT_URI` | Set | Register URI in Plaid dashboard (manual step) |
| `STRIPE_SECRET_KEY` | Set | |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Set | |
| `STRIPE_WEBHOOK_SECRET` | Set | |
| `NEXT_PUBLIC_APP_URL` | Set | |

---

## Go-Live Sequence

1. Implement webhook signature verification (`Plaid-Verification` JWT)
2. Create and run migration file for all new schema tables/columns
3. ~~Add `PLAID_SECRET` and `PLAID_REDIRECT_URI` to `.env.local` and Insforge env~~ ✓ Done
4. Register `https://budget.kelliworks.com/plaid-oauth` in Plaid dashboard → API → Allowed redirect URIs
5. Remove debug `console.log` from `create-link-token/route.ts`
6. Commit all untracked and modified files
7. Deploy and verify webhook endpoint is reachable by Plaid
9. (Optional) Build UI pages for Statements, Balances, Liabilities, Income
