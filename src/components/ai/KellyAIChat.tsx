'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, ArrowUp, RotateCcw, TrendingUp, BarChart2, Lightbulb, BookOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const CATEGORIES = {
  budget: {
    label: 'Budget',
    icon: BookOpen,
    heading: 'Budget questions',
    suggestions: [
      'How much have I spent this month?',
      'Which budget lines are overdue?',
      "What's my biggest expense category?",
      'Show me my remaining budget balance',
      'Am I on track this month?',
    ],
  },
  analyze: {
    label: 'Analyze',
    icon: BarChart2,
    heading: 'Spending analysis',
    suggestions: [
      'Find any unusual or large transactions',
      'What are my untracked expenses?',
      'Which categories are over budget?',
      'Summarize my pending alerts',
      'Compare actual vs estimated spending',
    ],
  },
  plan: {
    label: 'Plan',
    icon: Lightbulb,
    heading: 'Financial planning',
    suggestions: [
      "Help me plan next month's budget",
      'What should I prioritize paying first?',
      'How can I reduce my spending?',
      'What bills are coming up soon?',
      'Suggest a savings target for this month',
    ],
  },
}

type CategoryKey = keyof typeof CATEGORIES

// ── Kelly AI logo ──────────────────────────────────────────
function KellyLogo({ size = 80 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', position: 'relative',
      background: 'linear-gradient(135deg, var(--c-gold-300) 0%, var(--c-gold-500) 50%, var(--c-gold-600) 100%)',
      boxShadow: '0 8px 32px rgba(184,134,11,0.35), 0 2px 8px rgba(184,134,11,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Inner ring */}
      <div style={{
        position: 'absolute', inset: 8, borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.35)',
      }} />
      <Sparkles size={size * 0.38} color="white" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))' }} />
    </div>
  )
}

// ── Category command button ────────────────────────────────
function CategoryButton({ catKey, label, icon: Icon, isActive, onClick }: {
  catKey: CategoryKey, label: string, icon: React.ElementType, isActive: boolean, onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '16px 12px', borderRadius: 16, cursor: 'pointer', width: '100%',
        background: isActive ? 'rgba(212,160,23,0.08)' : 'var(--c-surface)',
        border: `1px solid ${isActive ? 'rgba(212,160,23,0.4)' : 'var(--c-slate-200)'}`,
        transition: 'border-color 0.2s, background 0.2s',
        boxShadow: isActive ? '0 4px 12px rgba(184,134,11,0.1)' : 'var(--shadow-sm)',
      }}
    >
      <Icon size={18} color={isActive ? 'var(--c-gold-500)' : 'var(--c-slate-400)'} />
      <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? 'var(--c-gold-600)' : 'var(--c-slate-600)' }}>
        {label}
      </span>
    </motion.button>
  )
}

export default function KellyAIChat({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return

    setActiveCategory(null)
    const userMsg: Message = { role: 'user', content }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    setMessages([...next, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      if (!res.ok || !res.body) throw new Error('Failed')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }
        return updated
      })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); send() }
  }

  const isEmpty = messages.length === 0

  // ── COMPACT (bubble) mode ──────────────────────────────────
  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--c-slate-200)', marginBottom: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--c-gold-400), var(--c-gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={13} color="white" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-navy-950)' }}>Kelly AI</span>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-slate-400)', padding: 4 }}>
              <RotateCcw size={13} />
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isEmpty ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
              {Object.values(CATEGORIES).flatMap(c => c.suggestions.slice(0, 1)).concat(
                ['Do I have any untracked expenses?']
              ).slice(0, 4).map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  background: 'var(--c-surface)', border: '1px solid var(--c-slate-200)',
                  borderRadius: 10, padding: '8px 12px', fontSize: 12,
                  color: 'var(--c-slate-600)', cursor: 'pointer', textAlign: 'left',
                  fontWeight: 500, transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,160,23,0.4)'; (e.currentTarget as HTMLElement).style.color = 'var(--c-navy-950)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-slate-200)'; (e.currentTarget as HTMLElement).style.color = 'var(--c-slate-600)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'assistant' && (
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--c-gold-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 6, marginTop: 2 }}>
                  <Sparkles size={11} color="white" />
                </div>
              )}
              <div style={{
                maxWidth: '85%', padding: '8px 11px',
                borderRadius: m.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                background: m.role === 'user' ? 'var(--c-gold-500)' : 'var(--c-surface)',
                border: m.role === 'user' ? 'none' : '1px solid var(--c-slate-200)',
                color: m.role === 'user' ? 'white' : 'var(--c-slate-700)',
                fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              }}>
                {m.content || (loading && i === messages.length - 1 ? (
                  <span style={{ display: 'inline-flex', gap: 3 }}>
                    {[0,1,2].map(j => <span key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--c-slate-300)', display: 'inline-block', animation: `kbounce 1.2s ${j * 0.2}s infinite` }} />)}
                  </span>
                ) : '')}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div style={{ paddingTop: 10, borderTop: '1px solid var(--c-slate-200)', marginTop: 8, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Ask Kelly AI…" disabled={loading}
              style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--c-slate-300)', outline: 'none', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--c-slate-900)', background: 'var(--c-surface)', transition: 'border-color 0.2s' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-gold-500)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-slate-300)' }}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: input.trim() && !loading ? 'var(--c-gold-500)' : 'var(--c-slate-200)', transition: 'background 0.2s' }}>
              <ArrowUp size={15} color={input.trim() && !loading ? 'white' : 'var(--c-slate-400)'} />
            </button>
          </div>
        </div>
        <style>{`@keyframes kbounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}`}</style>
      </div>
    )
  }

  // ── FULL PAGE mode ─────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', minHeight: 520 }}>

      {/* Conversation thread */}
      {!isEmpty && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--c-gold-400), var(--c-gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={15} color="white" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-navy-950)' }}>Kelly AI</span>
          </div>
          <button onClick={() => setMessages([])} className="btn btn-ghost" style={{ fontSize: 12, gap: 6, color: 'var(--c-slate-400)' }}>
            <RotateCcw size={12} /> New chat
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 4 }}>

        {/* ── Empty / landing state ─────────────────── */}
        {isEmpty && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24, gap: 0 }}>

            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 16, stiffness: 200 }}
              style={{ marginBottom: 24 }}
            >
              <KellyLogo size={80} />
            </motion.div>

            {/* Welcome */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              style={{ textAlign: 'center', marginBottom: 32 }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', color: 'var(--c-navy-950)', marginBottom: 8, fontWeight: 400 }}>
                Ready to assist you
              </h2>
              <p style={{ fontSize: 14, color: 'var(--c-slate-500)', maxWidth: 380, margin: '0 auto', lineHeight: 1.65 }}>
                Ask me anything about your budget, spending, or finances — I have the full picture.
              </p>
            </motion.div>

            {/* Input card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.18 }}
              style={{
                width: '100%', maxWidth: 680,
                background: 'var(--c-surface)', border: '1px solid var(--c-slate-200)',
                borderRadius: 18, boxShadow: 'var(--shadow-md)', overflow: 'hidden',
                marginBottom: 16,
              }}
            >
              {/* Input */}
              <div style={{ padding: '16px 20px 4px' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask me anything about your finances…"
                  style={{
                    width: '100%', border: 'none', outline: 'none', background: 'transparent',
                    fontSize: 15, fontFamily: 'var(--font-sans)', color: 'var(--c-slate-800)',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {/* Toolbar */}
              <div style={{ padding: '10px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {(Object.entries(CATEGORIES) as [CategoryKey, typeof CATEGORIES[CategoryKey]][]).map(([key, cat]) => {
                    const Icon = cat.icon
                    const active = activeCategory === key
                    return (
                      <button key={key} onClick={() => setActiveCategory(active ? null : key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                          borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                          border: '1px solid transparent',
                          background: active ? 'rgba(212,160,23,0.1)' : 'var(--c-slate-100)',
                          color: active ? 'var(--c-gold-600)' : 'var(--c-slate-500)',
                          borderColor: active ? 'rgba(212,160,23,0.3)' : 'transparent',
                          transition: 'all 0.15s',
                        }}
                      >
                        <Icon size={13} />
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 34, height: 34, borderRadius: '50%', border: 'none',
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: input.trim() && !loading ? 'var(--c-gold-500)' : 'var(--c-slate-200)',
                    boxShadow: input.trim() && !loading ? '0 2px 8px rgba(184,134,11,0.3)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <ArrowUp size={15} color={input.trim() && !loading ? 'white' : 'var(--c-slate-400)'} />
                </button>
              </div>
            </motion.div>

            {/* Category grid */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              style={{ width: '100%', maxWidth: 680, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}
            >
              {(Object.entries(CATEGORIES) as [CategoryKey, typeof CATEGORIES[CategoryKey]][]).map(([key, cat]) => (
                <CategoryButton
                  key={key} catKey={key} label={cat.label} icon={cat.icon}
                  isActive={activeCategory === key}
                  onClick={() => setActiveCategory(activeCategory === key ? null : key)}
                />
              ))}
            </motion.div>

            {/* Expandable suggestions */}
            <div style={{ width: '100%', maxWidth: 680 }}>
              <AnimatePresence>
                {activeCategory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-slate-200)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--c-slate-100)' }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-slate-500)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {CATEGORIES[activeCategory].heading}
                        </p>
                      </div>
                      <ul style={{ listStyle: 'none' }}>
                        {CATEGORIES[activeCategory].suggestions.map((s, i) => {
                          const Icon = CATEGORIES[activeCategory].icon
                          return (
                            <motion.li
                              key={s}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.04 }}
                              onClick={() => send(s)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '11px 16px', cursor: 'pointer',
                                borderBottom: i < CATEGORIES[activeCategory].suggestions.length - 1 ? '1px solid var(--c-slate-100)' : 'none',
                                transition: 'background 0.1s',
                              }}
                              onHoverStart={e => { (e.target as HTMLElement).style.background = 'var(--c-slate-100)' }}
                              onHoverEnd={e => { (e.target as HTMLElement).style.background = 'transparent' }}
                            >
                              <Icon size={14} color="var(--c-gold-500)" style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: 13, color: 'var(--c-slate-700)' }}>{s}</span>
                            </motion.li>
                          )
                        })}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        )}

        {/* ── Conversation messages ─────────────────── */}
        {!isEmpty && messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'assistant' && (
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, var(--c-gold-400), var(--c-gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 10, marginTop: 2 }}>
                <Sparkles size={13} color="white" />
              </div>
            )}
            <div style={{
              maxWidth: '72%', padding: '11px 15px',
              borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: m.role === 'user' ? 'var(--c-gold-500)' : 'var(--c-surface)',
              border: m.role === 'user' ? 'none' : '1px solid var(--c-slate-200)',
              color: m.role === 'user' ? 'white' : 'var(--c-slate-700)',
              fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap',
              boxShadow: m.role === 'assistant' ? 'var(--shadow-sm)' : '0 2px 8px rgba(184,134,11,0.18)',
            }}>
              {m.content || (loading && i === messages.length - 1 ? (
                <span style={{ display: 'inline-flex', gap: 4 }}>
                  {[0,1,2].map(j => <span key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-slate-300)', display: 'inline-block', animation: `kbounce 1.2s ${j * 0.2}s infinite` }} />)}
                </span>
              ) : '')}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar (conversation mode) ─────────── */}
      {!isEmpty && (
        <div style={{ paddingTop: 16, borderTop: '1px solid var(--c-slate-200)', marginTop: 12, flexShrink: 0 }}>
          <div style={{
            display: 'flex', gap: 10, alignItems: 'center',
            background: 'var(--c-surface)', border: '1px solid var(--c-slate-200)',
            borderRadius: 14, padding: '10px 14px', boxShadow: 'var(--shadow-sm)',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Reply to Kelly AI…"
              disabled={loading}
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--c-slate-800)',
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: input.trim() && !loading ? 'var(--c-gold-500)' : 'var(--c-slate-200)',
                boxShadow: input.trim() && !loading ? '0 2px 8px rgba(184,134,11,0.3)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <ArrowUp size={15} color={input.trim() && !loading ? 'white' : 'var(--c-slate-400)'} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--c-slate-400)', marginTop: 6, textAlign: 'center' }}>
            Kelly AI · Powered by Claude · Press Enter to send
          </p>
        </div>
      )}

      <style>{`@keyframes kbounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}`}</style>
    </div>
  )
}
