import Link from 'next/link'
import { ShieldCheck, TrendingUp, Bell, Users, CheckCircle, BarChart3, Link2, AlertTriangle } from 'lucide-react'

const features = [
  {
    icon: TrendingUp,
    title: 'Live Budget Tracking',
    description: 'Every transaction cross-referenced against your monthly budget in real time. Know exactly where you stand.',
  },
  {
    icon: Bell,
    title: 'Smart Alert System',
    description: 'Yellow and red flags for overspending, missed payments, and untracked expenses — with one-click acknowledgment.',
  },
  {
    icon: ShieldCheck,
    title: 'Bank-Level Security',
    description: 'Read-only Plaid integration. Your credentials never touch our servers. All data encrypted at rest.',
  },
  {
    icon: Users,
    title: 'Managed by Your Advisor',
    description: 'KelliWorks sets your monthly budget line-by-line. You stay informed, we handle the oversight.',
  },
]

const steps = [
  {
    number: '01',
    icon: Link2,
    title: 'Connect your bank',
    description: 'Securely link your business bank account through Plaid. Read-only access — we can never move money.',
  },
  {
    number: '02',
    icon: BarChart3,
    title: 'Your advisor builds your budget',
    description: 'KelliWorks creates a custom monthly budget with line items, due dates, and estimated amounts tailored to your business.',
  },
  {
    number: '03',
    icon: AlertTriangle,
    title: 'Get notified what matters',
    description: 'Transactions match automatically. Anything unusual, overdue, or over-budget triggers a real-time alert requiring your acknowledgment.',
  },
]

const stats = [
  { value: '100%', label: 'Read-only bank access' },
  { value: 'Daily', label: 'Automatic transaction sync' },
  { value: '2-tier', label: 'Yellow & red alert system' },
  { value: '∞', label: 'Month history on record' },
]

const trust = [
  'Bank connections via Plaid — the same technology used by thousands of financial apps',
  'All data encrypted at rest and in transit',
  'Row-level security — your data is never shared with other clients',
  'No credentials stored — KelliWorks never sees your banking login',
  'Audit trail for every alert acknowledgment',
]

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--c-bg)', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>

      {/* ── Ambient background ─────────────────────── */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,160,23,0.08) 0%, transparent 60%),
          radial-gradient(ellipse 50% 60% at 80% 100%, rgba(184,134,11,0.05) 0%, transparent 60%)
        `
      }} />

      {/* ── Navigation ─────────────────────────────── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50 }} className="glass-nav">
        <nav className="container-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, letterSpacing: '0.01em' }} className="text-gold">
            KelliWorks
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href="#how-it-works" style={{ display: 'none', fontSize: 14, color: 'var(--c-slate-400)', padding: '8px 12px', borderRadius: 8, transition: 'color 0.15s' }}
              className="hidden md:block btn-ghost btn btn-sm">
              How it works
            </a>
            <a href="#security" className="btn btn-ghost btn-sm" style={{ color: 'var(--c-slate-400)' }}>
              Security
            </a>
            <Link href="/login" className="btn btn-gold btn-sm">
              Client Login
            </Link>
          </div>
        </nav>
      </header>

      <main style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Hero ───────────────────────────────────── */}
        <section style={{ padding: '96px 0 80px', textAlign: 'center' }} className="anim-fade-up">
          <div className="container-page" style={{ maxWidth: 720 }}>
            <div className="badge badge-gold" style={{ marginBottom: 24, display: 'inline-flex' }}>
              Accounting · Clarity · Control
            </div>
            <h1 style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4rem)', fontWeight: 400, lineHeight: 1.15, marginBottom: 24, color: 'var(--c-navy-950)' }}>
              Your business finances,{' '}
              <span className="text-gold" style={{ fontStyle: 'italic' }}>finally clear.</span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--c-slate-400)', maxWidth: 520, margin: '0 auto 40px' }}>
              KelliWorks gives every client a private, live financial dashboard — budget tracking, transaction matching, and smart alerts managed by your dedicated accounting advisor.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/login" className="btn btn-gold btn-lg">
                Access Your Dashboard <span>→</span>
              </Link>
              <a href="mailto:kelli@kelliworks.com" className="btn btn-outline btn-lg">
                Contact KelliWorks
              </a>
            </div>
          </div>
        </section>

        {/* ── Stats bar ──────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--c-slate-200)', borderBottom: '1px solid var(--c-slate-200)' }} className="glass">
          <div className="container-page" style={{ paddingTop: 32, paddingBottom: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {stats.map(({ value, label }) => (
                <div key={label} style={{ textAlign: 'center', padding: '8px 0' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--c-gold-400)', marginBottom: 4 }}>{value}</p>
                  <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--c-slate-500)', fontWeight: 600 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Features ───────────────────────────────── */}
        <section style={{ padding: '96px 0' }}>
          <div className="container-page">
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p className="section-label" style={{ justifyContent: 'center', marginBottom: 16 }}>Platform Features</p>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', marginBottom: 16 }}>Built for how accounting firms actually work</h2>
              <p style={{ color: 'var(--c-slate-400)', maxWidth: 480, margin: '0 auto', fontSize: 16, lineHeight: 1.65 }}>
                Every feature designed around the KelliWorks client relationship — not generic personal finance.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }} className="stagger">
              {features.map(({ icon: Icon, title, description }) => (
                <article key={title} className="glass-card anim-fade-up" style={{ borderRadius: 24, padding: '32px 28px' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.2)', marginBottom: 20
                  }}>
                    <Icon size={22} color="var(--c-gold-400)" />
                  </div>
                  <h3 style={{ fontSize: 17, fontFamily: 'var(--font-sans)', fontWeight: 700, color: 'var(--c-navy-950)', marginBottom: 10 }}>{title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--c-slate-400)' }}>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ────────────────────────────── */}
        <section id="how-it-works" style={{ padding: '96px 0', borderTop: '1px solid var(--c-slate-200)', background: 'linear-gradient(180deg, transparent 0%, rgba(212,160,23,0.04) 100%)' }}>
          <div className="container-page">
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <p className="section-label" style={{ justifyContent: 'center', marginBottom: 16 }}>How It Works</p>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', marginBottom: 16 }}>Up and running in minutes</h2>
              <p style={{ color: 'var(--c-slate-400)', maxWidth: 440, margin: '0 auto', fontSize: 16, lineHeight: 1.65 }}>
                KelliWorks handles the setup. You just connect your bank and log in.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32, position: 'relative' }}>
              {steps.map(({ number, icon: Icon, title, description }) => (
                <div key={number} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--c-gold-400)' }}>
                      Step {number}
                    </span>
                    <div style={{
                      width: 64, height: 64, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--c-surface)', border: '1px solid rgba(212,160,23,0.35)',
                      boxShadow: '0 4px 16px rgba(184,134,11,0.1)'
                    }}>
                      <Icon size={26} color="var(--c-gold-400)" />
                    </div>
                  </div>
                  <h3 style={{ fontSize: 18, fontFamily: 'var(--font-sans)', fontWeight: 700, color: 'var(--c-navy-950)', marginBottom: 12 }}>{title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--c-slate-400)', maxWidth: 280 }}>{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Security ────────────────────────────────── */}
        <section id="security" style={{ padding: '96px 0', borderTop: '1px solid var(--c-slate-200)' }}>
          <div className="container-page">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 48, alignItems: 'start' }}>
              {/* Left: card */}
              <div className="glass-card" style={{ borderRadius: 28, padding: '40px 36px' }}>
                <p className="badge badge-gold" style={{ marginBottom: 20 }}>
                  <ShieldCheck size={13} style={{ marginRight: 4 }} />
                  Security First
                </p>
                <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', marginBottom: 20, lineHeight: 1.2 }}>
                  Your financial data stays yours.
                </h2>
                <p style={{ color: 'var(--c-slate-400)', lineHeight: 1.7, fontSize: 15, marginBottom: 28 }}>
                  We take a read-only view of your transactions — nothing more. KelliWorks can never initiate transfers, move money, or access anything beyond what&apos;s needed for budget matching and reporting.
                </p>
                <a href="mailto:kelli@kelliworks.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--c-gold-400)', fontWeight: 600, fontSize: 14, transition: 'color 0.2s' }}>
                  Questions? Contact us <span>→</span>
                </a>
              </div>

              {/* Right: trust list */}
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {trust.map((item) => (
                  <li key={item} style={{ display: 'flex', gap: 14, padding: '16px 18px', borderRadius: 14, border: '1px solid var(--c-slate-200)', background: 'var(--c-surface)' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', marginTop: 1
                    }}>
                      <CheckCircle size={15} color="#4ade80" />
                    </div>
                    <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--c-slate-700)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────── */}
        <section style={{ padding: '96px 0', borderTop: '1px solid var(--c-slate-200)', textAlign: 'center' }}>
          <div className="container-page" style={{ maxWidth: 560 }}>
            <div className="glass-card" style={{ borderRadius: 32, padding: '56px 40px' }}>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', marginBottom: 16 }}>
                Already a KelliWorks client?
              </h2>
              <p style={{ color: 'var(--c-slate-400)', marginBottom: 36, fontSize: 15, lineHeight: 1.65 }}>
                Log in to your secure portal and see your latest budget status, transaction feed, and any open alerts.
              </p>
              <Link href="/login" className="btn btn-gold btn-lg" style={{ width: '100%' }}>
                Sign in to your dashboard <span>→</span>
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--c-slate-200)', padding: '32px 0', position: 'relative', zIndex: 1 }}>
        <div className="container-page" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 400 }} className="text-gold">KelliWorks</span>
          <p style={{ fontSize: 13, color: 'var(--c-slate-600)' }}>
            © {new Date().getFullYear()} KelliWorks · Private client portal
          </p>
          <a href="mailto:kelli@kelliworks.com" style={{ fontSize: 13, color: 'var(--c-slate-500)', transition: 'color 0.2s' }}>
            kelli@kelliworks.com
          </a>
        </div>
      </footer>

    </div>
  )
}
