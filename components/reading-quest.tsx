'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { BookOpen, Timer } from 'lucide-react'
import { useGamification } from './gamification-provider'

/** Reading is self-reported; opening or scrolling past a page awards nothing. */
export function ReadingQuest({ verseIds }: { verseIds: number[] }) {
  const { state, track, ready } = useGamification()
  const [minutes, setMinutes] = useState(1)
  const [remaining, setRemaining] = useState(60)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [completed, setCompleted] = useState(false)
  const elapsed = useRef(0)
  const allRead = verseIds.every(id => state.readIds.includes(id))
  useEffect(() => {
    if (!running) return
    let previous = performance.now()
    const visibility = () => {
      if (document.hidden) setRunning(false)
      previous = performance.now()
    }
    const timer = window.setInterval(() => {
      const now = performance.now()
      if (!document.hidden) elapsed.current += Math.min(now - previous, 1500)
      previous = now
      const left = Math.max(0, Math.ceil(minutes * 60 - elapsed.current / 1000))
      setRemaining(left)
      if (left === 0) {
        setRunning(false)
        setCompleted(true)
      }
    }, 250)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [running, minutes])

  return (
    <section className="reading-quest" aria-label="Thử thách đọc">
      <div>
        <h2>
          <BookOpen size={20} /> Ghi một dấu đọc
        </h2>
        <p>
          Xác nhận sau khi đọc xong {verseIds.length} dòng trên. Mỗi dòng mới chỉ nhận điểm một lần.
        </p>
        <button
          className="button secondary"
          disabled={!ready || allRead}
          onClick={() => {
            track({ type: 'read', id: crypto.randomUUID(), verseIds })
            setMessage('Đã ghi nhận trang thơ trong Vườn tri âm.')
          }}
        >
          {allRead ? 'Đã đọc trang này' : `Đã đọc ${verseIds.length} dòng`}
        </button>
      </div>
      <div>
        <h3>
          <Timer size={18} /> Một khoảng tập trung
        </h3>
        <p>Đồng hồ tự tạm dừng khi bạn đổi tab. Đổi trang thơ sẽ bắt đầu lại.</p>
        <div className="reading-quest-controls">
          <label htmlFor="focus-minutes">Thời gian</label>
          <select
            id="focus-minutes"
            value={minutes}
            disabled={running || elapsed.current > 0}
            onChange={event => {
              const value = Number(event.target.value)
              setMinutes(value)
              setRemaining(value * 60)
              setCompleted(false)
            }}
          >
            {[1, 3, 5].map(value => (
              <option key={value} value={value}>
                {value} phút
              </option>
            ))}
          </select>
          <span className="focus-clock" role="timer" aria-label="Thời gian còn lại">
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
          </span>
          {!completed && (
            <button
              className="button secondary"
              disabled={!ready}
              onClick={() => setRunning(value => !value)}
            >
              {running
                ? 'Tạm dừng'
                : elapsed.current > 0
                  ? 'Tiếp tục tập trung'
                  : 'Bắt đầu tập trung'}
            </button>
          )}
          {completed && (
            <button
              className="button primary"
              onClick={() => {
                const credited = track({
                  type: 'focus',
                  id: crypto.randomUUID(),
                  minutes,
                  verseIds,
                })
                track({ type: 'read', id: crypto.randomUUID(), verseIds })
                elapsed.current = 0
                setRemaining(minutes * 60)
                setCompleted(false)
                setMessage(
                  credited
                    ? `Đã ghi nhận ${minutes} phút tập trung và trang thơ vừa đọc.`
                    : 'Đã đạt giới hạn thưởng 120 phút tập trung hôm nay. Những dòng mới vẫn được ghi dấu đọc.'
                )
              }}
            >
              Hoàn thành phiên đọc
            </button>
          )}
          {elapsed.current > 0 && (
            <button
              className="text-button"
              onClick={() => {
                setRunning(false)
                elapsed.current = 0
                setRemaining(minutes * 60)
                setCompleted(false)
              }}
            >
              Bắt đầu lại đồng hồ
            </button>
          )}
        </div>
      </div>
      <p role="status">{message}</p>
      <Link className="text-link" href="/play/adventure">
        Xem nhiệm vụ và phần thưởng →
      </Link>
    </section>
  )
}
