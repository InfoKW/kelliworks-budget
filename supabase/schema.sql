-- Users (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) primary key,
  full_name text,
  email text unique,
  role text default 'client' check (role in ('client', 'admin')),
  stripe_customer_id text,
  subscription_status text default 'inactive' check (subscription_status in ('active', 'inactive', 'past_due', 'canceled')),
  created_at timestamptz default now()
);

-- Plaid bank connections per client
create table public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  access_token text not null,
  item_id text not null,
  institution_name text,
  cursor text,
  last_synced_at timestamptz,
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
  budget_line_id uuid references public.budget_lines(id),
  is_matched boolean default false,
  is_untracked boolean default false,
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

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.plaid_items enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_lines enable row level security;
alter table public.alerts enable row level security;

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
