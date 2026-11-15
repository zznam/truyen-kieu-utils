'use client'

import Link from 'next/link'
import { useDeferredValue, useMemo, useState } from 'react'
import { topics } from '@/lib/kieu'
import { workshopAnchors, workshopMatches, type WorkshopOptions } from '@/lib/poetry-workshop'

export function RhymeLine({ text, position }: { text: string; position: number }) {
  let word = 0
  return (
    <>
      {text
        .normalize('NFC')
        .split(/([\p{L}]+)/u)
        .map((part, index) => {
          if (!/^[\p{L}]+$/u.test(part)) return part
          word += 1
          return word === position ? <mark key={index}>{part}</mark> : part
        })}
    </>
  )
}

export function SourcePicker({
  options,
  onOptions,
  onAdd,
}: {
  options: WorkshopOptions
  onOptions: (changes: Partial<WorkshopOptions>) => void
  onAdd: (sixId: number, eightId: number) => void
}) {
  const [query, setQuery] = useState('')
  const [matchQuery, setMatchQuery] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [anchorLimit, setAnchorLimit] = useState(8)
  const [matchLimit, setMatchLimit] = useState(8)
  const deferredQuery = useDeferredValue(query)
  const deferredMatch = useDeferredValue(matchQuery)
  const anchors = useMemo(
    () => workshopAnchors({ ...options, query: deferredQuery }),
    [options, deferredQuery]
  )
  const allowedAnchors = useMemo(() => workshopAnchors(options), [options])
  const anchor = allowedAnchors.find(verse => verse.id === selected)
  const matches = useMemo(
    () => (anchor ? workshopMatches(anchor.id, { ...options, query: deferredMatch }) : []),
    [anchor, options, deferredMatch]
  )
  return (
    <section className="workshop-card" aria-labelledby="source-picker-title">
      <h2 id="source-picker-title">Chọn câu xưa, tìm vần mới</h2>
      <p className="muted">
        Chọn một câu sáu chữ, rồi ghép với câu tám chữ có vần phù hợp. Từ được tô sáng là vị trí đối
        chiếu vần.
      </p>
      <div className="workshop-controls">
        <label>
          Chủ đề nguồn
          <select
            value={options.topic ?? 'all'}
            onChange={event => {
              onOptions({ topic: event.target.value })
              setSelected(null)
            }}
          >
            {topics.map(topic => (
              <option value={topic.id} key={topic.id}>
                {topic.label}
              </option>
            ))}
          </select>
        </label>
        <label className="workshop-checkbox">
          <input
            type="checkbox"
            checked={options.savedOnly ?? false}
            onChange={event => {
              onOptions({ savedOnly: event.target.checked })
              setSelected(null)
            }}
          />
          Chỉ dùng câu đã lưu
        </label>
      </div>
      <div className="workshop-source-columns">
        <div>
          <label>
            Tìm câu sáu chữ
            <input
              value={query}
              maxLength={100}
              placeholder="Từ khóa không dấu hoặc số dòng"
              onChange={event => {
                setQuery(event.target.value)
                setAnchorLimit(8)
              }}
            />
          </label>
          <p className="small muted" role="status">
            {anchors.length} câu sáu phù hợp
          </p>
          <ol className="workshop-source-list" aria-busy={query !== deferredQuery}>
            {anchors.slice(0, anchorLimit).map(verse => (
              <li key={verse.id}>
                <button
                  className={selected === verse.id ? 'workshop-source-selected' : ''}
                  aria-label={`Chọn câu sáu dòng ${verse.id}`}
                  aria-pressed={selected === verse.id}
                  onClick={() => {
                    setSelected(verse.id)
                    setMatchLimit(8)
                  }}
                >
                  <span className="small muted">Dòng {verse.id}</span>
                  <span>
                    <RhymeLine text={verse.text} position={6} />
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {!anchors.length && (
            <p>Chưa có câu phù hợp. Thử bỏ bộ lọc hoặc lưu thêm câu thơ trong bản văn.</p>
          )}
          {anchors.length > anchorLimit && (
            <button className="button secondary" onClick={() => setAnchorLimit(value => value + 8)}>
              Xem thêm câu sáu
            </button>
          )}
        </div>
        <div>
          <label>
            Tìm câu tám chữ
            <input
              value={matchQuery}
              maxLength={100}
              placeholder="Lọc những câu cùng vần"
              onChange={event => {
                setMatchQuery(event.target.value)
                setMatchLimit(8)
              }}
            />
          </label>
          {anchor ? (
            <>
              <p className="small muted" role="status">
                {matches.length} câu tám cùng vần với dòng {anchor.id}
              </p>
              <Link
                className="text-button"
                href={`/full?line=${anchor.id}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Đọc nguồn câu sáu (mở thẻ mới)"
              >
                Đọc nguồn câu sáu
              </Link>
              <ol className="workshop-source-list" aria-busy={matchQuery !== deferredMatch}>
                {matches.slice(0, matchLimit).map(verse => (
                  <li key={verse.id}>
                    <button
                      aria-label={`Ghép câu tám dòng ${verse.id}`}
                      onClick={() => onAdd(anchor.id, verse.id)}
                    >
                      <span className="small muted">Dòng {verse.id} · Bấm để thêm cặp</span>
                      <span>
                        <RhymeLine text={verse.text} position={6} />
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              {!matches.length && <p>Chưa tìm thấy câu tám cùng vần trong bộ lọc này.</p>}
              {matches.length > matchLimit && (
                <button
                  className="button secondary"
                  onClick={() => setMatchLimit(value => value + 8)}
                >
                  Xem thêm câu tám
                </button>
              )}
            </>
          ) : (
            <p className="workshop-empty">
              Chọn một câu sáu chữ ở bên cạnh để khám phá các cách ghép.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
