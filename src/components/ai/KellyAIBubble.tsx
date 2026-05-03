'use client'

import { useState } from 'react'
import { Sparkles, X, Maximize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import KellyAIChat from './KellyAIChat'

export default function KellyAIBubble() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            style={{
              position: 'fixed', bottom: 92, right: 24, zIndex: 100,
              width: 380, height: 520,
              background: 'var(--c-surface)',
              border: '1px solid var(--c-slate-200)',
              borderRadius: 20,
              boxShadow: '0 24px 56px -8px rgba(0,0,0,0.14), 0 8px 24px -4px rgba(0,0,0,0.08)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Panel header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px 0',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--c-gold-400), var(--c-gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(184,134,11,0.3)' }}>
                  <Sparkles size={15} color="white" />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-navy-950)', lineHeight: 1 }}>Kelly AI</p>
                  <p style={{ fontSize: 10, color: 'var(--c-slate-400)', marginTop: 2 }}>Financial Assistant</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Link
                  href="/kelly-ai"
                  title="Open full page"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, color: 'var(--c-slate-400)', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--c-slate-100)'; (e.currentTarget as HTMLElement).style.color = 'var(--c-navy-950)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--c-slate-400)' }}
                >
                  <Maximize2 size={13} />
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--c-slate-400)', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--c-slate-100)'; (e.currentTarget as HTMLElement).style.color = 'var(--c-navy-950)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--c-slate-400)' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Chat */}
            <div style={{ flex: 1, padding: '12px 16px 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <KellyAIChat compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bubble trigger */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 101,
          width: 56, height: 56, borderRadius: '50%',
          background: open ? 'var(--c-navy-950)' : 'linear-gradient(135deg, var(--c-gold-400), var(--c-gold-600))',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open
            ? '0 4px 16px rgba(2,6,23,0.3)'
            : '0 4px 20px rgba(184,134,11,0.4), 0 2px 8px rgba(184,134,11,0.2)',
          transition: 'background 0.2s, box-shadow 0.2s',
        }}
        title={open ? 'Close Kelly AI' : 'Chat with Kelly AI'}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={open ? 'close' : 'open'}
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15 }}
          >
            {open ? <X size={22} color="white" /> : <Sparkles size={22} color="white" />}
          </motion.div>
        </AnimatePresence>
      </motion.button>
    </>
  )
}
