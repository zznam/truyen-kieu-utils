'use client'

import Link from 'next/link'
import { useDeferredValue, useState } from 'react'
import { concordance, excerpt, sharedVocabulary, type ReadingRange } from '@/lib/reading-room'
import type { Verse } from '@/lib/kieu'

export function ComparisonPanel({ lines }: { lines: Verse[] }) {
  const [start, setStart] = useState('9')
  const [end, setEnd] = useState('16')
  const [range, setRange] = useState<ReadingRange>({ start: 9, end: 16 })
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'word' | 'loose'>('word')
  const deferred = useDeferredValue(query)
  const [limit, setLimit] = useState(20)
  const other = excerpt(range)
  const shared = sharedVocabulary(lines, other)
  const results = concordance(deferred, mode)
  return (
    <section className="room-card" aria-labelledby="compare-heading">
      <h2 id="compare-heading">Đặt hai đoạn cạnh nhau</h2>
      <form
        className="room-inline-form"
        onSubmit={event => {
          event.preventDefault()
          const next = { start: Number(start), end: Number(end) }
          if (!excerpt(next).length) {
            setError('Chọn một khoảng hợp lệ, tối đa 40 dòng.')
            return
          }
          setError('')
          setRange(next)
        }}
      >
        <label>
          Từ dòng đối chiếu
          <input
            type="number"
            min="1"
            required
            value={start}
            onChange={event => setStart(event.target.value)}
          />
        </label>
        <label>
          Đến dòng đối chiếu
          <input
            type="number"
            min="1"
            required
            value={end}
            onChange={event => setEnd(event.target.value)}
          />
        </label>
        <button className="button secondary">Đặt cạnh nhau</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <div className="room-comparison">
        {[lines, other].map((group, index) => (
          <blockquote key={index} aria-label={index ? 'Đoạn đối chiếu' : 'Đoạn đang đọc'}>
            <p className="eyebrow">
              Dòng {group[0]?.id}–{group.at(-1)?.id}
            </p>
            {group.map(line => (
              <p key={line.id}>{line.text}</p>
            ))}
            <Link className="text-button" href={`/full?line=${group[0]?.id}`}>
              Đọc trong bản văn
            </Link>
          </blockquote>
        ))}
      </div>
      <h3>Từ chung giữa hai đoạn</h3>
      <p className="muted small">
        Phân biệt dấu và thanh. Chọn một từ để tìm cách dùng trong toàn tác phẩm.
      </p>
      <div className="room-token-list">
        {shared.map(word => (
          <button
            className="button secondary"
            key={word}
            onClick={() => {
              setQuery(word)
              setMode('word')
              setLimit(20)
            }}
          >
            {word}
          </button>
        ))}
      </div>
      {!shared.length && <p>Hai đoạn chưa có từ trùng nhau.</p>}
      <h3>Tra cách dùng từ</h3>
      <label htmlFor="room-concordance">Từ hoặc cụm từ</label>
      <input
        id="room-concordance"
        value={query}
        maxLength={100}
        onChange={event => {
          setQuery(event.target.value)
          setLimit(20)
        }}
      />
      <label htmlFor="room-match-mode">Cách tìm</label>
      <select
        id="room-match-mode"
        value={mode}
        onChange={event => {
          setMode(event.target.value as 'word' | 'loose')
          setLimit(20)
        }}
      >
        <option value="word">Đúng một từ, có phân biệt dấu</option>
        <option value="loose">Từ / cụm từ, không phân biệt dấu</option>
      </select>
      <p role="status">
        {deferred.trim() ? `${results.length} dòng có kết quả` : 'Nhập một từ để bắt đầu.'}
      </p>
      <ol className="room-concordance" aria-busy={query !== deferred}>
        {results.slice(0, limit).map(line => (
          <li key={line.id}>
            <Link href={`/full?line=${line.id}`}>
              <span className="small muted">Dòng {line.id}</span> · {line.text}
            </Link>
          </li>
        ))}
      </ol>
      {results.length > limit && (
        <button className="button secondary" onClick={() => setLimit(value => value + 20)}>
          Xem thêm 20 dòng
        </button>
      )}
    </section>
  )
}
