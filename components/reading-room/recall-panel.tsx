'use client'

import { useState } from 'react'
import { checkRecall, type RecallResult } from '@/lib/reading-room'
import type { Verse } from '@/lib/kieu'

export function RecallPanel({ lines }: { lines: Verse[] }) {
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<RecallResult | null>(null)
  return (
    <section className="room-card" aria-labelledby="recall-heading">
      <h2 id="recall-heading">Viết lại từ trí nhớ</h2>
      <p className="muted">
        Giữ đúng dấu tiếng Việt. Không tính hoa/thường, dấu câu hay xuống dòng. Bài tự luyện không
        cộng XP.
      </p>
      <form
        onSubmit={event => {
          event.preventDefault()
          setResult(checkRecall(lines.map(line => line.text).join('\n'), answer))
        }}
      >
        <label htmlFor="room-recall">Đoạn thơ bạn nhớ</label>
        <textarea
          id="room-recall"
          rows={5}
          maxLength={4000}
          value={answer}
          onChange={event => {
            setAnswer(event.target.value)
            setResult(null)
          }}
        />
        <button className="button primary" disabled={!answer.trim()}>
          Đối chiếu bài nhớ
        </button>
      </form>
      {result && (
        <div className="room-feedback" role="status">
          <p>
            <strong>
              {result.exact
                ? 'Bạn đã nhớ đúng từng từ!'
                : `${result.correct}/${result.total} từ đúng`}
            </strong>
          </p>
          <p className="small">Các từ thiếu, thừa hoặc khác dấu được ghi rõ dưới đây.</p>
          <div className="room-token-list">
            {result.tokens.map((token, index) => (
              <span key={index} className={`recall-token recall-${token.kind}`}>
                {token.kind === 'correct' && token.expected}
                {token.kind === 'changed' && (
                  <>
                    {token.actual} → <strong>{token.expected}</strong>
                  </>
                )}
                {token.kind === 'missing' && (
                  <>
                    Thiếu: <strong>{token.expected}</strong>
                  </>
                )}
                {token.kind === 'extra' && <>Thừa: {token.actual}</>}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
