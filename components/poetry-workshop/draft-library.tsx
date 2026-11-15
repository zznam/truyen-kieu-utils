'use client'

import { useRef, useState } from 'react'
import { normalize } from '@/lib/kieu'
import {
  MAX_WORKSHOP_BACKUP_BYTES,
  mergeWorkshopState,
  parseWorkshopState,
  type WorkshopDraft,
  type WorkshopState,
} from '@/lib/poetry-workshop'

export function downloadWorkshopFile(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function DraftLibrary({
  state,
  ready,
  update,
  onOpen,
  onDelete,
}: {
  state: WorkshopState
  ready: boolean
  update: (recipe: (current: WorkshopState) => WorkshopState) => boolean
  onOpen: (draft: WorkshopDraft) => void
  onDelete: (draft: WorkshopDraft) => void
}) {
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState<WorkshopState | null>(null)
  const [message, setMessage] = useState('')
  const request = useRef(0)
  const visible = state.drafts.filter(draft =>
    normalize(`${draft.title} ${draft.note}`).includes(normalize(query.trim()))
  )
  const additions =
    pending?.drafts.filter(draft => !state.drafts.some(current => current.id === draft.id))
      .length ?? 0
  return (
    <section className="workshop-card" aria-labelledby="draft-library-title">
      <h2 id="draft-library-title">Những bài ghép đã giữ lại</h2>
      <p className="muted">
        Tối đa 20 bản nháp. Chỉ bản đã bấm lưu được giữ qua lần mở sau; bản đang chỉnh sửa vẫn ở
        trên bàn ghép.
      </p>
      <label>
        Tìm bản nháp
        <input value={query} maxLength={100} onChange={event => setQuery(event.target.value)} />
      </label>
      <p role="status">
        {visible.length}/{state.drafts.length} bản nháp
      </p>
      {!visible.length && <p>Chưa có bản nháp phù hợp. Hãy ghép câu và bấm Lưu bản nháp.</p>}
      <ol className="workshop-draft-list">
        {visible.map(draft => (
          <li className="workshop-saved-draft" key={draft.id}>
            <h3>{draft.title}</h3>
            <p className="muted small">
              {draft.stanzas.length} cặp câu · Phiên bản {draft.revision + 1}
            </p>
            <div className="workshop-actions">
              <button className="button secondary" onClick={() => onOpen(draft)}>
                Mở bản nháp
              </button>
              <button className="text-button" onClick={() => onDelete(draft)}>
                Xóa bản nháp
              </button>
            </div>
          </li>
        ))}
      </ol>
      <h3>Sao lưu và mang theo</h3>
      <p className="small muted">
        Bản sao lưu có cả tên bài và cảm nhận riêng. Nhập chỉ thêm bản mới; bản trùng mã giữ nguyên
        nội dung hiện có. Không tác động đến sổ đọc, dấu trang hoặc điểm trò chơi.
      </p>
      <button
        className="button secondary"
        disabled={!ready}
        onClick={() =>
          downloadWorkshopFile(
            JSON.stringify(state, null, 2),
            'xuong-lay-kieu.json',
            'application/json'
          )
        }
      >
        Sao lưu bản nháp
      </button>
      <label>
        Nhập bản sao lưu xưởng (JSON)
        <input
          type="file"
          accept=".json,application/json"
          disabled={!ready}
          onChange={async event => {
            const file = event.target.files?.[0]
            event.target.value = ''
            const token = ++request.current
            setPending(null)
            setMessage('')
            if (!file) return
            if (file.size > MAX_WORKSHOP_BACKUP_BYTES) {
              setMessage('Tệp vượt giới hạn 250 KB. Chưa thay đổi bản nháp nào.')
              return
            }
            try {
              const parsed = parseWorkshopState(JSON.parse(await file.text()))
              if (token !== request.current) return
              if (!parsed) {
                setMessage('Bản sao lưu không hợp lệ. Các bản nháp hiện tại được giữ nguyên.')
                return
              }
              setPending(parsed)
            } catch {
              if (token === request.current)
                setMessage('Không đọc được tệp JSON. Các bản nháp hiện tại được giữ nguyên.')
            }
          }}
        />
      </label>
      {pending && (
        <div className="workshop-import-preview">
          <p>
            <strong>Xem trước:</strong> thêm {additions} bản mới, giữ nguyên{' '}
            {pending.drafts.length - additions} bản trùng mã.
          </p>
          <div className="workshop-actions">
            <button
              className="button primary"
              disabled={!additions}
              onClick={() => {
                let overflow = false
                update(current => {
                  const merged = mergeWorkshopState(current, pending)
                  if (!merged) {
                    overflow = true
                    return current
                  }
                  return merged
                })
                setMessage(
                  overflow
                    ? 'Vượt giới hạn 20 bản nháp. Không nhập một phần.'
                    : 'Đã nhập bản mới; những bản trùng mã vẫn được giữ nguyên.'
                )
                if (!overflow) setPending(null)
              }}
            >
              Nhập bản mới
            </button>
            <button
              className="button secondary"
              onClick={() => {
                request.current++
                setPending(null)
              }}
            >
              Hủy nhập
            </button>
          </div>
        </div>
      )}
      <p role="status">{message}</p>
    </section>
  )
}
