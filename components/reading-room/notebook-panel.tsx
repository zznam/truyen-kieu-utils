'use client'

import { useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  editReadingEntry,
  MAX_READING_BACKUP_BYTES,
  mergeReadingRoom,
  moveReadingEntry,
  parseReadingRoom,
  rangeKey,
  readingEntryMatches,
  readingRoomText,
  type ReadingEntry,
  type ReadingRoomState,
} from '@/lib/reading-room'

type UpdateNotebook = (recipe: (current: ReadingRoomState) => ReadingRoomState) => boolean

function downloadNotebook(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function EntryEditor({ entry, update }: { entry: ReadingEntry; update: UpdateNotebook }) {
  const [title, setTitle] = useState(entry.title)
  const [note, setNote] = useState(entry.note)
  const [baseline, setBaseline] = useState({ title: entry.title, note: entry.note })
  const [message, setMessage] = useState('')
  const changedElsewhere = baseline.note !== entry.note || baseline.title !== entry.title
  return (
    <details className="room-note-editor">
      <summary>Ghi cảm nhận / đổi tên</summary>
      <form
        onSubmit={event => {
          event.preventDefault()
          let conflict = false
          update(current => {
            const latest = current.entries.find(item => rangeKey(item) === rangeKey(entry))
            if (!latest || latest.note !== baseline.note || latest.title !== baseline.title) {
              conflict = true
              return current
            }
            return editReadingEntry(current, entry, { title: title.trim(), note })
          })
          if (conflict) setMessage('Ghi chép đã đổi ở thẻ khác. Hãy nạp bản mới trước khi lưu.')
          else {
            setBaseline({ title: title.trim(), note })
            setMessage('Đã lưu ghi chép.')
          }
        }}
      >
        <label>
          Tên đoạn đọc
          <input
            value={title}
            required
            maxLength={80}
            onChange={event => setTitle(event.target.value)}
          />
        </label>
        <label>
          Cảm nhận riêng
          <textarea
            rows={4}
            value={note}
            maxLength={2000}
            onChange={event => setNote(event.target.value)}
          />
        </label>
        <button className="button secondary" disabled={!title.trim()}>
          Lưu ghi chép
        </button>
        {changedElsewhere && (
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setNote(entry.note)
              setTitle(entry.title)
              setBaseline({ title: entry.title, note: entry.note })
              setMessage('Đã nạp bản mới.')
            }}
          >
            Nạp ghi chép mới
          </button>
        )}
        <p role="status">
          {message || (changedElsewhere ? 'Ghi chép này đã thay đổi ở thẻ khác.' : '')}
        </p>
      </form>
    </details>
  )
}

export function NotebookPanel({
  state,
  ready,
  update,
  onOpen,
}: {
  state: ReadingRoomState
  ready: boolean
  update: UpdateNotebook
  onOpen: (entry: ReadingEntry) => void
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [pending, setPending] = useState<ReadingRoomState | null>(null)
  const [message, setMessage] = useState('')
  const [deleting, setDeleting] = useState<ReadingEntry | null>(null)
  const fileRequest = useRef(0)
  const filtered = state.entries.filter(
    entry => (status === 'all' || status === entry.status) && readingEntryMatches(entry, query)
  )
  const additions =
    pending?.entries.filter(
      entry => !state.entries.some(existing => rangeKey(existing) === rangeKey(entry))
    ).length ?? 0
  const labels = { queued: 'Chờ đọc', reading: 'Đang đọc', done: 'Đã đọc' }
  return (
    <section className="room-card" aria-labelledby="notebook-heading">
      <h2 id="notebook-heading">Sổ đọc của bạn</h2>
      <p className="muted">
        Tối đa 60 đoạn, giữ thứ tự và dòng đang đọc. Cảm nhận riêng chỉ nằm trong trình duyệt này.
      </p>
      <label htmlFor="notebook-query">Tìm ghi chép hoặc số dòng</label>
      <input
        id="notebook-query"
        maxLength={100}
        value={query}
        onChange={event => setQuery(event.target.value)}
      />
      <label htmlFor="notebook-status">Trạng thái đọc</label>
      <select id="notebook-status" value={status} onChange={event => setStatus(event.target.value)}>
        <option value="all">Tất cả</option>
        <option value="queued">Chờ đọc</option>
        <option value="reading">Đang đọc</option>
        <option value="done">Đã đọc</option>
      </select>
      <p role="status">
        {filtered.length}/{state.entries.length} đoạn ·{' '}
        {state.entries.filter(entry => entry.status === 'done').length} đã đọc
      </p>
      {!state.entries.length && <p>Chọn một đoạn trong thẻ Đọc & nhớ, rồi thêm vào sổ.</p>}
      {state.entries.length > 0 && !filtered.length && <p>Chưa có ghi chép khớp bộ lọc.</p>}
      <ol className="room-notebook">
        {filtered.map(entry => {
          const index = state.entries.indexOf(entry)
          return (
            <li className="room-notebook-entry" key={rangeKey(entry)}>
              <h3>{entry.title}</h3>
              <p>
                Dòng {entry.start}–{entry.end} · {labels[entry.status]} · Vị trí: {entry.cursor}
              </p>
              <div className="room-actions">
                <button className="button primary" onClick={() => onOpen(entry)}>
                  Tiếp tục đoạn này
                </button>
                <button
                  className="button secondary"
                  onClick={() =>
                    update(current =>
                      editReadingEntry(current, entry, {
                        status: entry.status === 'done' ? 'queued' : 'done',
                      })
                    )
                  }
                >
                  {entry.status === 'done' ? 'Đọc lại' : 'Đánh dấu đã đọc'}
                </button>
                <button
                  className="button secondary"
                  aria-label={`Đưa ${entry.title} lên`}
                  disabled={index === 0}
                  onClick={() => update(current => moveReadingEntry(current, entry, -1))}
                >
                  ↑
                </button>
                <button
                  className="button secondary"
                  aria-label={`Đưa ${entry.title} xuống`}
                  disabled={index === state.entries.length - 1}
                  onClick={() => update(current => moveReadingEntry(current, entry, 1))}
                >
                  ↓
                </button>
                <button className="text-button" onClick={() => setDeleting(entry)}>
                  Xóa đoạn
                </button>
              </div>
              <EntryEditor entry={entry} update={update} />
            </li>
          )
        })}
      </ol>
      <h3>Mang sổ đọc theo bạn</h3>
      <p className="muted small">
        Tệp xuất có cả cảm nhận riêng. Chỉ chia sẻ khi bạn muốn. Bản sao lưu này chỉ chứa sổ đọc,
        không chứa dấu trang hay điểm trò chơi.
      </p>
      <div className="room-actions">
        <button
          className="button secondary"
          disabled={!ready || !state.entries.length}
          onClick={() =>
            downloadNotebook(readingRoomText(state), 'so-doc-kieu.txt', 'text/plain;charset=utf-8')
          }
        >
          Xuất sổ đọc có nguồn
        </button>
        <button
          className="button secondary"
          disabled={!ready}
          onClick={() =>
            downloadNotebook(JSON.stringify(state, null, 2), 'so-doc-kieu.json', 'application/json')
          }
        >
          Sao lưu sổ đọc
        </button>
      </div>
      <label htmlFor="notebook-import">Nhập bản sao lưu (JSON, tối đa 500 KB)</label>
      <input
        id="notebook-import"
        type="file"
        accept=".json,application/json"
        disabled={!ready}
        onChange={async event => {
          const file = event.target.files?.[0]
          event.target.value = ''
          const request = ++fileRequest.current
          setPending(null)
          setMessage('')
          if (!file) return
          if (file.size > MAX_READING_BACKUP_BYTES) {
            setMessage('Tệp quá lớn. Giới hạn là 500 KB.')
            return
          }
          try {
            const parsed = parseReadingRoom(JSON.parse(await file.text()))
            if (request !== fileRequest.current) return
            if (!parsed) {
              setMessage('Bản sao lưu không hợp lệ. Sổ hiện tại vẫn được giữ nguyên.')
              return
            }
            setPending(parsed)
          } catch {
            if (request === fileRequest.current)
              setMessage('Không đọc được tệp JSON. Sổ hiện tại vẫn được giữ nguyên.')
          }
        }}
      />
      {pending && (
        <div className="room-import-preview">
          <p>
            <strong>Xem trước:</strong> thêm {additions} đoạn; giữ nguyên{' '}
            {pending.entries.length - additions} đoạn trùng, kể cả cảm nhận và vị trí hiện có.
          </p>
          <div className="room-actions">
            <button
              className="button primary"
              disabled={!additions}
              onClick={() => {
                let overflow = false
                update(current => {
                  const merged = mergeReadingRoom(current, pending)
                  if (!merged) {
                    overflow = true
                    return current
                  }
                  return merged
                })
                setMessage(
                  overflow
                    ? 'Vượt giới hạn 60 đoạn. Không có dữ liệu nào bị thay đổi.'
                    : 'Đã nhập các đoạn mới và giữ nguyên ghi chép hiện có.'
                )
                if (!overflow) setPending(null)
              }}
            >
              Nhập các đoạn mới
            </button>
            <button
              className="button secondary"
              onClick={() => {
                fileRequest.current++
                setPending(null)
              }}
            >
              Hủy nhập
            </button>
          </div>
        </div>
      )}
      <p role="status">{message}</p>
      <AlertDialog
        open={deleting !== null}
        onOpenChange={open => {
          if (!open) setDeleting(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa đoạn khỏi sổ đọc?</AlertDialogTitle>
            <AlertDialogDescription>
              Cảm nhận và vị trí của đoạn này sẽ bị xóa. Bản văn, dấu trang và điểm trò chơi vẫn
              được giữ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ lại</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return
                update(current => {
                  const latest = current.entries.find(
                    entry => rangeKey(entry) === rangeKey(deleting)
                  )
                  if (JSON.stringify(latest) !== JSON.stringify(deleting)) {
                    setMessage('Đoạn đã thay đổi ở thẻ khác. Hãy kiểm tra lại trước khi xóa.')
                    return current
                  }
                  return {
                    ...current,
                    entries: current.entries.filter(
                      entry => rangeKey(entry) !== rangeKey(deleting)
                    ),
                  }
                })
                setDeleting(null)
              }}
            >
              Xóa khỏi sổ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
