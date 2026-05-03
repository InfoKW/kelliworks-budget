CLAUDE.md — KelliWorks Client Financial Dashboard
Agent Prompt for Claude Code Stack: Next.js 14 (App Router) · Tailwind CSS · Supabase · Plaid API · Stripe Repo: GitHub (new) · Deployment: Insforge · Secrets:
.env.local only
PROJECT OVERVIEW
Build a production-grade, white-labeled financial dashboard web app for KelliWorks — an accounting firm. The app is subscription-gated, password-protected, and served to clients as part of their monthly service.
Each client logs in to a private, individualized dashboard that: Pulls live bank/financial transaction data via Plaid
Cross-references those transactions against a custom estimated monthly budget set by KelliWorks admin
Tracks payment status line-by-line against the current calendar month
Flags unexpected or unbudgeted expenditures separately
Issues Yellow and Red alert flags requiring client approval/acknowledgment Is fully managed and maintained by KelliWorks (admin-only back office)
REPOSITORY SETUP
  # Initialize new GitHub repo
  gh repo create kelliworks-client-portal --private --clone
  cd kelliworks-client-portal
  npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir --import
All secrets go in .env.local — never commit this file.
         -alias
 ENVIRONMENT VARIABLES
Create .env.local in root. Never hardcode any of these values anywhere in source code.
  # Supabase
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  # Plaid
  PLAID_CLIENT_ID=your_plaid_client_id
  PLAID_SECRET=your_plaid_secret
  PLAID_ENV=sandbox  # Change to "production" when live
  # Stripe (subscription billing)
  STRIPE_SECRET_KEY=your_stripe_secret_key
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
  STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
  # App
  NEXT_PUBLIC_APP_URL=https://your-insforge-domain.com
  NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
  NEXTAUTH_URL=https://your-insforge-domain.com
   # Admin
ADMIN_EMAIL=kelli@kelliworks.com
PROJECT ARCHITECTURE
src/
├── app/
│ ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (client)/
# Client login
# Protected client shell
# Main dashboard
# Monthly budget tracker
# Flags requiring approval
# Full transaction history
# Account & bank connection
# Admin-only shell
   │ │
│ │
│ │
│ │
│ │
│ │
│   ├── (admin)/
│   │   ├── layout.tsx
├── layout.tsx
├── dashboard/page.tsx
├── budget/page.tsx
├── alerts/page.tsx
├── transactions/page.tsx
└── settings/page.tsx

 │ │
│ │
│ │
│ │
│ └── api/
│ ├── plaid/
# All clients list
# Individual client view
# Set/edit client budgets
# Review all flags
├── clients/page.tsx
├── clients/[id]/page.tsx
├── budgets/page.tsx
└── alerts/page.tsx
│ │
│ │
│ │
│ ├── budget/
│       │   ├── get/route.ts
│       │   └── update/route.ts
│ ├── alerts/
│       │   ├── get/route.ts
│       │   └── acknowledge/route.ts
│ ├── stripe/
│       │   └── webhook/route.ts
│ └── cron/
│           └── daily-sync/route.ts
├── components/
│ ├── ui/
│   ├── dashboard/
│ │
│ │
│ │
│ │
│ │
│ │
│ └── admin/
├── create-link-token/route.ts
├── exchange-token/route.ts
└── sync-transactions/route.ts
├── BudgetLineItem.tsx
├── BudgetProgress.tsx
├── AlertBanner.tsx
├── MonthSelector.tsx
├── TransactionFeed.tsx
└── UnmatchedExpenses.tsx
│
│
│
├── lib/
│   ├── supabase/
├── ClientCard.tsx
├── BudgetEditor.tsx
└── FlagManager.tsx
│ │
│ │
│ │
│ ├── plaid/
│   │   └── client.ts
│ ├── stripe/
├── client.ts
├── server.ts
└── middleware.ts
│   │   └── client.ts
│ └── budget/
│       └── matcher.ts
└── types/
└── index.ts
# Core matching logic
# Vercel/Insforge cron job
# shadcn/ui base components
 
 DATABASE SCHEMA (Supabase / PostgreSQL)
Run the following in Supabase SQL editor:
  -- Users (extends Supabase auth.users)
  create table public.profiles (
    id uuid references auth.users(id) primary key,
    full_name text,
    email text unique,
    role text default 'client' check (role in ('client', 'admin')),
    stripe_customer_id text,
    subscription_status text default 'inactive',
    created_at timestamptz default now()
  );
  -- Plaid bank connections per client
  create table public.plaid_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete cascade,
    access_token text not null,  -- encrypted at rest via Supabase vault
    item_id text not null,
    institution_name text,
    cursor text,  -- Plaid transactions sync cursor
    last_synced_at timestamptz,
    created_at timestamptz default now()
);
  -- Raw transactions pulled from Plaid
  create table public.transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete cascade,
    plaid_transaction_id text unique,
    account_id text,
    amount numeric(12,2),
    date date,
    name text,
    merchant_name text,
    category text[],
    budget_line_id uuid references public.budget_lines(id),  -- matched line
    is_matched boolean default false,
    is_untracked boolean default false,  -- doesn't match any budget line
    created_at timestamptz default now()
);
  -- Monthly estimated budgets per client
  create table public.budgets (
  
   id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  month date,  -- first day of the month e.g. 2025-06-01
  total_estimated numeric(12,2),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  unique(user_id, month)
);
-- Individual line items within a budget
create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid references public.budgets(id) on delete cascade,
  user_id uuid references public.profiles(id),
  category text not null,        -- e.g. "Rent", "Payroll", "Utilities"
  description text,
  estimated_amount numeric(12,2),
  actual_amount numeric(12,2) default 0,
  status text default 'pending' check (status in ('pending', 'paid', 'partial', 'overd
  due_day int,                   -- day of month this is due (1-31)
  paid_date date,
  created_at timestamptz default now()
);
-- Alert flags issued to clients
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  transaction_id uuid references public.transactions(id),
  budget_line_id uuid references public.budget_lines(id),
  severity text check (severity in ('yellow', 'red')),
  type text check (type in (
    'untracked_expense',
    'over_budget',
    'large_transaction',
    'duplicate_payment',
    'missed_payment',
    'unusual_merchant'
  )),
  title text not null,
  description text,
  amount numeric(12,2),
  status text default 'pending' check (status in ('pending', 'acknowledged', 'resolved
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id),
  created_at timestamptz default now()
ue')),
', 'esc

  );
  -- Row Level Security
  alter table public.profiles enable row level security;
  alter table public.plaid_items enable row level security;
  alter table public.transactions enable row level security;
  alter table public.budgets enable row level security;
  alter table public.budget_lines enable row level security;
  alter table public.alerts enable row level security;
  -- Clients see only their own data
  create policy "clients_own_data" on public.transactions
    for all using (auth.uid() = user_id);
  create policy "clients_own_budgets" on public.budgets
    for all using (auth.uid() = user_id);
  create policy "clients_own_alerts" on public.alerts
    for select using (auth.uid() = user_id);
  -- Admins see all data
  create policy "admin_all_access" on public.transactions
    for all using (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
CORE LOGIC — Budget Matching Engine
File: src/lib/budget/matcher.ts This is the brain of the app. Build it to:
1. Matchtransactionstobudgetlinesusing:
Merchant name fuzzy match against budget line category/description Amount proximity (within ±5% tolerance)
Transaction date vs. expected due_day of month
2. Updatebudgetlinestatus:
paid — transaction found, amount within tolerance, date on time partial — transaction found but amount is less than estimated
    
 overdue — due_day has passed, no matching transaction found
 pending — due_day not yet reached 3. Flaguntrackedtransactions:
Any transaction not matched to a budget line → is_untracked = true
  Auto-generate a yellow alert 4. Alertthresholds:
Condition
Transaction > 150% of budget line Untracked expense > $500 Budget line overdue > 3 days Untracked expense < $500 Transaction > 110% of budget line Budget line overdue ≤ 3 days Possible duplicate payment
UI REQUIREMENTS
Flag Color
Red Red Red Yellow Yellow Yellow Red
                                          Design Language
Brand: KelliWorks — professional, trustworthy, clean accounting aesthetic
Theme: Dark navy / slate base with crisp white text, gold/amber accents for alerts Font: Display → Playfair Display or DM Serif Display · Body → DM Sans Style: Refined financial dashboard — think Bloomberg meets a boutique CPA firm
Client Dashboard ( /dashboard )
┌─────────────────────────────────────────────────────┐ │ KelliWorks Portal Jane Smith [Logout] │ ├─────────────────────────────────────────────────────┤
      
   │ June 2025 Budget Status [← Prev Month] │ ││ │ ████████████░░░ 72% of Budget Used │ │ $14,400 spent of $20,000 estimated ││ │ 2 Red Alerts 3 Yellow Flags [Review Now] │ ├─────────────────────────────────────────────────────┤
│
                              │
$3,500 / $3,500   PAID  Jun 1 │
$8,200 / $8,200   PAID  Jun 5 │
    │  BUDGET LINE ITEMS
│   Rent
│   Payroll
│ Utilities
│ Insurance
│ Software Subs ├─────────────────────────────────────────────────────┤ │ UNTRACKED EXPENSES │ │ Amazon Business $234.67 Jun 12 [Flag?] │
│ Unknown Charge $1,890.00 Jun 14 [Review] │ └─────────────────────────────────────────────────────┘
Alert Flow
Alerts appear as a dismissible banner + dedicated /alerts page
Client must explicitly acknowledge each alert with a confirmation button Red alerts require a typed confirmation (“I understand”) before dismissal All acknowledgments are timestamped and stored for admin audit trail
Admin Back Office ( /admin )
View all clients, their current month status, and outstanding alerts
Set/edit monthly budgets per client with a line-item editor
Manually mark budget lines as paid
View full transaction history per client
Manage Plaid connections and re-link if expired
Dashboard summary: # active clients, # open alerts, # subscriptions active
PLAID INTEGRATION
 $420 / $350
$0 / $1,200
$0 / $450
OVER BUDGET  │
OVERDUE      │
DUE Jun 28   │
        
    // src/lib/plaid/client.ts
  import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
  const config = new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments]
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
}, },
  });
  export const plaidClient = new PlaidApi(config);
Sync Flow:
1. Client connects bank via Plaid Link (React component in /settings )
2. Exchange public token → store encrypted access token in plaid_items
3. Daily cron job ( /api/cron/daily-sync ) calls transactionsSync for all active items
4. New transactions run through matcher engine
5. New alerts generated and pushed to client dashboard
AUTHENTICATION & SUBSCRIPTION GATES
Use Supabase Auth (email + password) for client login
Use Next.js middleware to protect all /dashboard , /budget , /alerts routes Subscription check: user must have subscription_status = 'active' in profiles If subscription lapsed → redirect to /subscribe (Stripe Checkout)
Admin routes protected by role = 'admin' check
Implement password reset via Supabase magic link email
  // src/lib/supabase/middleware.ts
  // Check session + subscription on every protected route
  // Redirect unauthenticated users to /login
  // Redirect expired subscribers to /subscribe
             ,

  // Redirect non-admin users away from /admin routes
 INSFORGE DEPLOYMENT
Build Configuration
  // package.json scripts
  {
    "build": "next build",
    "start": "next start",
    "deploy": "insforge deploy"
}
 insforge.config.json
  {
    "name": "kelliworks-client-portal",
    "framework": "nextjs",
    "buildCommand": "npm run build",
    "outputDirectory": ".next",
    "installCommand": "npm install",
    "envVars": [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "PLAID_CLIENT_ID",
      "PLAID_SECRET",
      "PLAID_ENV",
      "STRIPE_SECRET_KEY",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "NEXT_PUBLIC_APP_URL",
      "NEXTAUTH_SECRET",
      "NEXTAUTH_URL"
], "crons": [
      {
        "path": "/api/cron/daily-sync",
        "schedule": "0 6 * * *"
} ]
    }

  Deployment Steps
 # 1. Push to GitHub
git add .
git commit -m "initial build"
git push origin main
# 2. Connect Insforge to GitHub repo
# 3. Set all env vars in Insforge dashboard
# 4. Deploy
insforge deploy --prod
# 5. Configure Stripe webhook endpoint:
# https://your-domain.insforge.app/api/stripe/webhook
DEPENDENCIES
npm install \
  @supabase/supabase-js \
  @supabase/ssr \
  plaid \
  stripe \
  react-plaid-link \
  @tanstack/react-query \
  recharts \
  date-fns \
  zod \
  react-hook-form \
  @hookform/resolvers \
  lucide-react \
  clsx \
  tailwind-merge \
  class-variance-authority \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-toast \
  @radix-ui/react-progress \
  @radix-ui/react-badge
    
 BUILD ORDER FOR CLAUDE CODE
Build in this exact sequence:
1. Project scaffold — Next.js init, folder structure, Tailwind config, font imports
2. Supabase setup — client/server helpers, middleware, RLS policies
3. Database — run schema migrations in Supabase
4. Auth pages — /login , /reset-password , session handling
5. Plaid integration — link token, exchange token, item storage
6. Transaction sync — daily cron, sync endpoint, store raw transactions
7. Budget matcher — matcher.ts core logic, status updates, alert generation
8. Client dashboard — budget progress, line items, untracked expenses, month selector
9. Alert system — alert feed, acknowledgment flow, red/yellow UI
10. Admin back office — client list, budget editor, alert management
11. Stripe subscription — checkout, webhooks, subscription status gate
12. Insforge deployment — config file, env var setup, cron jobs
13. Final polish — loading states, error boundaries, empty states, mobile responsive
CRITICAL RULES FOR CLAUDE CODE
Never hardcode API keys, secrets, or tokens in source files
Never expose Supabase service role key on the client side
Never expose Plaid access tokens to the browser
All Plaid and Stripe calls go through Next.js API routes only
Use Supabase Row Level Security on every table — no exceptions Encrypt Plaid access tokens at rest using Supabase Vault
All admin actions must verify role = 'admin' server-side
Budget alert acknowledgments must be server-side validated before marking resolved
               
  Use Zod for all API input validation
All monetary values stored as numeric(12,2) — never float
FEATURE CHECKLIST
Client Portal
Secure login with password reset
Monthly budget dashboard with progress bar
Line-by-line budget status (paid / pending / overdue / partial) Due date tracking vs. actual payment dates Untracked/unmatched expense feed
Yellow alert acknowledgment (single confirm)
Red alert acknowledgment (typed confirmation)
Month navigation (view prior months)
Bank connection via Plaid Link
Account settings page
Admin Back Office
All-clients overview dashboard
Per-client budget setup (monthly, line items, due dates) Manual payment marking
Transaction review and manual matching
Alert management and escalation
Plaid connection management
Subscription status view
Infrastructure
    Supabase Auth + RLS

Plaid transaction sync (daily cron)
Stripe subscription gating
Insforge deployment pipeline
GitHub Actions CI (lint + build check on PR)
Built for KelliWorks · Maintained by KelliWorks · Powered by Claude Code