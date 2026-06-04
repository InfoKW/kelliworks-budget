-- Add notes column to budget_lines for storing Excel import metadata
-- (bill_type, frequency, payment_account, auto_pay, due_week, original_status, original_notes)
ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS notes text;
