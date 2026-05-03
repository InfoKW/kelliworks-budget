-- Fix infinite recursion in profiles RLS policies
-- We use a security definer function to check the admin role, bypassing RLS for that specific check

create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Drop old recursive policies
drop policy if exists "admin_all_profiles" on public.profiles;
drop policy if exists "admin_all_transactions" on public.transactions;
drop policy if exists "admin_all_budgets" on public.budgets;
drop policy if exists "admin_all_budget_lines" on public.budget_lines;
drop policy if exists "admin_all_alerts" on public.alerts;

-- Recreate policies using the non-recursive function
create policy "admin_all_profiles" on public.profiles
  for all using (public.is_admin());

create policy "admin_all_transactions" on public.transactions
  for all using (public.is_admin());

create policy "admin_all_budgets" on public.budgets
  for all using (public.is_admin());

create policy "admin_all_budget_lines" on public.budget_lines
  for all using (public.is_admin());

create policy "admin_all_alerts" on public.alerts
  for all using (public.is_admin());
