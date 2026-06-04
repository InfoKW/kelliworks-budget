**KelliWorks — So You Don't Have To** 

Developer Handoff v2.0 — Confidential 

## **KelliWorks** 

## _So You Don't Have To._ 

Client Financial Portal — Developer Handoff  |  v2.0  |  May 2026  |  CONFIDENTIAL 

## **1. What KelliWorks Is** 

KelliWorks is a financial clarity platform built for the entrepreneur who runs both a business and a personal life — and needs to see the full picture of both in one place, in plain English. 

_The business owner connects all their accounts — business checking, personal checking, credit cards, investments, savings — and KelliWorks surfaces what matters: balances, what's due, what's overdue, how spending compares to budget, and what their financial health actually looks like. No spreadsheets. No toggling between apps. One snapshot._ 

## **BRAND PROMISE** 

"KelliWorks so you don't have to." Kelli and the KelliWorks advisor team act as the client's dedicated financial assistant — they manage the setup, monitor the data, and push insights and alerts to the client so the client stays informed without doing the work. 

## **WHO IS THIS FOR** 

- The small-to-medium business owner who wears every hat 

- Someone whose personal and business finances are tightly linked 

- A founder who wants CFO-level financial visibility without hiring a CFO 

- A client who trusts KelliWorks to catch what they would miss 

## **CONTACT** 

Kelli Lewis — kelli@kelliworks.com 

## **LIVE LANDING PAGE** 

https://z6sy837c.insforge.site 

## **2. Current State** 

Assets already in place. Developer inherits these — do not rebuild. 

|**Asset**|**Status**|**Notes**|
|---|---|---|
|Marketing Landing Page|✅ Live|InsForge — z6sy837c.insforge.site. Do not touch.|



Page 1 

© 2026 KelliWorks — Private & Confidential 

**KelliWorks — So You Don't Have To** 

Developer Handoff v2.0 — Confidential 

|**Asset**|**Status**|**Notes**|
|---|---|---|
|||Update CTAs only.|
|Plaid Integration|✅ Credentials ready|Keys in env. Used for all account types.|
|QuickBooks Integration|✅ Credentials ready|QB Online OAuth configured. Keys in env.|
|Zapier Account|✅ Active|All automation workflows built here.|
|Vercel|✅ Active|All new app code deploys here.|
|Hostinger|✅ Active|DNS managed here.|
|Client Dashboard|✅ Not built|All login CTAs lead nowhere. This is what we are<br>building.|
|Auth System|✅ Not built|No authentication exists yet.|



## **3. Onboarding Model** 

KelliWorks manages all client onboarding today. Clients do not self-configure. 

|**Tier**|**How It Works**|**Cost Model**|
|---|---|---|
|Standard Onboarding|KelliWorks advisor connects all accounts, builds<br>budget, configures alerts. Client just logs in.|Included in service|
|Supported Self-<br>Onboarding (Phase 2)|Client follows guided wizard with KelliWorks support<br>available during setup.|Add-on fee|
|Full Self-Onboarding<br>(Phase 3)|Client completes setup independently using in-app<br>wizard.|Future roadmap|



⚠  Phase 1 build: admin-only onboarding (Kelli triggers everything). Design data model to support self-serve in future without a rebuild. 

## **4. Recommended Tech Stack** 

|**Layer**|**Technology**|**Purpose**|
|---|---|---|
|Frontend|Next.js (React)|Client portal + admin dashboard|
|Deployment|Vercel|Active. CI/CD from GitHub.|
|Domain|Hostinger|DNS — point subdomain to Vercel.|
|Database|Supabase (PostgreSQL)|All client data, transactions, budgets, alerts.|
|Auth|Supabase Auth + MFA|See Section 5.|
|Bank + Investment<br>Data|Plaid API|All account types: checking, savings, credit,<br>investment.|
|Accounting Sync|QuickBooks Online API|Transaction verification, P&L, reconciliation.|



Page 2 

© 2026 KelliWorks — Private & Confidential 

**KelliWorks — So You Don't Have To** 

Developer Handoff v2.0 — Confidential 

|**Layer**|**Technology**|**Purpose**|
|---|---|---|
|Bill Intake|Twilio (SMS) + Postmark<br>(Email) + OCR|Multi-channel bill input — see Feature 5.3.|
|Payment Infrastructure|TBD — Phase 2|See Feature 5.4. Under evaluation.|
|Automation|Zapier|Alerts, reminders, reports.|
|AI / Chat|OpenAI GPT-4o API|CFO-level advisor intelligence + chat.|
|Email Transactional|Resend or SendGrid|Alerts, summaries, reports.|



## **5. Authentication & Security** 

## **Highest priority. Clients are sharing live personal and business bank data. Every layer must be hardened.** 

- Supabase Auth — email + password with mandatory TOTP MFA (no bypass) 

- Roles: admin (Kelli + advisors) and client — separate permissions 

- Row Level Security (RLS) on ALL tables — client rows are invisible to other clients 

- Session timeout: 15 minutes inactivity → auto logout 

- JWT short expiry: 15-min access token, 7-day rotating refresh token 

- All API keys server-side only — never in client bundle 

- Plaid and QB tokens encrypted at rest in Supabase — never exposed to frontend 

- TLS 1.3 in transit, AES-256 at rest 

- Audit log: every login, acknowledgment, and admin action logged with IP + timestamp 

- Audit log is append-only — no deletes or updates permitted on that table 

Page 3 

© 2026 KelliWorks — Private & Confidential 

**KelliWorks — So You Don't Have To** 

Developer Handoff v2.0 — Confidential 

## **6. Feature Specifications** 

All features below are net-new. Nothing exists behind the login screen yet. 

## **6.1  Full-Picture Financial Dashboard** 

The home screen shows the entrepreneur's complete financial snapshot — business and personal — in one view. Plain language. No accounting jargon. 

- Business accounts: checking, savings, business credit cards — all connected via Plaid 

- Personal accounts: personal checking, savings, personal credit cards — all connected via Plaid 

- Investment accounts: brokerage, retirement (401k, IRA), savings instruments — Plaid Investments 

- Single net worth widget: total assets minus total liabilities at a glance 

- Cash position widget: available liquidity across all accounts right now 

- Account health color indicator: green (all clear) / yellow (attention needed) / red (action required) 

- Last sync timestamp per account — client always knows how fresh the data is 

- Language is plain English: "You have $12,400 available across your business accounts" not accounting terminology 

## **6.2  Monthly Recurring Bills Tracker** 

- All recurring bills listed by due date — business and personal combined or filterable by type 

- Fields: Vendor / Expected Amount / Actual Amount / Due Date / Account / ACH flag / Status 

- Status values: Upcoming / Cleared (bank confirmed) / Overdue / Fluctuating Amount 

- Auto-match: Plaid transaction clears → bill status updates to Cleared automatically 

- Fluctuating amount flag: if actual differs from expected by >15% → Yellow Alert fired 

- ACH / e-check bills are specifically flagged for bank book reconciliation 

- Kelli (admin) manages the master bills list per client 

## **6.3  Past Due Alerts — Multi-Channel Input** 

The most important real-time feature. Client can notify KelliWorks of a bill, expense, or financial event using whichever channel is easiest — the system does the rest. 

## **What the client can send:** 

- A text message: "Got a bill from AT&T for $340 due June 1" 

- A forwarded email: client forwards billing email to bills@kelliworks.com 

- A photo: client texts a photo of a paper bill → OCR extracts vendor, amount, due date 

- A simple update: "Paid the water bill today" → system marks it cleared 

## **Infrastructure needed:** 

- Twilio: dedicated inbound SMS number per client for text bill submission 

- Postmark (or Mailgun): inbound email parsing at bills@kelliworks.com → route to client by sender email address 

- OCR: Google Vision API or AWS Textract to extract structured data from bill photos 

Page 4 

© 2026 KelliWorks — Private & Confidential 

**KelliWorks — So You Don't Have To** 

Developer Handoff v2.0 — Confidential 

- NLP parsing: use GPT-4o to extract vendor / amount / due date from free-text messages 

- All inputs flow into a pending_bills queue — Kelli reviews and confirms before adding to tracker 

## **Alert System (2-tier):** 

- Yellow: bill due within 3 days not cleared / amount fluctuates >15% / QB mismatch 

- Red: overdue / insufficient funds / QB posting missing after 48h 

- Deposit-triggered re-evaluation: when a deposit hits → re-assess all open alerts 

- Client acknowledges each alert in-app — logged with timestamp for audit 

- Unacknowledged alerts after 24h → escalation email to Kelli 

## **6.4  Payment Scheduling  — PHASE 2 / UNDER CONSTRUCTION** 

## **UNDER CONSTRUCTION — PHASE 2** 

KelliWorks will support payment scheduling in a future phase. Infrastructure is under evaluation. Candidates include Bill.com, Melio, and direct ACH via banking API partners. 

- Phase 2 goal: client can schedule and initiate payments from within the portal 

- Kelli will approve before any payment is initiated — no auto-pay without advisor confirmation 

- Will integrate with recurring bills tracker and alert system once live 

⚠  Developer: build data model stubs for scheduled_payments table now so Phase 2 plugs in cleanly. No UI or payment logic needed in Phase 1. 

## **6.5  Budgeting — Business & Personal** 

- Kelli builds separate budgets: one for business, one for personal, per client per month 

- Estimate vs. Actuals table — live, updates every time Plaid syncs transactions 

- Variance column: $ and % over/under per category — color coded (green / yellow / red) 

- Business and personal views are filterable — client can see combined or separated 

- Rolling 3-month spending chart per category 

- Monthly close-out: Kelli marks month complete → client receives summary email with highlights 

- Budget history retained for year-over-year comparison 

## **6.6  Investment & Wealth Picture  — UPGRADED TIER** 

## **UPGRADED TIER FEATURE** 

Full investment picture connected via Plaid. Plain-English summaries. This is the entrepreneur seeing their full wealth position — not just their bank balance. 

## **Account connections (Plaid Investments):** 

- Brokerage accounts (Fidelity, Schwab, E*Trade, Robinhood, etc.) 

- Retirement accounts: 401(k), IRA, Roth IRA 

- Other investment vehicles supported by Plaid 

- Manual entry fallback for institutions not supported by Plaid 

Page 5 

© 2026 KelliWorks — Private & Confidential 

**KelliWorks — So You Don't Have To** 

Developer Handoff v2.0 — Confidential 

## **What the client can see and ask:** 

- Current investment balances across all institutions — one number, one screen 

- Total net worth: investments + bank accounts − liabilities 

- Investment performance: gains and losses over a selected time period 

- Capital gains summary: realized vs. unrealized for a period (tax awareness snapshot) 

- Capital losses summary: offset opportunities highlighted in plain language 

- "Ask your investments" AI chat: "How did my portfolio do this quarter?" → plain-English answer 

- Trend chart: total investment value month-over-month rolling 12 months 

- Asset allocation snapshot: how money is distributed across account types 

⚠  All investment summaries must be in plain language. No ticker symbols without a plain-English label. No jargon without explanation. Client is a business owner, not a trader. 

⚠  Guardrail: no specific investment advice. "Your tech holdings are down 12% this quarter" is a fact. "Sell your Apple shares" is advice we do not give. 

## **6.7  QuickBooks Integration — Standard Verification  (UPGRADED TIER)** 

## **UPGRADED TIER FEATURE** 

Read-only connection to QB. Purpose: verify that what's in QuickBooks matches the real bank data. Surfaces discrepancies before they become problems. Helps the business owner hold their bookkeeper accountable. 

- Daily sync: pull QB transactions for same period as Plaid data 

- Auto-match algorithm: Plaid bank transaction ↔ QB entry by date + amount + vendor (fuzzy match) 

- Mismatch detection — flags: 

   - Transaction cleared in bank but not posted in QB 

   - QB entry amount differs from bank amount 

   - QB entry exists with no corresponding bank transaction 

   - Items posted to wrong category or account code (compared to client's stated preferences) 

- Uncategorized items in QB: any QB transaction with no category → surfaced to client for quick resolution 

- In-app resolution: client sees uncategorized or mismatched item and can answer right there 

   - "What is this charge?" → client types response → queued for bookkeeper action 

   - "This should be under Marketing, not Meals" → logged as correction suggestion 

- Mismatch dashboard widget: "X items need your attention" — drill-down per item 

- Bank balance reconciliation: QB book balance vs. Plaid actual balance — flag any gap 

- Plain-English summary: "Your QuickBooks shows $3,200 more than your actual bank balance. 4 transactions may not be posted." 

- Export: mismatch and reconciliation report as PDF or CSV 

## **6.8  QuickBooks Advanced — Budget vs. P&L + Bookkeeper Accountability (UPGRADED TIER)** 

## **UPGRADED TIER FEATURE** 

Page 6 

© 2026 KelliWorks — Private & Confidential 

**KelliWorks — So You Don't Have To** 

Developer Handoff v2.0 — Confidential 

The most powerful QB integration layer. Connects budgeting module to QuickBooks P&L and empowers the business owner to catch their bookkeeper — or whoever manages QB — with smart, specific questions. 

## **Budget vs. P&L Overlay:** 

- Pull QuickBooks Profit & Loss report via QB API for the current period 

- Overlay QB P&L actuals against the KelliWorks budget — side-by-side comparison 

- Highlight categories where QB P&L differs significantly from KelliWorks budget (>10% variance) 

- Flag income vs. expense lines that are trending in the wrong direction 

- Plain-English insight: "Your QB P&L shows $8,400 in Meals & Entertainment but your budget was $2,000. Is this correct?" 

## **Bookkeeper Accountability Engine:** 

- Surface strong questions the owner can bring to their bookkeeper or accounting team: 

   - "4 transactions this month are uncategorized in QB. Who is reviewing these?" 

   - "Your QB balance is $2,100 higher than your bank. What transactions explain the difference?" 

   - "Payroll expense is 34% higher this month vs. last month in QB. Was there a bonus or error?" 

   - "3 vendor payments appear in QB twice — possible duplicate entries." 

- Owner resolves items in-app: confirms correct / flags as error / adds a note for bookkeeper 

- All owner responses logged and exportable for bookkeeper review session 

## **QB Two-Way Sync (Premium Add-On within Upgraded Tier):** 

- Kelli configures Chart of Accounts mapping: Plaid category → QB account code 

- Per-vendor override option available 

- Auto-push: categorized Plaid transactions create QB bank feed entries 

- Weekly QB posting report: all entries pushed, organized by account code, delivered by email Monday 8am 

## **6.9  AI Financial Chat** 

Embedded chat widget. Client can ask anything about their finances — their data or general business finance questions — and get a clear, plain-English answer. 

- Context injected per session: transactions / balances / alerts / budget / investment positions 

- Scope: client's own data + general business finance and accounting Q&A 

- Sample questions the system handles: 

   - "Why is my cash low this week?" 

   - "How does my spending compare to last month?" 

   - "What's my capital gain situation this year so far?" 

   - "What does accounts receivable mean?" 

   - "Am I on track with my budget?" 

- Model: GPT-4o, server-side API call, key never in client bundle 

- Guardrails in system prompt: no specific investment advice, no tax filing guidance, recommend CPA for tax questions 

- Chat history: session-only, not persisted (privacy) 

Page 7 

© 2026 KelliWorks — Private & Confidential 

**KelliWorks — So You Don't Have To** 

Developer Handoff v2.0 — Confidential 

## **6.10  KelliWorks CFO Advisor Engine** 

Proactive intelligence layer. KelliWorks doesn't wait for the client to ask — it surfaces what matters and pushes it to them. This is what separates KelliWorks from a dashboard and makes it a financial advisor. 

## **Financial Health Score:** 

- Monthly score (0–100) based on: cash position / budget adherence / debt-to-income / savings rate / QB reconciliation status 

- Displayed prominently on dashboard home screen 

- Trend arrow: up, down, or stable vs. last month 

## **Proactive Alerts pushed to client:** 

- Debt health: "Your total monthly debt obligations are 48% of your average monthly revenue. Industry benchmark is under 35%." 

- Income trends: "Your business revenue has declined 3 months in a row. Down 18% from your Q1 peak." 

- Spending alerts: "Your Q2 spending is trending 23% above Q1. Your top growing categories are Contractors (+$4,200) and Software (+$1,800)." 

- Cash flow warning: "At your current burn rate, your cash reserve covers 6 weeks of expenses." 

- Positive reinforcement: "You came in 12% under budget this month. Best month in 6 months." 

- Net worth milestone: "Your total net worth crossed $500K this month." 

## **CFO Snapshot Report (monthly, pushed by Kelli):** 

- 1-page summary: cash position / net worth / revenue vs. expenses / budget performance / investment gains / top 3 alerts 

- Written in plain English — no accounting language without explanation 

- Delivered by email at month close (triggered by Kelli, generated by AI from client data) 

- Client can also pull on-demand from dashboard at any time 

## **Trend Analysis (AI-powered):** 

- Income trends: month-over-month, quarter-over-quarter, year-over-year 

- Expense trends: by category, growing vs. shrinking spend areas identified 

- Seasonal pattern detection: "Your November expenses have been your highest month for 2 years running" 

- Capital gains and losses trend: taxable events summarized over rolling periods 

Page 8 

© 2026 KelliWorks — Private & Confidential 

**KelliWorks — So You Don't Have To** 

Developer Handoff v2.0 — Confidential 

## **7. Service Tiers** 

Feature gating by tier. Developer adds a tier field to the client table. Kelli sets tier per client. 

|**Standard**|**Upgraded**|**Upgraded + QB Advanced**|
|---|---|---|
|Full personal + business<br>dashboard|Everything in Standard, plus:|Everything in Upgraded, plus:|
|Plaid: all bank accounts (biz +<br>personal)|Investment accounts (Plaid<br>Investments)|QB Budget vs. P&L overlay|
|Monthly recurring bills tracker|Capital gains / losses summary|Bookkeeper accountability engine|
|Multi-channel bill input<br>(text/email/photo)|Investment trend charts|Owner in-app resolution of QB<br>items|
|2-tier alert system (Yellow / Red)|Full net worth snapshot|QB two-way auto-push sync|
|Budget: business + personal|QB Standard: verification +<br>mismatch alerts|Weekly QB posting report|
|Estimate vs. Actuals live table|QB bank balance reconciliation|QB uncategorized item resolution|
|AI chat (data + general finance)|CFO Advisor Engine (proactive<br>alerts)||
|Monthly CFO snapshot report|Investment AI Q&A||
|Payment scheduling: Phase 2<br>(TBD)|||



## **8. Zapier Automation Map** 

|**Trigger**|**Action**|**Timing**|
|---|---|---|
|Red alert created|Email to client + Kelli|Immediate|
|Alert unacknowledged 24h|Escalation email to Kelli|24h after creation|
|Inbound bill text (Twilio)|Create pending bill in queue|Immediate|
|Inbound bill email (Postmark)|Parse and create pending bill|Immediate|
|Plaid sync failure|Email to Kelli|Immediate|
|Monthly close-out triggered|Budget summary email to client|On admin trigger|
|QB mismatch detected (Upgraded)|Email notification to client|Immediate|
|Weekly QB report (Upgraded)|Email posting report to client|Monday 8am|
|CFO snapshot ready (admin trigger)|Email monthly report to client|On admin trigger|



Page 9 

© 2026 KelliWorks — Private & Confidential 

**KelliWorks — So You Don't Have To** 

Developer Handoff v2.0 — Confidential 

## **9. Database Schema Overview** 

All tables in Supabase (PostgreSQL). RLS enabled on every table. 

|**Table**|**Key Fields**|
|---|---|
|clients|id, name, email, tier (standard|upgraded|upgraded_qb), plaid_item_id, qb_realm_id,<br>twilio_number, intake_email, created_at|
|bank_accounts|id, client_id, plaid_account_id, name, type (business|personal|investment), subtype,<br>available_balance, current_balance, last_sync|
|transactions|id, client_id, account_id, plaid_transaction_id, date, amount, merchant_name,<br>category, account_type, is_ach, matched_bill_id|
|investment_holdings|id, client_id, account_id, plaid_holding_id, security_name, ticker, quantity, value,<br>cost_basis, unrealized_gain_loss|
|investment_snapshots|id, client_id, snapshot_date, total_value, total_cost_basis, total_gain_loss (monthly<br>rollup)|
|recurring_bills|id, client_id, vendor_name, expected_amount, due_day, account_id, is_ach,<br>account_type (biz|personal), active|
|bill_instances|id, bill_id, client_id, period, expected_amount, actual_amount, due_date, status,<br>matched_transaction_id|
|pending_bills|id, client_id, source (sms|email|photo), raw_content, parsed_vendor,<br>parsed_amount, parsed_due_date, status (pending_review|confirmed|rejected)|
|alerts|id, client_id, type (yellow|red), category, message, status (open|acknowledged),<br>created_at, acknowledged_at|
|budgets|id, client_id, period, category, account_type (biz|personal), estimated_amount,<br>is_closed|
|scheduled_payments|id, client_id, payee, amount, due_date, account_id, status, notes (Phase 2 — stub<br>only in Phase 1)|
|qb_mismatches|id, client_id, plaid_transaction_id, qb_entry_id, mismatch_type, owner_response,<br>resolved_at|
|qb_uncategorized|id, client_id, qb_entry_id, vendor, amount, date, owner_suggestion,<br>bookkeeper_action, resolved_at|
|cfо_insights|id, client_id, type, headline, detail, data_snapshot (JSONB), created_at, is_read|
|audit_log|id, user_id, client_id, action, metadata (JSONB), ip_address, created_at (append-<br>only)|



## **10. Environment Variables** 

|**Variable**|**Source**|**Status**|
|---|---|---|
|PLAID_CLIENT_ID|Plaid Dashboard|Already have|
|PLAID_SECRET|Plaid Dashboard|Already have|
|QB_CLIENT_ID|Intuit Developer|Already have|



Page 10 

© 2026 KelliWorks — Private & Confidential 

**KelliWorks — So You Don't Have To** 

Developer Handoff v2.0 — Confidential 

|**Variable**|**Source**|**Status**|
|---|---|---|
|QB_CLIENT_SECRET|Intuit Developer|Already have|
|ZAPIER_WEBHOOK_BASE_URL|Zapier|Already have|
|TWILIO_ACCOUNT_SID|Twilio (SMS intake)|Developer creates|
|TWILIO_AUTH_TOKEN|Twilio|Developer creates|
|TWILIO_PHONE_NUMBER|Twilio (per client or shared)|Developer creates|
|POSTMARK_SERVER_TOKEN|Postmark (inbound email)|Developer creates|
|BILL_INTAKE_EMAIL_DOMAIN|e.g. @bills.kelliworks.com|Developer configures|
|GOOGLE_VISION_API_KEY (or<br>AWS_TEXTRACT)|OCR for bill photos|Developer creates|
|SUPABASE_URL|Supabase project|Developer creates|
|SUPABASE_ANON_KEY|Supabase|Developer creates|
|SUPABASE_SERVICE_KEY|Supabase (server only)|Developer creates|
|OPENAI_API_KEY|OpenAI Platform|Developer creates|
|RESEND_API_KEY|Resend or SendGrid|Developer creates|



## **11. Open Questions for Developer** 

- Confirm Supabase vs. alternative for auth + DB 

- Confirm OCR provider: Google Vision API vs. AWS Textract — evaluate cost and accuracy 

- Confirm Twilio setup: one shared inbound number with client routing, or dedicated number per client 

- Confirm email provider: Resend vs. SendGrid for transactional emails 

- Update QB OAuth redirect URI in Intuit Developer Console to match Vercel domain before testing 

- Evaluate Plaid Investments coverage: confirm which brokerage institutions are supported before building — manual entry fallback required for unsupported institutions 

- Confirm subdomain: app.kelliworks.com or portal.kelliworks.com 

- Payment scheduling (Feature 6.4) infrastructure decision — recommend Bill.com or Melio evaluation before Phase 2 kickoff 

- Confirm OpenAI model: GPT-4o recommended — agree on spend ceiling per month 

## _**KelliWorks so you don't have to.**_ 

Questions: kelli@kelliworks.com 

Page 11 

© 2026 KelliWorks — Private & Confidential 

