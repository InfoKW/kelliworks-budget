export type UserRole = 'client' | 'admin'
export type SubscriptionStatus = 'active' | 'inactive' | 'past_due' | 'canceled'
export type BudgetLineStatus = 'pending' | 'paid' | 'partial' | 'overdue'
export type AlertSeverity = 'yellow' | 'red'
export type AlertType = 'untracked_expense' | 'over_budget' | 'large_transaction' | 'duplicate_payment' | 'missed_payment' | 'unusual_merchant'
export type AlertStatus = 'pending' | 'acknowledged' | 'resolved' | 'escalated'

export interface Profile {
  id: string
  full_name: string | null
  email: string
  role: UserRole
  stripe_customer_id: string | null
  plaid_user_token: string | null
  subscription_status: SubscriptionStatus
  created_at: string
}

export type PlaidItemStatus = 'good' | 'login_required' | 'pending_expiration' | 'pending_disconnect' | 'error'

export interface PlaidItem {
  id: string
  user_id: string
  item_id: string
  institution_name: string | null
  cursor: string | null
  last_synced_at: string | null
  item_status: PlaidItemStatus
  consent_expiration_time: string | null
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  plaid_transaction_id: string
  account_id: string
  amount: number
  date: string
  name: string
  merchant_name: string | null
  category: string[]
  personal_finance_category_detailed: string | null
  pending: boolean
  enriched_merchant_name: string | null
  enriched_logo_url: string | null
  enriched_website: string | null
  enriched_phone_number: string | null
  enriched_payment_channel: string | null
  enriched_location: Record<string, unknown> | null
  enriched_counterparties: Record<string, unknown>[] | null
  enriched_personal_finance_category: Record<string, unknown> | null
  enriched_at: string | null
  budget_line_id: string | null
  is_matched: boolean
  is_untracked: boolean
  removed_at: string | null
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  month: string
  total_estimated: number
  notes: string | null
  created_by: string
  created_at: string
}

export interface BudgetLine {
  id: string
  budget_id: string
  user_id: string
  category: string
  description: string | null
  estimated_amount: number
  actual_amount: number
  status: BudgetLineStatus
  due_day: number | null
  paid_date: string | null
  notes: string | null
  created_at: string
}

export interface AccountBalance {
  plaid_item_id: string
  institution_name: string | null
  account_id: string
  account_name: string
  official_name: string | null
  type: string
  subtype: string | null
  mask: string | null
  available: number | null
  current_balance: number | null
  credit_limit: number | null
  iso_currency_code: string | null
}

export interface PlaidAccount {
  id: string
  user_id: string
  plaid_item_id: string
  account_id: string
  name: string | null
  mask: string | null
  type: string | null
  subtype: string | null
  authorized_at: string
  removed_at: string | null
}

export interface StatementMetadata {
  id: string
  user_id: string
  plaid_item_id: string
  institution_name: string | null
  statement_id: string
  account_id: string
  account_name: string | null
  account_type: string | null
  month: number
  year: number
  fetched_at: string
}

export interface SignalEvaluation {
  id: string
  user_id: string
  plaid_item_id: string | null
  account_id: string
  client_transaction_id: string
  amount: number
  customer_return_risk_score: number | null
  customer_return_risk_tier: string | null
  bank_return_risk_score: number | null
  bank_return_risk_tier: string | null
  ruleset_result: 'ACCEPT' | 'REROUTE' | 'REVIEW' | null
  core_attributes: Record<string, unknown> | null
  initiated: boolean | null
  payment_decision: string | null
  decided_at: string | null
  return_code: string | null
  returned_at: string | null
  created_at: string
}

export interface LiabilitySnapshot {
  id: string
  user_id: string
  plaid_item_id: string
  institution_name: string | null
  credit_data: Record<string, unknown>[] | null
  student_data: Record<string, unknown>[] | null
  mortgage_data: Record<string, unknown>[] | null
  fetched_at: string
}

export type IncomeType = 'bank' | 'payroll' | 'document'
export type IncomeReportStatus = 'pending' | 'ready' | 'error'

export interface IncomeReport {
  id: string
  user_id: string
  income_type: IncomeType
  status: IncomeReportStatus
  report_data: Record<string, unknown> | null
  employment_data: Record<string, unknown> | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export type AssetReportStatus = 'pending' | 'ready' | 'error'

export interface AssetReport {
  id: string
  user_id: string
  asset_report_id: string | null
  asset_report_token: string
  status: AssetReportStatus
  days_requested: number
  report_data: Record<string, unknown> | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface Alert {
  id: string
  user_id: string
  transaction_id: string | null
  budget_line_id: string | null
  severity: AlertSeverity
  type: AlertType
  title: string
  description: string | null
  amount: number | null
  status: AlertStatus
  acknowledged_at: string | null
  acknowledged_by: string | null
  created_at: string
}
