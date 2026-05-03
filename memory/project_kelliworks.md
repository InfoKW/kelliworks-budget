---
name: KelliWorks Client Portal Build
description: Full Next.js 16 financial dashboard built for KelliWorks accounting firm — project location and status
type: project
---

Built the full KelliWorks Client Portal at /Users/mac/Desktop/kelliworks-client-portal.

**Why:** KelliWorks accounting firm needs a white-labeled financial dashboard for clients with Plaid bank sync, budget tracking, and Stripe subscription gating.

**How to apply:** When continuing this project, work from /Users/mac/Desktop/kelliworks-client-portal. The build passes (`npm run build` in that directory). Stack: Next.js 16 App Router + TypeScript + Tailwind + Supabase + Plaid + Stripe + Insforge deployment.

Key completed items:
- All 21 routes build cleanly
- Supabase schema at supabase/schema.sql — run this in Supabase SQL editor before first deploy
- .env.local.example shows all required env vars
- insforge.config.json configured with daily 6am transaction sync cron
- src/proxy.ts handles auth/subscription route protection (Next.js 16 uses "proxy" not "middleware")
- Budget matcher (src/lib/budget/matcher.ts) fuzzy-matches Plaid transactions to budget lines and auto-generates yellow/red alerts

Next steps before going live:
1. Create Supabase project → run supabase/schema.sql
2. Get Plaid sandbox credentials
3. Get Stripe keys + configure webhook to /api/stripe/webhook
4. Fill in .env.local
5. Push to GitHub → connect Insforge → deploy
