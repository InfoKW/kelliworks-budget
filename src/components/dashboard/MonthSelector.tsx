'use client'

import { useRouter } from 'next/navigation'
import { getPrevMonth, getNextMonth, getCurrentMonth } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function MonthSelector({ currentMonth }: { currentMonth: string }) {
  const router = useRouter()
  const now = getCurrentMonth()

  function navigate(month: string) {
    router.push(`/dashboard?month=${month}`)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => navigate(getPrevMonth(currentMonth))}
        style={{
          width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)', color: 'var(--c-slate-400)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        <ChevronLeft size={16} />
      </button>
      {currentMonth < now && (
        <button
          onClick={() => navigate(getNextMonth(currentMonth))}
          style={{
            width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)', color: 'var(--c-slate-400)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  )
}
