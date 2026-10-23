'use client'

import { useEffect, useState } from 'react'
import { localDateKey } from '@/lib/games'

export function useLocalDay() {
  const [today, setToday] = useState('')
  useEffect(() => {
    const refresh = () => setToday(localDateKey())
    refresh()
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 30000)
    return () => {
      window.removeEventListener('focus', refresh)
      window.clearInterval(timer)
    }
  }, [])
  return today
}
