'use client'

import { Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, ArrowLeft, ArrowRight, Bookmark, X, BookOpen, Sparkles } from 'lucide-react'
import { verses, PAGE_SIZE, searchVerses, getPassage, normalize } from '@/lib/kieu'
import { useLibrary } from '@/components/library-provider'
import { PassageActions } from '@/components/passage-card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Interpretation } from '@/components/interpretation'
import { ReadingQuest } from '@/components/reading-quest'

function Highlight({ text, query }: { text: string; query: string }) {
  const displayText = text.normalize('NFC')
  const term = normalize(query.trim())
  const start = normalize(displayText).indexOf(term)
  if (!term || start < 0) return <>{displayText}</>
  return (
    <>
      {displayText.slice(0, start)}
      <mark>{displayText.slice(start, start + term.length)}</mark>
      {displayText.slice(start + term.length)}
    </>
  )
}
function Reader() {
  const searchParams = useSearchParams()
  const routeKey = searchParams.toString()
  const { library, ready, setProgress, setFontSize, toggleSaved } = useLibrary()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [page, setPage] = useState(0)
  const [jump, setJump] = useState('')
  const [jumpRequest, setJumpRequest] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [highlight, setHighlight] = useState<number | null>(null)
  const initialized = useRef<string | null>(null)
  const readerTop = useRef<HTMLDivElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const passageTrigger = useRef<HTMLButtonElement | null>(null)
  const pendingJumpFocus = useRef(false)
  const searchPending = query !== deferredQuery
  const results = useMemo(() => searchVerses(deferredQuery), [deferredQuery])
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const safePage = Math.min(page, pages - 1)
  const visible = results.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
  const passage = selected === null ? [] : getPassage(selected)
  useEffect(() => {
    if (!ready || initialized.current === routeKey) return
    initialized.current = routeKey
    setSelected(null)
    const params = new URLSearchParams(routeKey)
    const search = params.get('q') || ''
    const requested = Number(params.get('line'))
    const id = verses.some(verse => verse.id === requested) ? requested : library.progress
    setQuery(search)
    setPage(search ? 0 : Math.floor((id - 1) / PAGE_SIZE))
    setHighlight(params.has('line') ? id : null)
  }, [ready, library.progress, routeKey])
  useEffect(() => {
    if (!highlight || !ready) return
    const line = document.getElementById(`line-${highlight}`)
    if (!line) return
    if (pendingJumpFocus.current) {
      line.querySelector<HTMLButtonElement>('.verse-text-button')?.focus({ preventScroll: true })
      pendingJumpFocus.current = false
    }
    line.scrollIntoView({ block: 'center' })
  }, [highlight, ready, safePage, deferredQuery, jumpRequest])
  function clearSearch() {
    setQuery('')
    setPage(0)
    searchInput.current?.focus()
  }
  function navigate(next: number) {
    const value = Math.max(0, Math.min(next, pages - 1))
    setPage(value)
    if (!query.trim()) {
      const id = verses[value * PAGE_SIZE].id
      setProgress(id)
      window.history.replaceState(null, '', `/full?line=${id}`)
    }
    readerTop.current?.focus({ preventScroll: true })
    readerTop.current?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }
  function jumpTo(event: React.FormEvent) {
    event.preventDefault()
    const id = Number(jump)
    if (!Number.isInteger(id) || id < 1 || id > verses.length) return
    pendingJumpFocus.current = true
    setJumpRequest(value => value + 1)
    setQuery('')
    setPage(Math.floor((id - 1) / PAGE_SIZE))
    setHighlight(id)
    setProgress(id)
    window.history.replaceState(null, '', `/full?line=${id}`)
  }
  return (
    <div className="shell page-content reader-page">
      <header className="page-heading">
        <div className="eyebrow">TỦ SÁCH VIỆT · NGUYỄN DU</div>
        <h1>Mở một trang Kiều.</h1>
        <p>Đọc chậm một chút. Để những câu thơ kể chuyện.</p>
      </header>
      <div className="reader-layout">
        <aside className="reader-sidebar">
          <div className="sidebar-title">
            <BookOpen size={19} />
            <h2>Truyện Kiều</h2>
          </div>
          <p className="muted small">Đoạn trường tân thanh</p>
          <div className="reading-progress">
            <span>Vị trí đã lưu</span>
            <strong>Dòng {library.progress.toLocaleString('vi-VN')}</strong>
            <div className="progress-track">
              <span style={{ width: `${Math.round((library.progress / verses.length) * 100)}%` }} />
            </div>
            <small>{Math.round((library.progress / verses.length) * 100)}% bản văn</small>
          </div>
          <form onSubmit={jumpTo}>
            <label htmlFor="jump-line">Đến dòng thơ</label>
            <div className="jump-control">
              <input
                id="jump-line"
                type="number"
                min="1"
                max={verses.length}
                required
                placeholder={`1 – ${verses.length}`}
                value={jump}
                onChange={event => setJump(event.target.value)}
              />
              <button className="icon-button" aria-label="Đến dòng đã chọn">
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
          <div className="font-settings">
            <label htmlFor="font-size">Cỡ chữ</label>
            <select
              id="font-size"
              value={library.fontSize}
              onChange={event => setFontSize(Number(event.target.value))}
            >
              {[18, 22, 26, 30].map(size => (
                <option key={size} value={size}>
                  {size === 18 ? 'Nhỏ' : size === 22 ? 'Vừa' : size === 26 ? 'Lớn' : 'Rất lớn'} ·{' '}
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="sidebar-tip">
            <Bookmark size={18} />
            <p>Chạm vào câu thơ để lưu, sao chép hoặc tìm hiểu thêm.</p>
          </div>
          <p className="edition-note">
            Giữ nguyên {verses.length.toLocaleString('vi-VN')} dòng của dữ liệu hiện có. Số dòng
            dùng để tra cứu trong ứng dụng; có thể khác các ấn bản khác.
          </p>
        </aside>
        <div
          className="reader-main"
          ref={readerTop}
          tabIndex={-1}
          role="region"
          aria-label="Nội dung Truyện Kiều"
        >
          <div className="reader-toolbar">
            <div className="search-field">
              <Search size={18} />
              <input
                ref={searchInput}
                aria-label="Tìm trong Truyện Kiều"
                placeholder="Tìm câu thơ, từ khóa hoặc số dòng…"
                value={query}
                onChange={event => {
                  setQuery(event.target.value)
                  setPage(0)
                }}
              />
              {query && (
                <button className="icon-button" aria-label="Xóa tìm kiếm" onClick={clearSearch}>
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          <div className="reader-meta" aria-live="polite">
            <span>
              {deferredQuery.trim()
                ? `${results.length} kết quả cho “${deferredQuery}”`
                : `Dòng ${visible[0]?.id}–${visible.at(-1)?.id}`}
            </span>
            <span>
              Trang {safePage + 1} / {pages}
            </span>
          </div>
          <div
            className="verse-list"
            aria-busy={searchPending}
            style={{ '--verse-size': `${library.fontSize}px` } as React.CSSProperties}
          >
            {visible.map(verse => (
              <div
                id={`line-${verse.id}`}
                key={verse.id}
                className={`verse-row ${highlight === verse.id ? 'highlighted' : ''}`}
              >
                <button
                  className="verse-text-button"
                  onClick={event => {
                    passageTrigger.current = event.currentTarget
                    setSelected(verse.id)
                    setProgress(verse.id)
                  }}
                >
                  <span className="line-number">{verse.id}</span>
                  <span className="verse-text">
                    <Highlight text={verse.text} query={deferredQuery} />
                  </span>
                </button>
                <button
                  className={`verse-bookmark ${library.saved.includes(getPassage(verse.id)[0].id) ? 'is-saved' : ''}`}
                  aria-label={`${library.saved.includes(getPassage(verse.id)[0].id) ? 'Bỏ lưu' : 'Lưu'} đoạn dòng ${verse.id}`}
                  aria-pressed={library.saved.includes(getPassage(verse.id)[0].id)}
                  disabled={!ready}
                  onClick={() => toggleSaved(getPassage(verse.id)[0].id)}
                >
                  <Bookmark
                    size={15}
                    fill={
                      library.saved.includes(getPassage(verse.id)[0].id) ? 'currentColor' : 'none'
                    }
                  />
                </button>
              </div>
            ))}
            {!visible.length && (
              <div className="empty-state">
                <Search size={30} />
                <h2>Chưa tìm thấy câu thơ</h2>
                <p>Thử một từ ngắn hơn hoặc tìm không dấu, như “tram nam”.</p>
                <button className="button secondary" onClick={clearSearch}>
                  Đọc toàn bộ tác phẩm
                </button>
              </div>
            )}
          </div>
          {!deferredQuery.trim() && visible.length > 0 && (
            <ReadingQuest key={visible[0].id} verseIds={visible.map(verse => verse.id)} />
          )}
          <nav className="pagination" aria-label="Trang thơ">
            <button
              className="button secondary"
              onClick={() => navigate(safePage - 1)}
              disabled={safePage === 0 || searchPending}
            >
              <ArrowLeft size={16} />
              Trang trước
            </button>
            <span>
              {safePage + 1} / {pages}
            </span>
            <button
              className="button secondary"
              onClick={() => navigate(safePage + 1)}
              disabled={safePage === pages - 1 || searchPending}
            >
              Trang sau
              <ArrowRight size={16} />
            </button>
          </nav>
        </div>
      </div>
      <Dialog
        open={selected !== null}
        onOpenChange={open => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent
          className="verse-dialog"
          onCloseAutoFocus={event => {
            event.preventDefault()
            if (passageTrigger.current?.isConnected) passageTrigger.current.focus()
            else readerTop.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>Một đoạn Kiều</DialogTitle>
            <DialogDescription>
              Dòng {passage.map(verse => verse.id).join('–')} · Bản văn trong ứng dụng
            </DialogDescription>
          </DialogHeader>
          <blockquote>
            {passage.map(verse => (
              <p key={verse.id}>{verse.text}</p>
            ))}
          </blockquote>
          <PassageActions passage={passage} />
          <div className="dialog-note">
            <Sparkles size={18} />
            <p>Đọc trong ngữ cảnh để cảm nhận trọn vẹn câu thơ.</p>
          </div>
          {selected !== null && (
            <Interpretation key={selected} text={passage.map(verse => verse.text).join('\n')} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ReaderPage() {
  return (
    <Suspense
      fallback={
        <div className="shell page-content" role="status">
          Đang mở trang thơ…
        </div>
      }
    >
      <Reader />
    </Suspense>
  )
}
