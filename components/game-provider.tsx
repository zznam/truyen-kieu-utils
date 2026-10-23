'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  applyResult,
  claimMissionBonus,
  emptyProgress,
  GAME_STORAGE_KEY,
  parseGameProgress,
  type GameResult,
  type GameProgress,
} from '@/lib/game-progress'

import { updateReview, type Outcome } from '@/lib/game-journey'
import { localDateKey } from '@/lib/games'

const GameContext = createContext<{
  progress: GameProgress
  ready: boolean
  storageAvailable: boolean
  record: (result: GameResult) => number
  reviewAnswers: (outcomes: Outcome[]) => void
  claimBonus: () => number
}>({
  progress: emptyProgress(),
  ready: false,
  storageAvailable: true,
  record: () => 0,
  reviewAnswers: () => {},
  claimBonus: () => 0,
})
export function GameProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(emptyProgress)
  const current = useRef(progress)
  const [ready, setReady] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)
  useEffect(() => {
    try {
      current.current = parseGameProgress(
        JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) || '{}')
      )
      setProgress(current.current)
    } catch {
      /* Keep a usable in-memory game if stored data is corrupt or blocked. */
    }
    setReady(true)
    const sync = (event: StorageEvent) => {
      if (event.key !== GAME_STORAGE_KEY && event.key !== null) return
      try {
        current.current = parseGameProgress(JSON.parse(event.newValue || '{}'))
        setProgress(current.current)
      } catch {
        /* Ignore malformed updates from another tab. */
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  function update(transform: (previous: GameProgress) => GameProgress) {
    if (!ready) return 0
    let previous = current.current
    if (storageAvailable) {
      try {
        const saved = localStorage.getItem(GAME_STORAGE_KEY)
        if (saved) previous = parseGameProgress(JSON.parse(saved))
      } catch {
        /* Continue with this session's progress. */
      }
    }
    const next = transform(previous)
    current.current = next
    setProgress(next)
    try {
      localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(next))
    } catch {
      setStorageAvailable(false)
    }
    return next.xp - previous.xp
  }
  const record = (result: GameResult) => update(previous => applyResult(previous, result))
  const reviewAnswers = (outcomes: Outcome[]) =>
    update(previous => ({ ...previous, review: updateReview(previous.review, outcomes) }))
  const claimBonus = () => update(previous => claimMissionBonus(previous, localDateKey()))
  return (
    <GameContext.Provider
      value={{ progress, ready, storageAvailable, record, reviewAnswers, claimBonus }}
    >
      {children}
    </GameContext.Provider>
  )
}
export const useGameProgress = () => useContext(GameContext)
