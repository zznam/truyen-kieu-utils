'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  ADVENTURE_STORAGE_KEY,
  applyAdventureEvent,
  buyAdventureItem,
  claimAdventureChapter,
  claimAdventureQuest,
  emptyAdventure,
  equipAdventureItem,
  exportAdventure,
  importAdventure,
  localDay,
  parseAdventure,
  pinAdventureAchievement,
  setAdventureGoal,
  updateAdventureProfile,
  type AdventureEvent,
  type AdventureState,
} from '@/lib/gamification'

type GamificationContextValue = {
  state: AdventureState
  ready: boolean
  storageAvailable: boolean
  today: string
  track: (event: AdventureEvent) => boolean
  claimQuest: (id: string) => boolean
  claimChapter: (id: string) => boolean
  buy: (id: string) => boolean
  equip: (id: string) => boolean
  pinAchievement: (id: string | null) => boolean
  updateProfile: (change: Partial<AdventureState['profile']>) => boolean
  setGoal: (value: number) => boolean
  importProgress: (raw: string) => boolean
  exportProgress: () => string
  resetProgress: () => boolean
}
const GamificationContext = createContext<GamificationContextValue | null>(null)

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdventureState>(emptyAdventure)
  const [ready, setReady] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [today, setToday] = useState('')
  const current = useRef(state)
  const hydrated = useRef(false)
  const persisted = useRef<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADVENTURE_STORAGE_KEY)
      persisted.current = raw
      if (raw) {
        const parsed = parseAdventure(JSON.parse(raw))
        if (parsed) {
          current.current = parsed
          setState(parsed)
        } else setStorageAvailable(false)
      }
    } catch {
      setStorageAvailable(false)
    }
    hydrated.current = true
    setReady(true)
    setToday(localDay())
    const updateDay = () => setToday(localDay())
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ADVENTURE_STORAGE_KEY && event.key !== null) return
      try {
        // Event payloads can lag behind a more recent write in another tab.
        const raw = localStorage.getItem(ADVENTURE_STORAGE_KEY)
        const parsed = raw ? parseAdventure(JSON.parse(raw)) : emptyAdventure()
        if (parsed) {
          persisted.current = raw
          current.current = parsed
          setState(parsed)
          setStorageAvailable(true)
        }
      } catch {
        /* Keep valid in-memory progress if another tab writes malformed data. */
      }
    }
    const interval = window.setInterval(updateDay, 30_000)
    window.addEventListener('focus', updateDay)
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', updateDay)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', updateDay)
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', updateDay)
      hydrated.current = false
    }
  }, [])

  const mutate = useCallback((update: (previous: AdventureState) => AdventureState) => {
    if (!hydrated.current) return false
    let previous = current.current
    // Read the latest persisted value before a write so sequential actions in two tabs compose.
    try {
      const raw = localStorage.getItem(ADVENTURE_STORAGE_KEY)
      if (raw !== persisted.current) {
        const parsed = raw ? parseAdventure(JSON.parse(raw)) : emptyAdventure()
        if (parsed) previous = parsed
        persisted.current = raw
      }
    } catch {
      setStorageAvailable(false)
    }
    const next = update(previous)
    if (next === previous) {
      if (previous !== current.current) {
        current.current = previous
        setState(previous)
      }
      return false
    }
    current.current = next
    setState(next)
    setToday(localDay())
    try {
      const raw = JSON.stringify(next)
      localStorage.setItem(ADVENTURE_STORAGE_KEY, raw)
      persisted.current = raw
      setStorageAvailable(true)
    } catch {
      setStorageAvailable(false)
    }
    return true
  }, [])
  const track = useCallback(
    (event: AdventureEvent) => mutate(previous => applyAdventureEvent(previous, event, localDay())),
    [mutate]
  )
  const claimQuest = useCallback(
    (id: string) => mutate(previous => claimAdventureQuest(previous, id, localDay())),
    [mutate]
  )
  const claimChapter = useCallback(
    (id: string) => mutate(previous => claimAdventureChapter(previous, id, localDay())),
    [mutate]
  )
  const buy = useCallback(
    (id: string) => mutate(previous => buyAdventureItem(previous, id, localDay())),
    [mutate]
  )
  const equip = useCallback(
    (id: string) => mutate(previous => equipAdventureItem(previous, id)),
    [mutate]
  )
  const pinAchievement = useCallback(
    (id: string | null) => mutate(previous => pinAdventureAchievement(previous, id)),
    [mutate]
  )
  const updateProfile = useCallback(
    (change: Partial<AdventureState['profile']>) =>
      mutate(previous => updateAdventureProfile(previous, change)),
    [mutate]
  )
  const setGoal = useCallback(
    (value: number) => mutate(previous => setAdventureGoal(previous, value)),
    [mutate]
  )
  const importProgress = useCallback(
    (raw: string) => {
      const parsed = importAdventure(raw)
      return parsed ? mutate(() => parsed) : false
    },
    [mutate]
  )
  const exportProgress = useCallback(() => exportAdventure(current.current), [])
  const resetProgress = useCallback(() => mutate(() => emptyAdventure()), [mutate])

  return (
    <GamificationContext.Provider
      value={{
        state,
        ready,
        storageAvailable,
        today,
        track,
        claimQuest,
        claimChapter,
        buy,
        equip,
        pinAchievement,
        updateProfile,
        setGoal,
        importProgress,
        exportProgress,
        resetProgress,
      }}
    >
      {children}
    </GamificationContext.Provider>
  )
}

export function useGamification() {
  const value = useContext(GamificationContext)
  if (!value) throw new Error('useGamification requires GamificationProvider')
  return value
}
