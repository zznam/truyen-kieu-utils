'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useLocalStore } from '@/hooks/use-local-store'
import { useReadAloud } from '@/hooks/use-read-aloud'
import { useLibrary } from '@/components/library-provider'
import { PassageActions } from '@/components/passage-card'
import { getPassage, passageText } from '@/lib/kieu'
import {
  addReadingEntry,
  createReadingRoom,
  editReadingEntry,
  excerpt,
  excerptContext,
  memoryText,
  parseReadingRoom,
  rangeKey,
  READING_ROOM_KEY,
  type MemoryMode,
  type ReadingRange,
} from '@/lib/reading-room'
import { RecallPanel } from './recall-panel'
import { ComparisonPanel } from './comparison-panel'
import { NotebookPanel } from './notebook-panel'

type RoomTab = 'read' | 'compare' | 'notebook'
const tabs: { id: RoomTab; label: string }[] = [
  { id: 'read', label: 'Đọc & nhớ' },
  { id: 'compare', label: 'Đối chiếu & tra từ' },
  { id: 'notebook', label: 'Sổ đọc' },
]

export function ReadingWorkspace() {
  const params = useSearchParams()
  const routeKey = params.toString()
  const { state, ready, storageAvailable, update } = useLocalStore(
    READING_ROOM_KEY,
    createReadingRoom,
    parseReadingRoom
  )
  const { library, setFontSize } = useLibrary()
  const speech = useReadAloud()
  const stopSpeech = speech.stop
  const [range, setRange] = useState<ReadingRange>({ start: 1, end: 8 })
  const [start, setStart] = useState('1')
  const [end, setEnd] = useState('8')
  const [tab, setTab] = useState<RoomTab>('read')
  const [cursor, setCursor] = useState(1)
  const [contextCount, setContextCount] = useState(0)
  const [memory, setMemory] = useState<MemoryMode>('visible')
  const [revealed, setRevealed] = useState<number[]>([])
  const [focus, setFocus] = useState(false)
  const [voice, setVoice] = useState('')
  const [rate, setRate] = useState('0.9')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [rangeError, setRangeError] = useState('')
  const activeLine = useRef<HTMLDivElement>(null)
  const readTab = useRef<HTMLButtonElement>(null)
  const lines = useMemo(() => excerpt(range), [range])
  const context = excerptContext(range, contextCount)
  const index = Math.max(
    0,
    lines.findIndex(line => line.id === cursor)
  )
  const currentLine = lines[index]
  const entry = state.entries.find(item => rangeKey(item) === rangeKey(range))

  useEffect(() => {
    if (speech.status === 'playing') activeLine.current?.scrollIntoView({ block: 'nearest' })
  }, [currentLine.id, speech.status])

  useEffect(() => {
    const location = new URLSearchParams(routeKey)
    const requested = {
      start: Number(location.get('from') || 1),
      end: Number(location.get('to') || 8),
    }
    const valid = excerpt(requested)
    const next = valid.length ? requested : { start: 1, end: 8 }
    const at = Number(location.get('at'))
    stopSpeech()
    setRange(next)
    setStart(String(next.start))
    setEnd(String(next.end))
    setCursor(excerpt(next).some(line => line.id === at) ? at : next.start)
    setRevealed([])
    setMessage('')
    setRangeError(valid.length ? '' : 'Liên kết có khoảng dòng không hợp lệ. Đã mở dòng 1–8.')
  }, [routeKey, stopSpeech])

  function openRange(next: ReadingRange, at = next.start) {
    stopSpeech()
    setRange(next)
    setCursor(at)
    setStart(String(next.start))
    setEnd(String(next.end))
    setRevealed([])
    setRangeError('')
    setMessage('')
    setTab('read')
    window.history.replaceState(
      null,
      '',
      `/reading-room?from=${next.start}&to=${next.end}&at=${at}`
    )
  }

  function selectLine(id: number) {
    setCursor(id)
    if (entry)
      update(current => {
        const latest = current.entries.find(item => rangeKey(item) === rangeKey(range))
        if (!latest) return current
        return editReadingEntry(current, range, {
          cursor: id,
          status: latest.status === 'done' ? 'done' : 'reading',
        })
      })
  }

  function step(direction: number) {
    const next = lines[index + direction]
    if (!next) return
    stopSpeech()
    selectLine(next.id)
  }

  async function copyExcerpt(link: boolean) {
    try {
      await navigator.clipboard.writeText(
        link
          ? `${window.location.origin}/reading-room?from=${range.start}&to=${range.end}&at=${currentLine.id}`
          : passageText(lines)
      )
      toast.success(link ? 'Đã sao chép liên kết đoạn đọc' : 'Đã sao chép đoạn thơ có nguồn')
    } catch {
      toast.error('Chưa thể sao chép. Bạn có thể chọn văn bản trực tiếp.')
    }
  }

  return (
    <div className={`shell page-content reading-room ${focus ? 'room-focused' : ''}`}>
      <header className="page-heading room-secondary">
        <div className="eyebrow">ĐỌC CHẬM · NHỚ SÂU · NGHĨ RIÊNG</div>
        <h1>Phòng đọc Kiều</h1>
        <p>Một khoảng yên để ở lại cùng câu thơ.</p>
      </header>
      {!storageAvailable && ready && (
        <p className="room-notice" role="status">
          Chưa thể lưu vào trình duyệt. Sổ đọc đang được giữ trong phiên này; hãy xuất bản sao trước
          khi rời trang.
        </p>
      )}
      <div className="room-actions">
        <Link className="text-button room-secondary" href={`/full?line=${currentLine.id}`}>
          ← Về bản văn đầy đủ
        </Link>
        <button
          className="button secondary"
          aria-pressed={focus}
          onClick={() => {
            stopSpeech()
            setFocus(value => !value)
            setTab('read')
          }}
        >
          {focus ? 'Rời chế độ tập trung' : 'Chế độ tập trung'}
        </button>
      </div>
      <div className="room-tabs room-secondary" role="tablist" aria-label="Hoạt động phòng đọc">
        {tabs.map((item, tabIndex) => (
          <button
            key={item.id}
            ref={item.id === 'read' ? readTab : undefined}
            id={`tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => {
              stopSpeech()
              setTab(item.id)
            }}
            onKeyDown={event => {
              let next = tabIndex
              if (event.key === 'ArrowRight') next = (tabIndex + 1) % tabs.length
              else if (event.key === 'ArrowLeft') next = (tabIndex + tabs.length - 1) % tabs.length
              else if (event.key === 'Home') next = 0
              else if (event.key === 'End') next = tabs.length - 1
              else return
              event.preventDefault()
              stopSpeech()
              setTab(tabs[next].id)
              document.getElementById(`tab-${tabs[next].id}`)?.focus()
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div id="panel-read" role="tabpanel" aria-labelledby="tab-read" hidden={tab !== 'read'}>
        <section className="room-card room-secondary" aria-labelledby="range-heading">
          <h2 id="range-heading">Chọn khoảng thơ của bạn</h2>
          <p className="muted small">
            Tối đa 40 dòng theo bản văn trong ứng dụng, không phải số câu của mọi ấn bản.
          </p>
          <form
            className="room-inline-form"
            onSubmit={event => {
              event.preventDefault()
              const next = { start: Number(start), end: Number(end) }
              if (!excerpt(next).length) {
                setRangeError('Khoảng dòng không hợp lệ. Chọn theo thứ tự và tối đa 40 dòng.')
                return
              }
              openRange(next)
            }}
          >
            <label>
              Từ dòng
              <input
                type="number"
                min="1"
                required
                value={start}
                onChange={event => setStart(event.target.value)}
              />
            </label>
            <label>
              Đến dòng
              <input
                type="number"
                min="1"
                required
                value={end}
                onChange={event => setEnd(event.target.value)}
              />
            </label>
            <button className="button primary">Mở đoạn đọc</button>
          </form>
          {rangeError && <p role="alert">{rangeError}</p>}
          <div className="room-inline-form">
            <label>
              Ngữ cảnh xung quanh
              <select
                value={contextCount}
                onChange={event => setContextCount(Number(event.target.value))}
              >
                {[0, 2, 4, 8].map(value => (
                  <option key={value} value={value}>
                    {value ? `${value} dòng mỗi phía` : 'Chỉ đoạn đã chọn'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cỡ chữ phòng đọc
              <select
                value={library.fontSize}
                onChange={event => setFontSize(Number(event.target.value))}
              >
                {[18, 22, 26, 30].map(value => (
                  <option key={value} value={value}>
                    {value}px
                  </option>
                ))}
              </select>
            </label>
            <label>
              Gợi ý ghi nhớ
              <select
                value={memory}
                onChange={event => {
                  setMemory(event.target.value as MemoryMode)
                  setRevealed([])
                }}
              >
                <option value="visible">Hiện nguyên văn</option>
                <option value="endings">Ẩn hai từ cuối</option>
                <option value="initials">Chỉ gợi chữ đầu</option>
                <option value="hidden">Ẩn toàn bộ từ</option>
              </select>
            </label>
          </div>
        </section>

        <section
          className="room-card room-poem"
          aria-label="Đoạn đọc"
          style={{ '--room-font-size': `${library.fontSize}px` } as React.CSSProperties}
        >
          <div className="room-actions">
            <span className="eyebrow">
              DÒNG {range.start}–{range.end}
            </span>
            <span role="status">
              Đang đọc dòng {currentLine.id} · {index + 1}/{lines.length}
            </span>
          </div>
          {context.before.length > 0 && (
            <blockquote className="room-context" aria-label="Ngữ cảnh trước">
              {context.before.map(line => (
                <p key={line.id}>
                  <span>{line.id}</span> {line.text}
                </p>
              ))}
            </blockquote>
          )}
          <div
            className="room-lines"
            tabIndex={0}
            aria-label="Dùng phím lên xuống để đọc từng dòng"
            onKeyDown={event => {
              if (event.target !== event.currentTarget) return
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault()
                step(event.key === 'ArrowDown' ? 1 : -1)
              }
            }}
          >
            {lines.map(line => (
              <div
                key={line.id}
                ref={line.id === currentLine.id ? activeLine : undefined}
                className={`room-line ${line.id === currentLine.id ? 'room-line-active' : ''}`}
              >
                <button
                  className="room-line-number"
                  aria-label={`Đọc dòng ${line.id}`}
                  aria-current={line.id === currentLine.id ? 'step' : undefined}
                  onClick={() => {
                    stopSpeech()
                    selectLine(line.id)
                  }}
                >
                  {line.id}
                </button>
                <p>{memoryText(line.text, revealed.includes(line.id) ? 'visible' : memory)}</p>
                {memory !== 'visible' && (
                  <button
                    className="text-button"
                    aria-label={`${revealed.includes(line.id) ? 'Ẩn' : 'Hiện'} dòng ${line.id}`}
                    onClick={() =>
                      setRevealed(current =>
                        current.includes(line.id)
                          ? current.filter(id => id !== line.id)
                          : [...current, line.id]
                      )
                    }
                  >
                    {revealed.includes(line.id) ? 'Ẩn' : 'Hiện'}
                  </button>
                )}
              </div>
            ))}
          </div>
          {context.after.length > 0 && (
            <blockquote className="room-context" aria-label="Ngữ cảnh sau">
              {context.after.map(line => (
                <p key={line.id}>
                  <span>{line.id}</span> {line.text}
                </p>
              ))}
            </blockquote>
          )}
          <div className="room-actions">
            <button className="button secondary" disabled={index === 0} onClick={() => step(-1)}>
              Dòng trước
            </button>
            <button
              className="button secondary"
              disabled={index === lines.length - 1}
              onClick={() => step(1)}
            >
              Dòng tiếp
            </button>
          </div>
          <div className="room-secondary">
            <PassageActions passage={getPassage(currentLine.id)} />
          </div>
          <p className="small muted">— Nguyễn Du, Truyện Kiều · Bản văn trong ứng dụng</p>
        </section>

        <section className="room-card" aria-labelledby="speech-heading">
          <h2 id="speech-heading">Nghe và đọc theo</h2>
          <p className="muted small">
            Chỉ phát khi bạn bấm nghe. Giọng tổng hợp của thiết bị không phải bản ngâm thơ; tùy
            giọng, trình duyệt có thể dùng dịch vụ mạng. Chỉ câu thơ được đọc, không gửi cảm nhận
            riêng.
          </p>
          {!speech.supported ? (
            <p>Trình duyệt này chưa hỗ trợ đọc thành tiếng.</p>
          ) : !speech.voices.length ? (
            <p>
              Thiết bị chưa có giọng tiếng Việt. Bạn vẫn có thể đọc và luyện nhớ; hãy cài giọng
              tiếng Việt trong thiết lập thiết bị để nghe.
            </p>
          ) : (
            <>
              <div className="room-inline-form">
                <label>
                  Giọng tiếng Việt
                  <select
                    value={
                      speech.voices.some(item => item.voiceURI === voice)
                        ? voice
                        : speech.voices[0].voiceURI
                    }
                    onChange={event => {
                      stopSpeech()
                      setVoice(event.target.value)
                    }}
                  >
                    {speech.voices.map(item => (
                      <option key={item.voiceURI} value={item.voiceURI}>
                        {item.name}
                        {item.localService ? ' · Trên thiết bị' : ' · Dịch vụ mạng'}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tốc độ đọc
                  <select
                    value={rate}
                    onChange={event => {
                      stopSpeech()
                      setRate(event.target.value)
                    }}
                  >
                    {['0.6', '0.75', '0.9', '1', '1.2'].map(value => (
                      <option value={value} key={value}>
                        {value}×
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="room-actions">
                <button
                  className="button primary"
                  onClick={() => speech.play(lines, index, voice, Number(rate), selectLine)}
                >
                  Nghe từ dòng hiện tại
                </button>
                <button
                  className="button secondary"
                  disabled={speech.status === 'idle'}
                  onClick={speech.togglePause}
                >
                  {speech.status === 'paused' ? 'Tiếp tục nghe' : 'Tạm dừng nghe'}
                </button>
                <button
                  className="button secondary"
                  disabled={speech.status === 'idle'}
                  onClick={stopSpeech}
                >
                  Dừng nghe
                </button>
              </div>
              <p role="status">
                {speech.status === 'playing'
                  ? 'Đang đọc thành tiếng'
                  : speech.status === 'paused'
                    ? 'Đã tạm dừng'
                    : 'Sẵn sàng nghe'}
              </p>
            </>
          )}
          {speech.error && <p role="alert">{speech.error}</p>}
        </section>

        <div className="room-secondary">
          <RecallPanel key={rangeKey(range)} lines={lines} />
          <section className="room-card" aria-labelledby="save-excerpt-heading">
            <h2 id="save-excerpt-heading">Giữ lại đoạn đọc</h2>
            <form
              className="room-inline-form"
              onSubmit={event => {
                event.preventDefault()
                const added = update(current =>
                  addReadingEntry(current, range, title || `Dòng ${range.start}–${range.end}`)
                )
                setMessage(
                  added ? 'Đã thêm đoạn vào sổ đọc.' : 'Đoạn đã có trong sổ hoặc sổ đã đủ 60 đoạn.'
                )
              }}
            >
              <label>
                Tên cho đoạn đọc
                <input
                  maxLength={80}
                  value={title}
                  placeholder={`Dòng ${range.start}–${range.end}`}
                  onChange={event => setTitle(event.target.value)}
                />
              </label>
              <button className="button primary" disabled={!ready || !!entry}>
                {entry ? 'Đã có trong sổ' : 'Thêm vào sổ đọc'}
              </button>
            </form>
            <p role="status">{message}</p>
            <div className="room-actions">
              <button className="button secondary" onClick={() => copyExcerpt(false)}>
                Sao chép đoạn có nguồn
              </button>
              <button className="button secondary" onClick={() => copyExcerpt(true)}>
                Sao chép liên kết đoạn
              </button>
            </div>
          </section>
        </div>
      </div>
      <div
        id="panel-compare"
        role="tabpanel"
        aria-labelledby="tab-compare"
        hidden={tab !== 'compare'}
      >
        <ComparisonPanel lines={lines} />
      </div>
      <div
        id="panel-notebook"
        role="tabpanel"
        aria-labelledby="tab-notebook"
        hidden={tab !== 'notebook'}
      >
        <NotebookPanel
          state={state}
          ready={ready}
          update={update}
          onOpen={entry => {
            openRange(entry, entry.cursor)
            readTab.current?.focus()
          }}
        />
      </div>
    </div>
  )
}
