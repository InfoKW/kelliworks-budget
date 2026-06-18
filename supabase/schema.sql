-- Users (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) primary key,
  full_name text,
  email text unique,
  role text default 'client' check (role in ('client', 'admin')),
  stripe_customer_id text,
  plaid_user_token text,
  subscription_status text default 'inactive' check (subscription_status in ('active', 'inactive', 'past_due', 'canceled')),
  created_at timestamptz default now()
);

-- Plaid bank connections per client
create table public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  access_token text not null,
  item_id text not null unique,
  institution_id text,
  institution_name text,
  cursor text,
  last_synced_at timestamptz,
  item_status text default 'good' check (item_status in ('good', 'login_required', 'pending_expiration', 'pending_disconnect', 'error')),
  consent_expiration_time timestamptz,
  created_at timestamptz default now()
);

-- Monthly estimated budgets per client
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  month date,
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
  category text not null,
  description text,
  estimated_amount numeric(12,2),
  actual_amount numeric(12,2) default 0,
  status text default 'pending' check (status in ('pending', 'paid', 'partial', 'overdue')),
  due_day int,
  paid_date date,
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
  personal_finance_category_detailed text,
  pending boolean default false,
  -- Plaid Enrich enrichment fields (populated by /api/plaid/enrich)
  enriched_merchant_name text,
  enriched_logo_url text,
  enriched_website text,
  enriched_phone_number text,
  enriched_payment_channel text,
  enriched_location jsonb,
  enriched_counterparties jsonb,
  enriched_personal_finance_category jsonb,
  enriched_at timestamptz,
  budget_line_id uuid references public.budget_lines(id),
  is_matched boolean default false,
  is_untracked boolean default false,
  removed_at timestamptz,
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
  status text default 'pending' check (status in ('pending', 'acknowledged', 'resolved', 'escalated')),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Authorized Plaid accounts per item — kept in sync via update mode account selection
create table public.plaid_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  plaid_item_id uuid references public.plaid_items(id) on delete cascade,
  account_id text not null,
  name text,
  mask text,
  type text,
  subtype text,
  authorized_at timestamptz default now(),
  removed_at timestamptz,
  unique (plaid_item_id, account_id)
);

-- Statement metadata index — used to resolve access_token for PDF downloads
create table public.statement_metadata (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  plaid_item_id uuid references public.plaid_items(id) on delete cascade,
  institution_name text,
  statement_id text not null unique,
  account_id text not null,
  account_name text,
  account_type text,
  month int not null,
  year int not null,
  fetched_at timestamptz default now()
);

-- Signal transaction risk evaluations log
create table public.signal_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  plaid_item_id uuid references public.plaid_items(id) on delete set null,
  account_id text not null,
  client_transaction_id text not null unique,
  amount numeric(12,2) not null,
  -- Scores returned by /signal/evaluate
  customer_return_risk_score int,
  customer_return_risk_tier text,
  bank_return_risk_score int,
  bank_return_risk_tier text,
  ruleset_result text,
  core_attributes jsonb,
  -- Decision reported via /signal/decision/report
  initiated boolean,
  payment_decision text,
  decided_at timestamptz,
  -- Return reported via /signal/return/report
  return_code text,
  returned_at timestamptz,
  created_at timestamptz default now()
);

-- Daily liability snapshots from Plaid Liabilities (credit cards, student loans, mortgages)
create table public.liability_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  plaid_item_id uuid references public.plaid_items(id) on delete cascade,
  institution_name text,
  credit_data jsonb,
  student_data jsonb,
  mortgage_data jsonb,
  fetched_at timestamptz default now()
);

-- Income reports from Plaid Income (bank, payroll, document)
create table public.income_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  income_type text not null check (income_type in ('bank', 'payroll', 'document')),
  status text default 'pending' check (status in ('pending', 'ready', 'error')),
  report_data jsonb,
  employment_data jsonb,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Real-time account balance snapshots from Plaid Balance
create table public.account_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  plaid_item_id uuid references public.plaid_items(id) on delete cascade,
  account_id text not null,
  account_name text,
  account_type text,
  account_subtype text,
  account_mask text,
  available numeric(14,2),
  current_balance numeric(14,2),
  credit_limit numeric(14,2),
  iso_currency_code text default 'USD',
  fetched_at timestamptz default now()
);

-- Asset reports generated via Plaid Assets product
create table public.asset_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  asset_report_id text,
  asset_report_token text not null,
  status text default 'pending' check (status in ('pending', 'ready', 'error')),
  days_requested int not null default 90,
  report_data jsonb,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.plaid_items enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_lines enable row level security;
alter table public.alerts enable row level security;
alter table public.plaid_accounts enable row level security;
alter table public.statement_metadata enable row level security;
alter table public.signal_evaluations enable row level security;
alter table public.liability_snapshots enable row level security;
alter table public.income_reports enable row level security;
alter table public.account_balances enable row level security;
alter table public.asset_reports enable row level security;

-- Clients see only their own data
create policy "clients_own_profile" on public.profiles
  for all using (auth.uid() = id);

create policy "clients_own_plaid" on public.plaid_items
  for all using (auth.uid() = user_id);

create policy "clients_own_data" on public.transactions
  for all using (auth.uid() = user_id);

create policy "clients_own_budgets" on public.budgets
  for all using (auth.uid() = user_id);

create policy "clients_own_budget_lines" on public.budget_lines
  for all using (auth.uid() = user_id);

create policy "clients_own_alerts" on public.alerts
  for select using (auth.uid() = user_id);

create policy "clients_acknowledge_alerts" on public.alerts
  for update using (auth.uid() = user_id);

create policy "clients_own_plaid_accounts" on public.plaid_accounts
  for all using (auth.uid() = user_id);

create policy "admin_all_plaid_accounts" on public.plaid_accounts
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "clients_own_statement_metadata" on public.statement_metadata
  for all using (auth.uid() = user_id);

create policy "admin_all_statement_metadata" on public.statement_metadata
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "clients_own_signal_evaluations" on public.signal_evaluations
  for all using (auth.uid() = user_id);

create policy "admin_all_signal_evaluations" on public.signal_evaluations
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "clients_own_liability_snapshots" on public.liability_snapshots
  for all using (auth.uid() = user_id);

create policy "admin_all_liability_snapshots" on public.liability_snapshots
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "clients_own_income_reports" on public.income_reports
  for all using (auth.uid() = user_id);

create policy "admin_all_income_reports" on public.income_reports
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "clients_own_account_balances" on public.account_balances
  for all using (auth.uid() = user_id);

create policy "admin_all_account_balances" on public.account_balances
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "clients_own_asset_reports" on public.asset_reports
  for all using (auth.uid() = user_id);

create policy "admin_all_asset_reports" on public.asset_reports
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Admins see all data
create policy "admin_all_profiles" on public.profiles
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin_all_transactions" on public.transactions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin_all_budgets" on public.budgets
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin_all_budget_lines" on public.budget_lines
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin_all_alerts" on public.alerts
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
