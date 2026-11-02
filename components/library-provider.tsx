'use client'

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { toast } from 'sonner'
import { getPassage, verses } from '@/lib/kieu'
import { useLocalStore } from '@/hooks/use-local-store'
import { useGamification } from './gamification-provider'

const STORAGE_KEY = 'kieu-library-v1'
type Library = { saved: number[]; progress: number; fontSize: number }
function emptyLibrary(): Library {
  return { saved: [], progress: 1, fontSize: 22 }
}
const defaults = emptyLibrary()
const validIds = new Set(verses.map(verse => verse.id))
export function parseLibrary(value: unknown): Library {
  if (!value || typeof value !== 'object') return defaults
  const data = value as Partial<Library>
  return {
    saved: Array.isArray(data.saved)
      ? [
          ...new Set(
            data.saved
              .filter(id => Number.isInteger(id) && validIds.has(id))
              // Either line of a couplet refers to the same saved passage.
              .map(id => getPassage(id)[0].id)
          ),
        ]
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
  const { track } = useGamification()
  const {
    state: library,
    ready,
    storageAvailable,
    update,
  } = useLocalStore(STORAGE_KEY, emptyLibrary, parseLibrary)
  const savedAction = useRef(false)
  useEffect(() => {
    if (!ready) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const normalized = parseLibrary(JSON.parse(raw || '{}'))
      if (raw !== JSON.stringify(normalized)) {
        // Repair older bookmark IDs once on hydration. update rereads current
        // storage so a newer change in another tab is not replaced by this snapshot.
        update(current => ({ ...current }))
      }
    } catch {
      /* The store keeps usable in-memory state when storage cannot be read. */
    }
  }, [ready, update])
  useEffect(() => {
    if (!savedAction.current) return
    savedAction.current = false
    if (!storageAvailable)
      toast.info('Trình duyệt không cho phép lưu dữ liệu. Dấu trang chỉ được giữ trong phiên này.')
  }, [library, storageAvailable])
  const toggleSaved = (id: number) => {
    if (!ready || !validIds.has(id)) return
    const shouldSave = !library.saved.includes(id)
    savedAction.current = true
    let added = false
    update(current => {
      const alreadySaved = current.saved.includes(id)
      // Keep the action shown on the clicked button even if another tab changed
      // the bookmark before this tab received its storage event.
      if (alreadySaved === shouldSave) return current
      added = shouldSave
      return {
        ...current,
        saved: shouldSave ? [...current.saved, id] : current.saved.filter(item => item !== id),
      }
    })
    if (added) track({ type: 'save', id: `save:${id}`, verseId: id })
  }
  return (
    <LibraryContext.Provider
      value={{
        library,
        ready,
        toggleSaved,
        setProgress: id => update(current => ({ ...current, progress: id })),
        setFontSize: fontSize => update(current => ({ ...current, fontSize })),
      }}
    >
      {children}
    </LibraryContext.Provider>
  )
}
export const useLibrary = () => useContext(LibraryContext)
