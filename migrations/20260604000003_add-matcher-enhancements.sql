-- Add match metadata to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS match_confidence integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS match_source text CHECK (match_source IN ('rule', 'auto', 'ai', 'manual'));

-- Merchant matching rules — user-defined patterns that always map to a budget category
CREATE TABLE IF NOT EXISTS public.merchant_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  merchant_pattern text NOT NULL,
  budget_line_category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, merchant_pattern)
);

ALTER TABLE public.merchant_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_own_merchant_rules" ON public.merchant_rules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admin_all_merchant_rules" ON public.merchant_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
