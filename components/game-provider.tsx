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
import { useGamification } from './gamification-provider'

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
  const { track } = useGamification()
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
  const record = (result: GameResult) => {
    let accepted = false
    const earned = update(previous => {
      const next = applyResult(previous, result)
      accepted = next !== previous
      return next
    })
    if (accepted)
      track({
        type: 'session',
        id: `classic:${result.id}`,
        mode: result.mode,
        correct: result.correct,
        total: 5,
        hints: result.outcomes?.filter(outcome => outcome.hinted).length ?? 0,
        verseIds:
          result.outcomes
            ?.filter(outcome => outcome.correct && !outcome.hinted)
            .map(outcome => outcome.verseId) ?? [],
      })
    return earned
  }
  const reviewAnswers = (outcomes: Outcome[]) => {
    let recovered: number[] = []
    update(previous => {
      recovered = outcomes
        .filter(
          outcome =>
            outcome.correct &&
            !outcome.hinted &&
            previous.review.some(
              item => item.verseId === outcome.verseId && item.mode === outcome.mode
            )
        )
        .map(outcome => outcome.verseId)
      return { ...previous, review: updateReview(previous.review, outcomes) }
    })
    if (recovered.length) track({ type: 'review', id: crypto.randomUUID(), verseIds: recovered })
  }
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
