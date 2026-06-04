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
  subscription_status: SubscriptionStatus
  created_at: string
}

export interface PlaidItem {
  id: string
  user_id: string
  item_id: string
  institution_name: string | null
  cursor: string | null
  last_synced_at: string | null
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
  budget_line_id: string | null
  is_matched: boolean
  is_untracked: boolean
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
