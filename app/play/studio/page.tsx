'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, BookOpen, Plus, Star, Trash2 } from 'lucide-react'
import { useLibrary } from '@/components/library-provider'
import { useLocalStore } from '@/hooks/use-local-store'
import { getPassage, normalize } from '@/lib/kieu'
import {
  STUDIO_MAX_CARDS,
  STUDIO_MAX_DECKS,
  STUDIO_STORAGE_KEY,
  createStudioState,
  emptyStudioCounts,
  parseStudioState,
  studioAddCards,
  studioChangeDeck,
  studioCount,
  studioCreateDeck,
  studioFlashcard,
  studioMatchesCard,
  studioQueue,
  studioRateCard,
  studioRatingLabels,
  studioRatings,
  studioRemaining,
  studioSchedule,
  studioStudiedToday,
  studioTags,
  type StudioCard,
  type StudioCounts,
  type StudioRating,
} from '@/lib/studio'
import './studio.css'

type StudySession = {
  deckId: string
  deckName: string
  queue: number[]
  index: number
  counts: StudioCounts
  direction: 'forward' | 'reverse'
  cloze: boolean
}

function nextLabel(card: StudioCard, rating: StudioRating, now: number) {
  const schedule = studioSchedule(card, rating, now)
  return rating === 'again' ? '10 phút nữa' : `${schedule.intervalDays} ngày nữa`
}

function StudioCardEditor({
  card,
  onChange,
  onRemove,
}: {
  card: StudioCard
  onChange: (recipe: (previous: StudioCard) => StudioCard) => void
  onRemove: () => void
}) {
  const passage = getPassage(card.verseId)
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onChange(previous => ({
      ...previous,
      note: String(data.get('note') ?? '').slice(0, 1000),
      tags: studioTags(String(data.get('tags') ?? '')),
    }))
  }
  return (
    <article className="studio-card" aria-label={`Thẻ dòng ${card.verseId}`}>
      <div className="studio-row">
        <span className="eyebrow">DÒNG {passage.map(verse => verse.id).join('–')}</span>
        <div className="studio-actions">
          <button
            className="icon-button"
            aria-label={`Yêu thích thẻ ${card.verseId}`}
            aria-pressed={card.favorite}
            onClick={() => onChange(previous => ({ ...previous, favorite: !previous.favorite }))}
          >
            <Star size={18} fill={card.favorite ? 'currentColor' : 'none'} />
          </button>
          <button className="icon-button" aria-label={`Gỡ thẻ ${card.verseId}`} onClick={onRemove}>
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      <div className="studio-verse">
        {passage.map(verse => (
          <p key={verse.id}>{verse.text}</p>
        ))}
      </div>
      <p className="play-caption">
        {card.reviews
          ? `${card.reviews} lần tự ôn · Hẹn ôn: ${new Date(card.dueAt).toLocaleString('vi-VN')}`
          : 'Thẻ mới · Sẵn sàng ôn'}
      </p>
      {card.tags.length > 0 && (
        <p className="studio-tags">
          {card.tags.map(tag => (
            <span key={tag}>#{tag}</span>
          ))}
        </p>
      )}
      <details>
        <summary>Ghi chú và nhãn riêng</summary>
        <form onSubmit={save} key={`${card.note}:${card.tags.join(',')}`} className="studio-form">
          <label>
            Ghi chú cho thẻ {card.verseId}
            <textarea name="note" rows={3} maxLength={1000} defaultValue={card.note} />
          </label>
          <label>
            Nhãn cho thẻ {card.verseId}
            <input
              name="tags"
              maxLength={200}
              defaultValue={card.tags.join(', ')}
              placeholder="tình yêu, thiên nhiên…"
            />
          </label>
          <span className="play-caption">
            Tối đa 8 nhãn, mỗi nhãn 24 ký tự; ngăn cách bằng dấu phẩy.
          </span>
          <button className="button secondary" type="submit">
            Lưu ghi chú và nhãn
          </button>
        </form>
      </details>
      <Link className="text-link" href={`/full?line=${card.verseId}`}>
        Đọc ngữ cảnh dòng {card.verseId} ↗
      </Link>
    </article>
  )
}

export default function StudioPage() {
  const { state, ready, storageAvailable, update } = useLocalStore(
    STUDIO_STORAGE_KEY,
    createStudioState,
    parseStudioState
  )
  const { library, ready: libraryReady } = useLibrary()
  const [selectedId, setSelectedId] = useState('')
  const [deckQuery, setDeckQuery] = useState('')
  const [query, setQuery] = useState('')
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [dueOnly, setDueOnly] = useState(true)
  const [direction, setDirection] = useState<'forward' | 'reverse'>('forward')
  const [cloze, setCloze] = useState(false)
  const [message, setMessage] = useState('')
  const [now, setNow] = useState(0)
  const [session, setSession] = useState<StudySession | null>(null)
  const [revealed, setRevealed] = useState(false)
  const rated = useRef(new Set<number>())
  const studyHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const refresh = () => setNow(Date.now())
    refresh()
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 30_000)
    return () => {
      window.removeEventListener('focus', refresh)
      window.clearInterval(timer)
    }
  }, [])
  useEffect(() => {
    studyHeading.current?.focus()
  }, [session?.index, session?.deckId])

  const selected = state.decks.find(deck => deck.id === selectedId) ?? state.decks[0]
  const filteredDecks = state.decks.filter(
    deck =>
      normalize(deck.name).includes(normalize(deckQuery.trim())) ||
      deck.cards.some(card => studioMatchesCard(card, deckQuery))
  )
  const cards =
    selected?.cards.filter(
      card => (!favoriteOnly || card.favorite) && studioMatchesCard(card, query)
    ) ?? []
  const queue = selected
    ? studioQueue(state, selected.id, now, { query, favoriteOnly, dueOnly })
    : []
  const activeDeck = state.decks.find(deck => deck.id === session?.deckId)
  const activeCard = activeDeck?.cards.find(card => card.verseId === session?.queue[session.index])
  const finished =
    session !== null && (session.index >= session.queue.length || studioRemaining(state, now) === 0)
  const flashcard =
    activeCard && session
      ? studioFlashcard(activeCard.verseId, session.direction, session.cloze)
      : null

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const name = String(new FormData(form).get('deckName') ?? '').trim()
    if (!name) return
    const id = crypto.randomUUID()
    update(previous => studioCreateDeck(previous, id, name))
    setSelectedId(id)
    setDeckQuery('')
    setQuery('')
    setMessage(`Đã tạo bộ thẻ “${name}”.`)
    form.reset()
  }

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    const form = event.currentTarget
    const id = Number(new FormData(form).get('verseId'))
    const passage = getPassage(id)
    if (!Number.isInteger(id) || !passage.length) {
      setMessage('Không tìm thấy số dòng này trong bản nhập. Vui lòng kiểm tra lại.')
      return
    }
    if (selected.cards.some(card => card.verseId === passage[0].id)) {
      setMessage('Cặp thơ này đã có trong bộ thẻ; mỗi cặp chỉ giữ một thẻ.')
      return
    }
    update(previous => studioAddCards(previous, selected.id, [id]))
    setMessage(`Đã thêm thẻ dòng ${passage.map(verse => verse.id).join('–')}.`)
    form.reset()
  }

  function start() {
    if (!selected) return
    const current = Date.now()
    const nextQueue = studioQueue(state, selected.id, current, { query, favoriteOnly, dueOnly })
    setNow(current)
    if (!nextQueue.length) return
    rated.current = new Set()
    setRevealed(false)
    setSession({
      deckId: selected.id,
      deckName: selected.name,
      queue: nextQueue.map(card => card.verseId),
      index: 0,
      counts: emptyStudioCounts(),
      direction,
      cloze,
    })
  }

  function rate(rating: StudioRating) {
    if (!session || !activeCard || !revealed || rated.current.has(activeCard.verseId)) return
    const current = Date.now()
    if (!studioRemaining(state, current)) {
      setNow(current)
      return
    }
    rated.current.add(activeCard.verseId)
    update(previous =>
      studioRateCard(previous, session.deckId, activeCard.verseId, rating, current)
    )
    setNow(current)
    setRevealed(false)
    setSession(
      previous =>
        previous && {
          ...previous,
          index: previous.index + 1,
          counts: { ...previous.counts, [rating]: previous.counts[rating] + 1 },
        }
    )
  }

  return (
    <div className="shell page-content studio-page">
      <Link className="back-link" href="/play">
        <ArrowLeft size={16} /> Chơi cùng Kiều
      </Link>
      <header className="page-heading">
        <div className="eyebrow">MỘT BỘ THẺ, MỘT CÁCH NHỚ RIÊNG</div>
        <h1>Xưởng thẻ ghi nhớ.</h1>
        <p>Tự chọn câu thơ, viết điều muốn giữ và trở lại khi đến hẹn.</p>
      </header>
      <p className="notice studio-notice">
        Bạn tự đánh giá mức nhớ; lịch ôn chỉ hỗ trợ học tập. Không chấm đúng/sai và không cộng XP.
        {storageAvailable
          ? ' Bộ thẻ và ghi chú chỉ được lưu trên trình duyệt này.'
          : ' Trình duyệt không cho phép lưu; thay đổi chỉ được giữ trong phiên này.'}
      </p>
      {!ready ? (
        <p role="status">Đang mở xưởng thẻ…</p>
      ) : session ? (
        <section className="game-panel studio-study" aria-label="Lượt tự ôn">
          <div className="studio-row">
            <span className="eyebrow">{session.deckName}</span>
            <button className="text-button" onClick={() => setSession(null)}>
              {finished ? 'Về bộ thẻ' : 'Dừng ôn và về bộ thẻ'}
            </button>
          </div>
          {finished ? (
            <>
              <h2 ref={studyHeading} tabIndex={-1}>
                Đã hoàn thành lượt tự ôn.
              </h2>
              <p>
                {studioCount(session.counts)} thẻ đã ôn · Các đánh giá đã được lưu vào lịch hẹn.
              </p>
              <dl className="studio-summary">
                {studioRatings.map(rating => (
                  <div key={rating}>
                    <dt>{studioRatingLabels[rating]}</dt>
                    <dd>{session.counts[rating]} thẻ</dd>
                  </div>
                ))}
              </dl>
              <p className="play-caption">
                Đây là cảm nhận của bạn về mức nhớ, không phải tỷ lệ trả lời đúng.
              </p>
              {!studioRemaining(state, now) && (
                <p className="notice">Bạn đã đủ {state.dailyCap} thẻ hôm nay. Hẹn bạn ngày mai.</p>
              )}
            </>
          ) : !activeCard || !flashcard ? (
            <p role="status">Bộ thẻ đã thay đổi ở cửa sổ khác. Về bộ thẻ để bắt đầu lượt mới.</p>
          ) : (
            <>
              <h2 ref={studyHeading} tabIndex={-1}>
                Thẻ {session.index + 1} / {session.queue.length}
              </h2>
              <p className="play-caption">
                {session.cloze
                  ? 'Nhớ những chữ bị che rồi mở nguyên văn.'
                  : session.direction === 'forward'
                    ? 'Nhớ phần tiếp theo rồi mở mặt sau.'
                    : 'Nhớ phần đứng trước rồi mở mặt sau.'}
                {flashcard.fragment &&
                  ' Dòng riêng trong bản nhập: thẻ được chia thành hai nửa để ôn.'}
              </p>
              <div className="studio-flashcard">
                <span className="eyebrow">{session.cloze ? 'THƠ KHUYẾT CHỮ' : 'MẶT TRƯỚC'}</span>
                <p className="studio-verse">{flashcard.prompt}</p>
              </div>
              {!revealed ? (
                <button className="button primary" onClick={() => setRevealed(true)}>
                  {session.cloze ? 'Mở nguyên văn' : 'Lật mặt sau'}
                </button>
              ) : (
                <>
                  <div className="studio-answer" aria-live="polite">
                    <span className="eyebrow">{session.cloze ? 'NGUYÊN VĂN' : 'MẶT SAU'}</span>
                    <p className="studio-verse">{flashcard.answer}</p>
                    <p className="play-caption">
                      Nguyễn Du · Truyện Kiều · Số dòng theo bản nhập trong ứng dụng
                    </p>
                    <div className="studio-source">
                      {getPassage(activeCard.verseId).map(verse => (
                        <Link key={verse.id} className="text-link" href={`/full?line=${verse.id}`}>
                          Đọc nguồn dòng {verse.id} ↗
                        </Link>
                      ))}
                    </div>
                    {activeCard.note && (
                      <p className="studio-private-note">Ghi chú riêng: {activeCard.note}</p>
                    )}
                  </div>
                  <p>Tự đánh giá mức nhớ để hẹn lần ôn sau:</p>
                  <div className="studio-ratings" role="group" aria-label="Tự đánh giá mức nhớ">
                    {studioRatings.map(rating => (
                      <button
                        className="button secondary"
                        key={rating}
                        onClick={() => rate(rating)}
                      >
                        <strong>{studioRatingLabels[rating]}</strong>
                        <span>{nextLabel(activeCard, rating, now)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      ) : (
        <>
          <p className="studio-message" role="status" aria-live="polite">
            {message}
          </p>
          <div className="studio-layout">
            <aside className="game-panel studio-decks" aria-label="Bộ thẻ của bạn">
              <h2>Bộ thẻ của bạn</h2>
              <form onSubmit={create} className="studio-form">
                <label>
                  Tên bộ thẻ mới
                  <input
                    name="deckName"
                    maxLength={60}
                    required
                    placeholder="Một góc thiên nhiên…"
                  />
                </label>
                <button
                  className="button secondary"
                  type="submit"
                  disabled={state.decks.length >= STUDIO_MAX_DECKS}
                >
                  <Plus size={16} /> Tạo bộ thẻ
                </button>
              </form>
              {state.decks.length >= STUDIO_MAX_DECKS && (
                <p className="play-caption">Đã đạt giới hạn {STUDIO_MAX_DECKS} bộ thẻ.</p>
              )}
              <label className="studio-label">
                Tìm bộ thẻ
                <input
                  value={deckQuery}
                  onChange={event => setDeckQuery(event.target.value)}
                  placeholder="Tên, câu thơ, ghi chú, nhãn…"
                />
              </label>
              <div className="studio-deck-list">
                {filteredDecks.map(deck => (
                  <button
                    key={deck.id}
                    aria-pressed={selected?.id === deck.id}
                    onClick={() => {
                      setSelectedId(deck.id)
                      setQuery('')
                      setFavoriteOnly(false)
                    }}
                  >
                    <BookOpen size={17} />
                    <span>
                      {deck.name}
                      <small>{deck.cards.length} thẻ</small>
                    </span>
                  </button>
                ))}
              </div>
              {state.decks.length > 0 && !filteredDecks.length && <p>Chưa có bộ thẻ phù hợp.</p>}
            </aside>
            <div className="studio-main">
              {!selected ? (
                <div className="game-panel empty-state">
                  <BookOpen size={30} />
                  <h2>Đặt tên cho một cách nhớ.</h2>
                  <p>Tạo bộ thẻ đầu tiên, rồi thêm số dòng hoặc nhập từ dấu trang của bạn.</p>
                </div>
              ) : (
                <>
                  <section className="game-panel studio-form" aria-labelledby="studio-deck-heading">
                    <div className="studio-row">
                      <h2 id="studio-deck-heading">{selected.name}</h2>
                      <button
                        className="text-button"
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Xóa bộ thẻ “${selected.name}” cùng toàn bộ thẻ và ghi chú riêng? Thao tác này không thể hoàn tác.`
                            )
                          )
                            return
                          update(previous => ({
                            ...previous,
                            decks: previous.decks.filter(deck => deck.id !== selected.id),
                          }))
                          setMessage(`Đã xóa bộ thẻ “${selected.name}”.`)
                        }}
                      >
                        <Trash2 size={16} /> Xóa bộ thẻ
                      </button>
                    </div>
                    <form
                      className="studio-inline-form"
                      key={selected.id + selected.name}
                      onSubmit={event => {
                        event.preventDefault()
                        const name = String(
                          new FormData(event.currentTarget).get('name') ?? ''
                        ).trim()
                        if (!name) return
                        update(previous =>
                          studioChangeDeck(previous, selected.id, deck => ({
                            ...deck,
                            name: name.slice(0, 60),
                          }))
                        )
                        setMessage('Đã đổi tên bộ thẻ.')
                      }}
                    >
                      <label>
                        Tên bộ thẻ
                        <input name="name" maxLength={60} required defaultValue={selected.name} />
                      </label>
                      <button className="button secondary" type="submit">
                        Đổi tên
                      </button>
                    </form>
                    <form className="studio-inline-form" onSubmit={add}>
                      <label>
                        Số dòng trong bản nhập
                        <input
                          name="verseId"
                          type="number"
                          min={1}
                          step={1}
                          required
                          placeholder="Ví dụ: 1"
                        />
                      </label>
                      <button
                        className="button primary"
                        type="submit"
                        disabled={selected.cards.length >= STUDIO_MAX_CARDS}
                      >
                        Thêm thẻ theo dòng
                      </button>
                    </form>
                    <p className="play-caption">
                      Số dòng theo bản nhập trong ứng dụng. Hai dòng trong cùng cặp lục bát tạo một
                      thẻ, không trùng lặp. Mỗi bộ tối đa {STUDIO_MAX_CARDS} thẻ.
                    </p>
                    <button
                      className="button secondary"
                      disabled={
                        !libraryReady ||
                        !library.saved.length ||
                        selected.cards.length >= STUDIO_MAX_CARDS
                      }
                      onClick={() => {
                        const before = selected.cards.length
                        const next = studioAddCards(state, selected.id, library.saved)
                        const count =
                          (next.decks.find(deck => deck.id === selected.id)?.cards.length ??
                            before) - before
                        update(previous => studioAddCards(previous, selected.id, library.saved))
                        setMessage(
                          `Đã nhập ${count} thẻ mới từ dấu trang; bỏ qua cặp đã có và giữ trong giới hạn bộ thẻ.`
                        )
                      }}
                    >
                      Nhập các câu đã lưu ({library.saved.length})
                    </button>
                  </section>
                  <section className="game-panel studio-form" aria-labelledby="studio-study-title">
                    <h2 id="studio-study-title">Hôm nay, nhớ một chút.</h2>
                    <p>
                      {studioStudiedToday(state, now)} / {state.dailyCap} thẻ đã ôn hôm nay · Còn{' '}
                      {studioRemaining(state, now)} thẻ cho mọi bộ thẻ.
                    </p>
                    <div className="studio-settings">
                      <label>
                        Giới hạn thẻ mỗi ngày
                        <select
                          value={state.dailyCap}
                          onChange={event => {
                            const dailyCap = Number(event.target.value) as 5 | 10 | 20
                            update(previous => ({ ...previous, dailyCap }))
                          }}
                        >
                          <option value={5}>5 thẻ</option>
                          <option value={10}>10 thẻ</option>
                          <option value={20}>20 thẻ</option>
                        </select>
                      </label>
                      <label>
                        Hướng ghi nhớ
                        <select
                          disabled={cloze}
                          value={direction}
                          onChange={event =>
                            setDirection(event.target.value as 'forward' | 'reverse')
                          }
                        >
                          <option value="forward">Nhớ câu tiếp theo</option>
                          <option value="reverse">Nhớ câu đứng trước</option>
                        </select>
                      </label>
                    </div>
                    <label className="studio-check">
                      <input
                        type="checkbox"
                        checked={cloze}
                        onChange={event => setCloze(event.target.checked)}
                      />{' '}
                      Ôn thẻ khuyết chữ
                    </label>
                    <label className="studio-check">
                      <input
                        type="checkbox"
                        checked={dueOnly}
                        onChange={event => setDueOnly(event.target.checked)}
                      />{' '}
                      Chỉ ôn thẻ đến hẹn
                    </label>
                    <p className="play-caption">
                      Lượt ôn dùng bộ lọc câu thơ và yêu thích bên dưới. Mỗi thẻ xuất hiện một lần
                      trong lượt; “Chưa nhớ” được hẹn lại sau 10 phút. Giới hạn tính theo ngày trên
                      thiết bị.
                    </p>
                    <button className="button primary" disabled={!queue.length} onClick={start}>
                      Bắt đầu tự ôn · {queue.length} thẻ
                    </button>
                    {!queue.length && (
                      <p className="play-caption">
                        {!studioRemaining(state, now)
                          ? 'Đã đạt giới hạn hôm nay. Trở lại ngày mai hoặc chủ động đổi giới hạn.'
                          : selected.cards.length
                            ? 'Chưa có thẻ phù hợp đến hẹn. Bạn có thể đổi bộ lọc hoặc tắt “Chỉ ôn thẻ đến hẹn”.'
                            : 'Thêm câu thơ để bắt đầu tự ôn.'}
                      </p>
                    )}
                  </section>
                  <section className="studio-form" aria-label="Các thẻ trong bộ">
                    <div className="studio-settings">
                      <label>
                        Tìm thẻ
                        <input
                          value={query}
                          onChange={event => setQuery(event.target.value)}
                          placeholder="Câu thơ, số dòng, ghi chú, nhãn…"
                        />
                      </label>
                      <label className="studio-check">
                        <input
                          type="checkbox"
                          checked={favoriteOnly}
                          onChange={event => setFavoriteOnly(event.target.checked)}
                        />{' '}
                        Chỉ thẻ yêu thích
                      </label>
                    </div>
                    <p className="play-caption">
                      {cards.length} / {selected.cards.length} thẻ trong bộ
                    </p>
                    <div className="studio-cards">
                      {cards.map(card => (
                        <StudioCardEditor
                          key={`${selected.id}:${card.verseId}`}
                          card={card}
                          onChange={recipe => {
                            update(previous =>
                              studioChangeDeck(previous, selected.id, deck => ({
                                ...deck,
                                cards: deck.cards.map(item =>
                                  item.verseId === card.verseId ? recipe(item) : item
                                ),
                              }))
                            )
                            setMessage('Đã cập nhật thẻ.')
                          }}
                          onRemove={() => {
                            update(previous =>
                              studioChangeDeck(previous, selected.id, deck => ({
                                ...deck,
                                cards: deck.cards.filter(item => item.verseId !== card.verseId),
                              }))
                            )
                            setMessage(`Đã gỡ thẻ dòng ${card.verseId}.`)
                          }}
                        />
                      ))}
                    </div>
                    {!cards.length && selected.cards.length > 0 && (
                      <p>Chưa có thẻ phù hợp bộ lọc.</p>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
