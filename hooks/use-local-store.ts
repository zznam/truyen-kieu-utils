'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** A versioned, validated browser store. Updates stay usable when storage is blocked. */
export function useLocalStore<T>(
  key: string,
  initial: () => T,
  parse: (value: unknown) => T | null
) {
  const [state, setState] = useState<T>(initial)
  const [ready, setReady] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const current = useRef(state)
  const hydrated = useRef(false)
  const persisted = useRef<string | null>(null)

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(key)
        const next = raw === null ? initial() : parse(JSON.parse(raw))
        if (next === null) {
          setStorageAvailable(false)
          return
        }
        persisted.current = raw
        current.current = next
        setState(next)
        setStorageAvailable(true)
      } catch {
        setStorageAvailable(false)
      }
    }
    read()
    hydrated.current = true
    setReady(true)
    const sync = (event: StorageEvent) => {
      if (event.key === key || event.key === null) read()
    }
    window.addEventListener('storage', sync)
    return () => {
      hydrated.current = false
      window.removeEventListener('storage', sync)
    }
  }, [key, initial, parse])

  const update = useCallback(
    (recipe: (previous: T) => T) => {
      if (!hydrated.current) return false
      let previous = current.current
      try {
        const raw = localStorage.getItem(key)
        if (raw !== persisted.current) {
          const latest = raw === null ? initial() : parse(JSON.parse(raw))
          if (latest !== null) previous = latest
          persisted.current = raw
        }
      } catch {
        setStorageAvailable(false)
      }
      const next = recipe(previous)
      if (next === previous) {
        if (previous !== current.current) {
          current.current = previous
          setState(previous)
        }
        return false
      }
      current.current = next
      setState(next)
      try {
        const raw = JSON.stringify(next)
        localStorage.setItem(key, raw)
        persisted.current = raw
        setStorageAvailable(true)
      } catch {
        setStorageAvailable(false)
      }
      return true
    },
    [key, initial, parse]
  )

  return { state, ready, storageAvailable, update }
}
