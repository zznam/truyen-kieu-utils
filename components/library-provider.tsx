'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { verses } from '@/lib/kieu'

const STORAGE_KEY = 'kieu-library-v1'
type Library = { saved: number[]; progress: number; fontSize: number }
const defaults: Library = { saved: [], progress: 1, fontSize: 22 }
const validIds = new Set(verses.map(verse => verse.id))
export function parseLibrary(value: unknown): Library {
  if (!value || typeof value !== 'object') return defaults
  const data = value as Partial<Library>
  return {
    saved: Array.isArray(data.saved)
      ? [...new Set(data.saved.filter(id => Number.isInteger(id) && validIds.has(id)))]
      : [],
    progress: typeof data.progress === 'number' && validIds.has(data.progress) ? data.progress : 1,
    fontSize:
      typeof data.fontSize === 'number' && [18, 22, 26, 30].includes(data.fontSize)
        ? data.fontSize
        : 22,
  }
}
const LibraryContext = createContext<{
  library: Library
  ready: boolean
  toggleSaved: (id: number) => void
  setProgress: (id: number) => void
  setFontSize: (size: number) => void
}>({
  library: defaults,
  ready: false,
  toggleSaved: () => {},
  setProgress: () => {},
  setFontSize: () => {},
})

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [library, setLibrary] = useState<Library>(defaults)
  const [ready, setReady] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)
  useEffect(() => {
    try {
      setLibrary(parseLibrary(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')))
    } catch {
      /* Invalid or unavailable storage must not prevent reading. */
    }
    setReady(true)
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      try {
        setLibrary(parseLibrary(JSON.parse(event.newValue || '{}')))
      } catch {
        /* Ignore invalid external updates. */
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(library))
    } catch {
      setStorageAvailable(false)
    }
  }, [library, ready])
  const toggleSaved = (id: number) => {
    if (!ready || !validIds.has(id)) return
    setLibrary(current => ({
      ...current,
      saved: current.saved.includes(id)
        ? current.saved.filter(item => item !== id)
        : [...current.saved, id],
    }))
    if (!storageAvailable)
      toast.info('Trình duyệt không cho phép lưu dữ liệu. Dấu trang chỉ được giữ trong phiên này.')
  }
  return (
    <LibraryContext.Provider
      value={{
        library,
        ready,
        toggleSaved,
        setProgress: id => setLibrary(current => ({ ...current, progress: id })),
        setFontSize: fontSize => setLibrary(current => ({ ...current, fontSize })),
      }}
    >
      {children}
    </LibraryContext.Provider>
  )
}
export const useLibrary = () => useContext(LibraryContext)
