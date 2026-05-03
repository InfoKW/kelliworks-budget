Session 2 Additions
Added: May 2026 Status: Brainstorm complete — ready for integration into CLAUDE.md Note: These five modules are additions to the core app defined in BRAINSTORM.md (Session 1).
Table of Contents
1. Monthly Recurring Expenses & Fixed Expenses 2. Expense & Revenue Trends
3. Subscriptions Tracker
4. Income & Savings Goals
5. Affiliate Connectors
1. Monthly Recurring Expenses & Fixed Expenses
Purpose
A dedicated view of predictable, repeating financial obligations — separate from the general budget tracker. Tracks fixed commitments over time, not just month-to-month.
Auto-Detection from Plaid
Same merchant, similar amount, roughly same date each month → candidate recurring expense
Surfaced to client: “We noticed this looks like a recurring charge — want to add it to your fixed expenses?”
One-tap confirm or dismiss
Kelli can promote any transaction to recurring from admin
Detection runs after each sync cycle — most clients 80% populated within first two
       
 syncs
Pay Date Timeline View
Each fixed expense row: Vendor | Category | Expected Amount | Account | Status this month Upcoming — due date hasn’t passed
Paid — matching transaction posted
Overdue — due date passed, no match found
Amount Changed — posted amount differs from expected
Draggable Date Range Gauge
Dual-handle range slider at the top of the module
Left handle = start date, right handle = end date
Quick-select pills: This Month · Next 30 · Next 90 · YTD · Custom Everything below recalculates in real time as handles are dragged:
Committed spend total for the selected window
Timeline — only pay dates within range shown
Category breakdown re-totaled for window
Per-account load updated (”$1,840 hits your Chase checking in this window”)
Gauge is sticky — stays visible while scrolling the expense list below
Same gauge control used consistently across Trends and other modules
Admin side: Kelli uses same gauge for year-end reviews and PDF export range selection
Vendor Category Breakdown
Groups: Housing, Utilities, Subscriptions, Debt Service, Insurance, Business Each group shows: total monthly committed spend, vendor count, % of total fixed obligations Kelli customizes categories per client from admin.
Amount Variance Tracking
History tracked per vendor: Jan $15.99 | Feb $15.99 | Mar $22.99 ← flagged Increase >5% → yellow alert
    
 Increase >20% → red alert requiring acknowledgment Client can update expected amount with noted reason Full amount history preserved in admin view
Monthly Committed Spend Summary Card
Total fixed obligations this month
Already paid / still pending / overdue breakdown vs. last month delta
Client Interactions
Confirm or dismiss auto-detected recurring expenses
Manually add expenses Plaid didn’t catch (e.g., rent paid by check)
Mark expense as canceled — archived with end date logged
Add notes to any expense (e.g., “This increases in October — annual renewal”) Cannot delete historical records — archive only
Kelli’s Admin View
Full recurring expense list per client — auto-detected vs. manually added flagged separately
Add, edit, or archive any recurring expense
Override expected amount and pay date
See which expenses haven’t matched a transaction this month
Bulk setup tool for onboarding — paste known fixed expenses to pre-populate
Supabase Schema
  recurring_expenses:
    id, client_id, vendor_name, vendor_category,
    amount, amount_last_charged,
    pay_date (day of month), account_id, frequency,
    started_at, last_charged_at,
    status (active/paused/canceled),
    auto_detected (bool), manually_added (bool),
    plaid_transaction_ids[]
 
  recurring_expense_history:
  id, recurring_expense_id, client_id,
  month (YYYY-MM),
  expected_amount, actual_amount,
  expected_date, actual_date,
  status (paid/overdue/skipped/amount_changed),
  matched_transaction_id, client_note
 2. Expense & Revenue Trends
Two Distinct Views
Revenue Trends
Where money comes in from Income sources over time Consistency + growth patterns Useful for cash flow forecasting
Expense Trends — Primary Chart
Expense Trends
Where money goes out
Spending by category over time
Creep, spikes, seasonal patterns Useful for budget adjustment decisions
                    Stacked bar chart by month — each bar segmented by category
Toggle: Stacked view / Line view per category / Single category isolation Trend line overlay showing direction (up/down/flat)
Month-over-month delta label on each bar (+/-)
Seasonal pattern detection after 3+ months of data
Highest spend category callout card at top of view
Category Drill-Down
Tap any chart segment → opens category detail:
All transactions in that category for selected period Average monthly spend for that category

 Highest and lowest months
Vendor breakdown within category (e.g., Dining: DoorDash $340, Restaurants $900)
Revenue Trends — Primary Chart
Line chart by month — one line per income source
Sources auto-detected and labeled: Salary, Freelance, Rental, Business, Dividends, etc.
Income consistency score — how predictable is income (useful for loan/lease applications)
Primary vs. secondary income percentage split
Gap detection — expected income not arrived → yellow alert
Revenue vs. Expense Overlay
Income line in teal, expense bars in navy on same chart
Net position per month shown below (positive = surplus, negative = deficit)
Running surplus/deficit line across selected period
Plain-language summary card: “Over the last 6 months you’ve averaged a $420/month surplus”
Date Range Gauge
Same draggable control as Fixed Expenses module — consistent UX pattern Default view: last 6 months
Quick-select pills: 3 months · 6 months · 12 months · YTD · Custom
Range persists when switching between Revenue and Expense tabs
Trend Insight Cards
Auto-generated plain-language cards below main chart (rule-based, not AI): Cap at 3 visible cards, rotate by recency and severity
Examples:
“Your grocery spend has increased 23% over the last 3 months”
“Your income has been consistent — within ±5% for 6 straight months”

 “Utilities spike every December — budget $180 extra this coming month” “Subscriptions have grown from $89 to $234 over 12 months”
Kelli’s Admin Trends View
Same charts available per client — useful for quarterly review conversations
Phase 2: benchmark overlay vs. anonymized client-base averages
Export to KelliWorks-branded PDF for any selected date range
Annotation tool — add notes to any month that appear as markers on the chart for both Kelli and client
Data Requirements by Maturity
<2 months: “Building your trend history” placeholder — no chart yet 2–3 months: basic bar chart, no trend line
4–6 months: trend line enabled, seasonal detection begins
12+ months: full feature set including year-over-year comparison Always display “Based on X months of data” label on every chart
Supabase Schema
  monthly_summaries:
    id, client_id, month (YYYY-MM),
    total_income, total_expenses, net_position,
    category_breakdown (jsonb),
    income_sources (jsonb),
    computed_at
  trend_insights:
    id, client_id, insight_type,
    category, message, severity (info/warning),
    generated_at, dismissed_at
3. Subscriptions Tracker
  Why Its Own Module

 Clients consistently underestimate how many subscriptions they have and their total cost
Unique lifecycle patterns: free trials that auto-convert, annual renewals that surprise, silent price increases
Most immediately actionable category — clients can cancel today Begin-to-date lifetime spend is the standout feature — often a wake-up call
Auto-Detection from Plaid
Known subscription merchants auto-detected and pre-labeled
Known merchant database maintained: logos, category tags, cancellation URLs
Unknown recurring small charges → “Possible Subscription” — client confirms or dismisses
Detection runs after every sync cycle
Subscription Card View
Each subscription as a visual card:
Vendor logo + name + category tag
Monthly or annual amount
Started date — when first charge was detected
Total paid to date — begin-to-date cumulative lifetime spend Next expected charge date + which account it hits
Status badge: Active / Paused / Canceled / Trial
Subscription Snapshot — Summary Card
 Active subscriptions:
Monthly committed:
Annual projected:
Total paid (all time):
14
$342.87
$4,114.44
$12,847.22
Sortable by: highest monthly cost, longest active, highest lifetime spend Filterable by: category, account, status

 Trial & Renewal Alerts
Free trial detected ($0 or $1 auth from known merchant) → trial start flagged Yellow alert fires X days before trial converts to paid (configurable, default 3 days)
Annual renewal: yellow alert 14 days before, shows last year’s amount + any price change
Price increase on any subscription → immediate yellow alert
Cancellation Verification Workflow
1. Client taps “Cancel This” on subscription card
2. App shows direct cancellation URL from merchant database — no hunting
3. Client marks “Cancellation Requested” — reminder set for next expected charge date 4. If charge still posts → yellow alert: “Did you complete the cancellation?”
5. No charge posts for one full cycle → status auto-updates to Canceled, end date logged
Category Grouping (Collapsible Accordion)
Entertainment — Netflix, Hulu, Spotify, Apple TV+ Business Tools — Adobe, Notion, Slack, QuickBooks Health & Fitness — gym, Peloton, meditation apps News & Media — NYT, WSJ, Substack
Shopping — Amazon Prime, Costco, delivery services
Utilities & Tech — iCloud, Google One, VPN, antivirus
Unconfirmed — detected but not yet labeled Each group shows its monthly subtotal.
Subscription Audit Feature (Quarterly)
Kelli triggers from admin or client is prompted after 90 days Steps through each active subscription one at a time
Client marks each: Keep / Cancel / Review Later
Summary of decisions generated and logged
       Kelli sees audit results in admin — useful quarterly review conversation starter

 Kelli’s Admin View
Full subscription list per client with begin dates and lifetime spend
Trigger subscription audit manually for any client
Add or correct subscription details Plaid missed
See which clients have highest subscription loads — proactive outreach opportunity Export subscription report: all active subs, monthly total, lifetime total — clean PDF
Supabase Schema
  subscriptions:
    id, client_id, vendor_name, vendor_logo_url,
    category, account_id,
    amount, frequency (monthly/annual/quarterly),
    started_at, last_charged_at, next_expected_at,
    status (trial/active/cancellation_requested/canceled/paused),
    canceled_at, cancellation_url,
    auto_detected (bool),
    total_paid_to_date (computed),
    plaid_transaction_ids[]
  subscription_audits:
    id, client_id, triggered_at, triggered_by (client/admin),
    completed_at,
    decisions (jsonb) -- [{sub_id, decision: keep/cancel/review}]
4. Income & Savings Goals
Income Tracking
Auto-Detection from Plaid Large recurring credits auto-detected and labeled by client or Kelli: Salary / Hourly, Freelance / Contract, Rental Income, Business Revenue, Government Benefits, Investment Dividends, Child Support / Alimony, Other
Income Dashboard View
Total received this month
Expected but pending (e.g., unpaid freelance invoice) vs. last month delta
  
 Per-source breakdown with percentage contribution bars
Income Alerts
Expected source doesn’t arrive within 3 days of usual date → yellow alert Significant income drop vs. prior 3-month average → yellow alert to client and Kelli New unrecognized large credit → blue info alert to label it
Savings Goals
Goal Types with Smart Defaults
  Goal Type
Emergency Fund Purchase
Debt Payoff Investment Custom
Goal Progress Card
Smart Default
Target = 3–6x monthly expenses (auto-calculated from Plaid data) Target amount + date → monthly contribution auto-calculated Links to liability — tracks balance reduction as progress
Connects to affiliate connector (Phase 2)
Blank slate
                      Progress bar with % complete
Monthly contribution: target vs. actual this month
On-track / behind / ahead status with plain-language suggestion
If behind: “Contributing $600 this month would get you back on track” If ahead: “You could reach this goal 2 months early”
Contribution Tracking
Automatic: Plaid-linked savings account — balance changes detected as contributions Manual: client taps “Add Funds,” enters amount + optional note
Kelli can log contributions from admin side
Goal Prioritization
Client drag-to-reorder goals — Priority 1 highlighted as primary focus

 Monthly contribution suggestions distributed across goals by priority weighting Summary card: “After fixed expenses and budget, you have ~$680/mo available for
savings goals”
Kelli can suggest prioritization from admin — recommendation only, not enforced
Kelli’s Role in Goals
Push recommended goals to client dashboard from admin
See all active goals + on-track / behind / no goals set status per client
Flag if client is consistently spending their savings surplus without contributing to goals
Milestone Celebrations
Confetti animation + congratulatory message at 25%, 50%, 75%, 100% Completed goals move to “Wins” history tab
Completion summary: “You reached your Vacation Fund goal! It took 8 months and $5,000.”
Net Worth Lite (Phase 2)
Assets: Plaid account balances + manually entered (home value, vehicle) Liabilities: loan + credit card balances from Plaid
Simple net worth number updated monthly
Trend line over time
Feeds directly into affiliate connector investment account view
Supabase Schema
  savings_goals:
    id, client_id, name, goal_type,
    target_amount, current_amount,
    monthly_contribution (target),
    target_date (nullable), priority,
    linked_account_id (nullable),
    status (active/paused/completed/abandoned),
    created_at, completed_at
  income_sources:
    id, client_id, label, source_type,
 
        expected_amount, expected_day_of_month,
    last_received_at, last_amount,
    plaid_account_id (nullable),
    status (active/inactive)
  goal_contributions:
    id, goal_id, client_id,
    amount, contributed_at,
    method (auto_plaid/manual_client/manual_admin),
    note
5. Affiliate Connectors
REVISIT REQUIRED — Phase 2 Only Affiliate compensation model and management platform to be confirmed before any build work begins. Kelli wants to use a specific affiliate management platform for easy compensation setup and tracking. Full compliance review required before launch. Do not build until core modules (Sections 1–4 above + Session 1 modules) are stable and live.
Revisit Prompt
When ready to return to this module, use this prompt in a new session:
“I’m building the KelliWorks financial dashboard — a subscription-based client app using Next.js 14, Supabase, Plaid, and Stripe. I have a BRAINSTORM.md in my repo with all architectural decisions. I need to revisit the Affiliate Connectors module. The concept is: clients see read-only data from connected financial accounts (investments, life insurance, brokerage) alongside KelliWorks-branded affiliate referral links for providers they don’t have yet. I want to set up affiliate compensation tracking through [PLATFORM NAME]. Help me design: (1) how the affiliate platform integrates with the dashboard, (2) how compensation is tracked per client referral, (3) the admin dashboard view for Kelli to monitor clicks and conversions, and (4) FTC disclosure and compliance requirements for an accounting firm offering affiliate referrals.”
    Four Connector Categories
Category
FA (Financial Advisor) Invest
Examples
Betterment, Facet, Personal Capital Acorns, Robinhood, Fidelity, Schwab
              
   Life Insurance Policygenius, Ladder, Haven Life Stocks & Brokerage TD Ameritrade, E*TRADE, Webull
Two Functions Per Connector
1. Data pull — client connects existing account, balance/position data surfaces read-only
in dashboard
2. Affiliate referral — client doesn’t have account, KelliWorks-branded referral link shown
Affiliate Revenue Model (TBD)
Each referral link = Kelli’s unique affiliate URL, tracked per click and conversion Compensation paid by provider to Kelli — not charged to client
FTC disclosure mandatory on every referral card
Affiliate management platform: TO BE CONFIRMED
Kelli manages all affiliate links from admin settings
      Smart Recommendation Engine
Client Signal
Has savings goal, no investment account High income, no FA connection
Has dependents in profile
Large stock portfolio via Plaid
Recommended Connector
Acorns, Betterment
Facet Wealth, Personal Capital Policygenius (life insurance) Schwab, TD Ameritrade
Upgrade from robo-advisor to FA
                      Net worth growing consistently
Kelli controls all recommendations per client from admin — never fully algorithmic.
  Connection Methods
1. Plaid Investment Endpoints — preferred, no second login required
2. Provider OAuth / API — scoped read-only, access token encrypted in Supabase
3. Manual Entry — for providers without API, labeled “Manually updated · Last: [date]”

Portfolio Summary Card (Aggregate)
Rolls up all connected financial accounts into one net worth view: Checking + Savings (Plaid)
Investments (connected providers)
Retirement / 401k (manual entry)
Life Insurance value
Total Net Worth + trend vs. prior period
Compliance Requirements
FTC disclosure on every referral card — non-negotiable
FINRA rules may apply if Kelli holds securities licenses — verify before launch Life insurance referrals may require state-specific disclosure language
Legal review of all affiliate language recommended before Phase 2 launch
Supabase Schema (Draft — Subject to Change)
  affiliate_connectors:
    id, name, category (fa/invest/life/stocks),
    logo_url, description, affiliate_url,
    plaid_supported (bool), oauth_supported (bool),
    is_active, display_order
  client_connectors:
    id, client_id, connector_id,
    connection_method (plaid/oauth/manual),
    access_token (encrypted, nullable),
    last_synced_at, status (connected/manual/disconnected),
    current_balance, last_balance_update
  affiliate_clicks:
    id, client_id, connector_id,
    clicked_at, converted (bool), converted_at
Session 2 brainstorm complete. Integrate these sections into CLAUDE.md and BRAINSTORM.md before next build session.