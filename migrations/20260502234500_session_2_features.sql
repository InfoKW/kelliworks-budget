-- Session 2: Advanced Financial Modules Migration

-- 1. Recurring & Fixed Expenses
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vendor_name TEXT NOT NULL,
    vendor_category TEXT,
    amount DECIMAL(12,2) NOT NULL,
    amount_last_charged DECIMAL(12,2),
    pay_date INTEGER, -- Day of month (1-31)
    account_id TEXT, -- Plaid account ID
    frequency TEXT DEFAULT 'monthly', -- monthly, annual, etc.
    started_at TIMESTAMPTZ DEFAULT now(),
    last_charged_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active', -- active, paused, canceled
    auto_detected BOOLEAN DEFAULT false,
    manually_added BOOLEAN DEFAULT true,
    plaid_transaction_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recurring_expense_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recurring_expense_id UUID NOT NULL REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- YYYY-MM
    expected_amount DECIMAL(12,2) NOT NULL,
    actual_amount DECIMAL(12,2),
    expected_date DATE,
    actual_date DATE,
    status TEXT DEFAULT 'paid', -- paid, overdue, skipped, amount_changed
    matched_transaction_id TEXT,
    client_note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Expense & Revenue Trends
CREATE TABLE IF NOT EXISTS public.monthly_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- YYYY-MM
    total_income DECIMAL(12,2) DEFAULT 0,
    total_expenses DECIMAL(12,2) DEFAULT 0,
    net_position DECIMAL(12,2) DEFAULT 0,
    category_breakdown JSONB DEFAULT '{}',
    income_sources JSONB DEFAULT '{}',
    computed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(client_id, month)
);

CREATE TABLE IF NOT EXISTS public.trend_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL,
    category TEXT,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'info', -- info, warning, alert
    generated_at TIMESTAMPTZ DEFAULT now(),
    dismissed_at TIMESTAMPTZ
);

-- 3. Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vendor_name TEXT NOT NULL,
    vendor_logo_url TEXT,
    category TEXT,
    account_id TEXT,
    amount DECIMAL(12,2) NOT NULL,
    frequency TEXT DEFAULT 'monthly',
    started_at TIMESTAMPTZ DEFAULT now(),
    last_charged_at TIMESTAMPTZ,
    next_expected_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active', -- trial, active, cancellation_requested, canceled, paused
    canceled_at TIMESTAMPTZ,
    cancellation_url TEXT,
    auto_detected BOOLEAN DEFAULT false,
    total_paid_to_date DECIMAL(12,2) DEFAULT 0,
    plaid_transaction_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    triggered_at TIMESTAMPTZ DEFAULT now(),
    triggered_by TEXT DEFAULT 'admin', -- client, admin
    completed_at TIMESTAMPTZ,
    decisions JSONB DEFAULT '[]' -- [{sub_id, decision: keep/cancel/review}]
);

-- 4. Income & Savings Goals
CREATE TABLE IF NOT EXISTS public.income_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    source_type TEXT NOT NULL,
    expected_amount DECIMAL(12,2),
    expected_day_of_month INTEGER,
    last_received_at TIMESTAMPTZ,
    last_amount DECIMAL(12,2),
    plaid_account_id TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    goal_type TEXT NOT NULL,
    target_amount DECIMAL(12,2) NOT NULL,
    current_amount DECIMAL(12,2) DEFAULT 0,
    monthly_contribution DECIMAL(12,2) DEFAULT 0,
    target_date DATE,
    priority INTEGER DEFAULT 1,
    linked_account_id TEXT,
    status TEXT DEFAULT 'active', -- active, paused, completed, abandoned
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.goal_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    contributed_at TIMESTAMPTZ DEFAULT now(),
    method TEXT DEFAULT 'manual_client', -- auto_plaid, manual_client, manual_admin
    note TEXT
);

-- 5. RLS Policies (Bright Professional Security)

-- Enable RLS on all new tables
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expense_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;

-- Generic Policies using is_admin()
-- Recurring Expenses
CREATE POLICY "Users can view own recurring expenses" ON public.recurring_expenses FOR SELECT USING (auth.uid() = client_id OR is_admin());
CREATE POLICY "Users can insert own recurring expenses" ON public.recurring_expenses FOR INSERT WITH CHECK (auth.uid() = client_id OR is_admin());
CREATE POLICY "Users can update own recurring expenses" ON public.recurring_expenses FOR UPDATE USING (auth.uid() = client_id OR is_admin());

-- Monthly Summaries
CREATE POLICY "Users can view own monthly summaries" ON public.monthly_summaries FOR SELECT USING (auth.uid() = client_id OR is_admin());

-- Subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = client_id OR is_admin());
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions FOR UPDATE USING (auth.uid() = client_id OR is_admin());

-- Savings Goals
CREATE POLICY "Users can view own savings goals" ON public.savings_goals FOR SELECT USING (auth.uid() = client_id OR is_admin());
CREATE POLICY "Users can manage own savings goals" ON public.savings_goals FOR ALL USING (auth.uid() = client_id OR is_admin());

-- Income Sources
CREATE POLICY "Users can view own income sources" ON public.income_sources FOR SELECT USING (auth.uid() = client_id OR is_admin());

-- Goal Contributions
CREATE POLICY "Users can view own goal contributions" ON public.goal_contributions FOR SELECT USING (auth.uid() = client_id OR is_admin());
CREATE POLICY "Users can insert own goal contributions" ON public.goal_contributions FOR INSERT WITH CHECK (auth.uid() = client_id OR is_admin());
