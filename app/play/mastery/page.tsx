'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, Check } from 'lucide-react'
import { useGamification } from '@/components/gamification-provider'
import { normalize, verses, words, type Verse } from '@/lib/kieu'

const byId = new Map(verses.map(verse => [verse.id, verse]))

export default function MasteryPage() {
  const { state, today, ready, track } = useGamification()
  const [includeMastered, setIncludeMastered] = useState(false)
  const [cards, setCards] = useState<Verse[]>([])
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [hinted, setHinted] = useState(false)
  const [feedback, setFeedback] = useState<boolean | null>(null)
  const [correctIds, setCorrectIds] = useState<number[]>([])
  const [done, setDone] = useState(false)
  const [recorded, setRecorded] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const feedbackPanel = useRef<HTMLDivElement>(null)
  const summary = useRef<HTMLHeadingElement>(null)
  const finishLock = useRef(false)
  const candidates = [...new Set([...Object.keys(state.mastery).map(Number), ...state.readIds])]
    .filter(
      id =>
        state.mastery[id]?.lastDate !== today &&
        (includeMastered || (state.mastery[id]?.count ?? 0) < 3)
    )
    .sort((a, b) => (state.mastery[a]?.count ?? 0) - (state.mastery[b]?.count ?? 0) || a - b)
    .flatMap(id => (byId.has(id) ? [byId.get(id)!] : []))
  const card = cards[index]
  const target = card ? words(card.text).at(-1)! : ''
  const prompt = card ? card.text.replace(/[\p{L}]+(?=[^\p{L}]*$)/u, '_____') : ''
  useEffect(() => {
    if (cards.length && !done) input.current?.focus()
  }, [cards, index, done])
  useEffect(() => {
    if (done) summary.current?.focus()
    else if (feedback !== null) feedbackPanel.current?.focus()
  }, [feedback, done])
  function start() {
    setCards(candidates.slice(0, 5))
    setIndex(0)
    setAnswer('')
    setHinted(false)
    setFeedback(null)
    setCorrectIds([])
    setDone(false)
    setRecorded(false)
    finishLock.current = false
  }
  function next() {
    if (feedback === null || finishLock.current) return
    const remembered = feedback && !hinted ? [...correctIds, card.id] : correctIds
    setCorrectIds(remembered)
    if (index === cards.length - 1) {
      finishLock.current = true
      if (remembered.length)
        setRecorded(track({ type: 'review', id: crypto.randomUUID(), verseIds: remembered }))
      setDone(true)
    } else {
      setIndex(value => value + 1)
      setAnswer('')
      setHinted(false)
      setFeedback(null)
    }
  }
  return (
    <div className="shell page-content play-page game-page">
      <Link className="text-link" href="/play/adventure">
        <ArrowLeft size={16} /> Vườn tri âm
      </Link>
      <header className="page-heading">
        <div className="eyebrow">GẶP LẠI ĐỂ NHỚ LÂU</div>
        <h1>Ôn theo nhịp nhớ.</h1>
        <p>Một câu thơ, nhiều cuộc hẹn. Mỗi dòng tiến thêm một bậc khi nhớ đúng ở một ngày mới.</p>
      </header>
      {!cards.length ? (
        <section className="game-panel game-intro">
          <BookOpen size={32} />
          <h2>{ready ? `${candidates.length} dòng đến hẹn ôn` : 'Đang mở sổ nhớ…'}</h2>
          <p>
            Ưu tiên dòng ít được ôn nhất từ những trang đã xác nhận đọc và câu từng trả lời đúng. Gõ
            chữ cuối không cần dấu. Đúng không dùng gợi ý trong 3 ngày khác nhau để thành thạo.
          </p>
          <label className="mastery-option">
            <input
              type="checkbox"
              checked={includeMastered}
              onChange={event => setIncludeMastered(event.target.checked)}
            />
            Ôn thêm những dòng đã thành thạo
          </label>
          <p className="play-caption">
            Hoàn thành cả lượt để lưu. Dòng đã ôn hôm nay sẽ hẹn bạn ngày mai. Không giới hạn thời
            gian. Tối đa 50 dòng ôn được thưởng mỗi ngày; sau đó vẫn cập nhật bậc nhớ.
          </p>
          <button
            className="button primary"
            disabled={!ready || !today || !candidates.length}
            onClick={start}
          >
            Ôn {Math.min(5, candidates.length)} dòng đến hẹn
          </button>
          {!candidates.length && ready && (
            <Link className="text-link" href="/full">
              Đọc và ghi dấu một trang thơ mới →
            </Link>
          )}
        </section>
      ) : done ? (
        <section className="game-panel game-summary">
          <Check size={32} />
          <h2 ref={summary} tabIndex={-1}>
            Lời thơ ở lại thêm một chút.
          </h2>
          <p>
            Nhớ đúng không gợi ý {correctIds.length}/{cards.length} dòng.
          </p>
          <p role="status">
            {recorded
              ? 'Đã ghi bậc nhớ. Điểm thưởng dành cho 50 dòng ôn đầu tiên mỗi ngày. Hẹn bạn ngày mai.'
              : 'Chưa có dòng mới được ghi bậc nhớ. Cứ thong thả luyện lại.'}
          </p>
          <button className="button primary" onClick={() => setCards([])}>
            Chọn lượt ôn tiếp
          </button>
          <ul className="mastery-results">
            {cards.map(verse => (
              <li key={verse.id}>
                <span>{correctIds.includes(verse.id) ? '✓ Nhớ đúng' : 'Cần ôn thêm'}</span>
                <p>{verse.text}</p>
                <Link className="text-link" href={`/full?line=${verse.id}`}>
                  Đọc dòng {verse.id} trong bản văn
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="game-panel">
          <p className="eyebrow">
            DÒNG {index + 1}/{cards.length} · BẬC NHỚ {state.mastery[card.id]?.count ?? 0}/3
          </p>
          <progress value={index} max={cards.length} aria-label="Tiến độ lượt ôn" />
          <h2 className="game-prompt">{prompt}</h2>
          <form
            onSubmit={event => {
              event.preventDefault()
              if (feedback === null && answer.trim())
                setFeedback(
                  normalize(words(answer.normalize('NFC')).join(' ')) === normalize(target)
                )
            }}
          >
            <label htmlFor="mastery-answer">Chữ cuối còn thiếu</label>
            <input
              className="mastery-answer"
              id="mastery-answer"
              ref={input}
              value={answer}
              maxLength={100}
              autoComplete="off"
              disabled={feedback !== null}
              onChange={event => setAnswer(event.target.value)}
            />
            {feedback === null && (
              <div className="game-actions">
                <button className="button primary" disabled={!answer.trim()}>
                  Kiểm tra
                </button>
                <button
                  className="button secondary"
                  type="button"
                  disabled={hinted}
                  onClick={() => setHinted(true)}
                >
                  Gợi ý · không tăng bậc nhớ
                </button>
                <button className="text-link" type="button" onClick={() => setFeedback(false)}>
                  Chưa nhớ
                </button>
              </div>
            )}
          </form>
          {hinted && <p className="notice">Chữ bắt đầu bằng “{target[0]}”.</p>}
          {feedback !== null && (
            <div className="game-feedback" role="status" ref={feedbackPanel} tabIndex={-1}>
              <h3>{feedback ? 'Bạn đã nhớ đúng!' : 'Cùng đọc lại lời thơ'}</h3>
              <p>{card.text}</p>
              <button className="button primary" onClick={next}>
                {index === cards.length - 1 ? 'Hoàn thành lượt ôn' : 'Dòng tiếp theo'}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
