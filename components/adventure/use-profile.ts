'use client'

import { importAdventure } from '@/lib/gamification'
import { useRef, useState } from 'react'
import type { AdventureGame } from './types'

/** Keep unfinished profile edits and backup previews when navigating between tabs. */
export function useAdventureProfile(game: AdventureGame, setNotice: (notice: string) => void) {
  const { today } = game
  const [profileDraft, setProfileDraft] = useState<string | null>(null)
  const [backupText, setBackupText] = useState('')
  const [backupPreview, setBackupPreview] = useState<{
    raw: string
    name: string
    xp: number
    coins: number
  } | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetPhrase, setResetPhrase] = useState('')

  const fileInput = useRef<HTMLInputElement | null>(null)

  function exportBackup() {
    const blob = new Blob([game.exportProgress()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `kieu-hanh-trinh-${today}.json`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice('Đã tạo bản sao hành trình. Hãy giữ tệp ở nơi bạn dễ tìm lại.')
  }

  function previewBackup(raw: string) {
    setBackupPreview(null)
    if (raw.length > 2_000_000) {
      setNotice('Tệp quá lớn. Hãy chọn bản sao hành trình nhỏ hơn 2 MB.')
      return
    }
    const candidate = importAdventure(raw)
    if (candidate) {
      setBackupPreview({
        raw,
        name: candidate.profile.name || 'Bạn đọc',
        xp: candidate.xp,
        coins: candidate.coins,
      })
      setNotice('Đã đọc bản sao. Xem thông tin bên dưới trước khi thay thế hành trình hiện tại.')
    } else {
      setNotice('Không đọc được bản sao. Hãy chọn tệp JSON đã xuất từ Hành trình Kiều.')
    }
  }

  return {
    profileDraft,
    setProfileDraft,
    backupText,
    setBackupText,
    backupPreview,
    setBackupPreview,
    resetOpen,
    setResetOpen,
    resetPhrase,
    setResetPhrase,
    fileInput,
    exportBackup,
    previewBackup,
  }
}
