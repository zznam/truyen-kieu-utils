'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Verse } from '@/lib/kieu'

type SpeechStatus = 'idle' | 'playing' | 'paused'

/** One utterance per source line allows a reliable, visible reading cursor. */
export function useReadAloud() {
  const [supported, setSupported] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [status, setStatus] = useState<SpeechStatus>('idle')
  const [error, setError] = useState('')
  const generation = useRef(0)
  const active = useRef(false)
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)

  const stop = useCallback(() => {
    generation.current += 1
    if (active.current && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    active.current = false
    utterance.current = null
    setStatus('idle')
  }, [])

  useEffect(() => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return
    setSupported(true)
    const engine = window.speechSynthesis
    function refreshVoices() {
      setVoices(engine.getVoices().filter(voice => /^vi(?:[-_]|$)/i.test(voice.lang)))
    }
    function onVisibility() {
      if (document.hidden) stop()
    }
    refreshVoices()
    engine.addEventListener('voiceschanged', refreshVoices)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      generation.current += 1
      if (active.current) engine.cancel()
      active.current = false
      utterance.current = null
      engine.removeEventListener('voiceschanged', refreshVoices)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [stop])

  function play(
    lines: Verse[],
    start: number,
    voiceURI: string,
    rate: number,
    onLine: (id: number) => void
  ) {
    stop()
    const voice = voices.find(item => item.voiceURI === voiceURI) ?? voices[0]
    if (!supported || !voice || !lines[start]) return
    setError('')
    const session = generation.current
    const engine = window.speechSynthesis
    active.current = true
    setStatus('playing')
    function speak(index: number) {
      if (session !== generation.current) return
      if (index >= lines.length) {
        active.current = false
        utterance.current = null
        setStatus('idle')
        return
      }
      onLine(lines[index].id)
      const next = new SpeechSynthesisUtterance(lines[index].text)
      next.lang = voice.lang
      next.voice = voice
      next.rate = Math.max(0.6, Math.min(1.2, rate))
      next.onend = () => speak(index + 1)
      next.onerror = () => {
        if (session !== generation.current) return
        stop()
        setError('Chưa thể đọc thành tiếng. Hãy thử lại hoặc chọn giọng khác.')
      }
      utterance.current = next
      try {
        engine.speak(next)
      } catch {
        stop()
        setError('Trình duyệt chưa thể phát giọng đọc.')
      }
    }
    speak(start)
  }

  function togglePause() {
    if (!active.current) return
    if (status === 'playing') {
      window.speechSynthesis.pause()
      setStatus('paused')
    } else if (status === 'paused') {
      window.speechSynthesis.resume()
      setStatus('playing')
    }
  }

  return { supported, voices, status, error, play, stop, togglePause }
}
