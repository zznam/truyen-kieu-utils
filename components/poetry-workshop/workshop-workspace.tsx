'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLibrary } from '@/components/library-provider'
import { useLocalStore } from '@/hooks/use-local-store'
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
  createWorkshopState,
  decodeWorkshopShare,
  deleteWorkshopDraft,
  encodeWorkshopShare,
  generateWorkshopStanzas,
  MAX_WORKSHOP_STANZAS,
  parseWorkshopState,
  replaceWorkshopStanza,
  saveWorkshopDraft,
  workshopPair,
  workshopText,
  WORKSHOP_KEY,
  type WorkshopDraft,
  type WorkshopOptions,
  type WorkshopStanza,
} from '@/lib/poetry-workshop'
import { DraftLibrary, downloadWorkshopFile } from './draft-library'
import { PoemEditor } from './poem-editor'
import { SourcePicker } from './source-picker'

type Composition = Pick<WorkshopDraft, 'title' | 'note' | 'stanzas'>
type History = { past: Composition[]; present: Composition; future: Composition[] }
type Tab = 'source' | 'poem' | 'drafts'
type Replacement =
  | { kind: 'new' }
  | { kind: 'leave' }
  | { kind: 'load'; draft: WorkshopDraft }
  | { kind: 'share'; stanzas: WorkshopStanza[] }
const tabs: { id: Tab; label: string }[] = [
  { id: 'source', label: 'Ghép câu' },
  { id: 'poem', label: 'Bài ghép' },
  { id: 'drafts', label: 'Bản nháp' },
]

function blankComposition(): Composition {
  return { title: 'Bản ghép của tôi', note: '', stanzas: [] }
}
function snapshot(content: Composition): string {
  return JSON.stringify({ title: content.title, note: content.note, stanzas: content.stanzas })
}
function contentOf(draft: WorkshopDraft): Composition {
  return { title: draft.title, note: draft.note, stanzas: draft.stanzas }
}

export function WorkshopWorkspace() {
  const { library } = useLibrary()
  const { state, ready, storageAvailable, update } = useLocalStore(
    WORKSHOP_KEY,
    createWorkshopState,
    parseWorkshopState
  )
  const params = useSearchParams()
  const router = useRouter()
  const shareValue = params.get('pairs')
  const importedShare = useRef<string | null>(null)
  const [history, setHistory] = useState<History>(() => ({
    past: [],
    present: blankComposition(),
    future: [],
  }))
  const [activeId, setActiveId] = useState('')
  const [revision, setRevision] = useState<number | null>(null)
  const [baseline, setBaseline] = useState(() => snapshot(blankComposition()))
  const [persistedSnapshot, setPersistedSnapshot] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('source')
  const [topic, setTopic] = useState('all')
  const [savedOnly, setSavedOnly] = useState(false)
  const [excludeUsed, setExcludeUsed] = useState(true)
  const [count, setCount] = useState('2')
  const [seed, setSeed] = useState('kieu')
  const [message, setMessage] = useState('')
  const [replacement, setReplacement] = useState<Replacement | null>(null)
  const [deleting, setDeleting] = useState<WorkshopDraft | null>(null)
  const content = history.present
  const dirty = snapshot(content) !== baseline
  const draft: WorkshopDraft = {
    id: activeId || 'working-copy',
    ...content,
    revision: revision ?? 0,
  }
  const options = useMemo<WorkshopOptions>(
    () => ({ topic, savedOnly, savedIds: library.saved, excludeUsed }),
    [topic, savedOnly, library.saved, excludeUsed]
  )
  const persisted = state.drafts.find(item => item.id === activeId)
  const stale = revision !== null && JSON.stringify(persisted) !== persistedSnapshot

  useEffect(() => {
    if (!shareValue || importedShare.current === shareValue) return
    importedShare.current = shareValue
    const stanzas = decodeWorkshopShare(shareValue)
    if (!stanzas) {
      setMessage('Liên kết bài ghép không hợp lệ. Bàn ghép hiện tại được giữ nguyên.')
      return
    }
    // A shared link is a new, unsaved composition; it cannot overwrite browser drafts.
    if (dirty) setReplacement({ kind: 'share', stanzas })
    else {
      setHistory({ past: [], present: { ...blankComposition(), stanzas }, future: [] })
      setActiveId('')
      setRevision(null)
      setPersistedSnapshot(null)
      setBaseline(snapshot(blankComposition()))
      setTab('poem')
      setMessage('Đã mở bài ghép từ liên kết. Tên bài và cảm nhận riêng không có trong liên kết.')
    }
  }, [shareValue, dirty])

  useEffect(() => {
    if (!dirty) return
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [dirty])

  function edit(changes: Partial<Composition>) {
    setHistory(current => {
      const next = { ...current.present, ...changes }
      if (snapshot(next) === snapshot(current.present)) return current
      return { past: [...current.past, current.present].slice(-30), present: next, future: [] }
    })
    setMessage('')
  }

  function resetEditor(
    next: Composition,
    id = '',
    nextRevision: number | null = null,
    savedSnapshot: string | null = null
  ) {
    setHistory({ past: [], present: next, future: [] })
    setActiveId(id)
    setRevision(nextRevision)
    setPersistedSnapshot(savedSnapshot)
    setBaseline(snapshot(next))
    setMessage('')
    setTab('poem')
  }

  function performReplacement(action: Replacement) {
    if (action.kind === 'leave') router.push('/lay-kieu')
    if (action.kind === 'new') resetEditor(blankComposition())
    if (action.kind === 'share') {
      resetEditor({ ...blankComposition(), stanzas: action.stanzas })
      setBaseline(snapshot(blankComposition()))
      setMessage('Đã mở bài ghép từ liên kết. Tên bài và cảm nhận riêng không có trong liên kết.')
    }
    if (action.kind === 'load') {
      const latest = state.drafts.find(item => item.id === action.draft.id)
      if (!latest || JSON.stringify(latest) !== JSON.stringify(action.draft)) {
        setMessage('Bản nháp đã thay đổi. Hãy chọn lại bản mới trong danh sách.')
        return
      }
      resetEditor(contentOf(latest), latest.id, latest.revision, JSON.stringify(latest))
    }
    setReplacement(null)
  }

  function requestReplacement(action: Replacement) {
    if (dirty) setReplacement(action)
    else performReplacement(action)
  }

  function save(copy: boolean) {
    if (!ready) return
    const id = copy || revision === null ? crypto.randomUUID() : activeId
    const candidate = { ...draft, id }
    let saved: WorkshopDraft | undefined
    let conflict = false
    update(current => {
      if (!copy && revision !== null) {
        const latest = current.drafts.find(item => item.id === activeId)
        if (
          !latest ||
          latest.revision !== revision ||
          JSON.stringify(latest) !== persistedSnapshot
        ) {
          conflict = true
          return current
        }
      }
      const next = saveWorkshopDraft(current, candidate, copy ? null : revision)
      if (!next) return current
      saved = next.drafts.find(item => item.id === id)
      return next
    })
    if (!saved) {
      setMessage(
        conflict || stale
          ? 'Bản nháp đã thay đổi hoặc bị xóa ở thẻ khác. Hãy mở lại bản mới, hoặc lưu thành bản sao.'
          : 'Chưa lưu được. Kiểm tra tên bài, giới hạn 20 bản nháp hoặc mở lại bản mới từ thẻ khác.'
      )
      return
    }
    setActiveId(saved.id)
    setRevision(saved.revision)
    const normalized = contentOf(saved)
    setHistory(current => ({ ...current, present: normalized }))
    setPersistedSnapshot(JSON.stringify(saved))
    setBaseline(snapshot(normalized))
    setMessage(copy ? 'Đã lưu một bản sao riêng.' : 'Đã lưu bản nháp.')
  }

  function addPair(sixId: number, eightId: number) {
    if (content.stanzas.length >= MAX_WORKSHOP_STANZAS) {
      setMessage('Mỗi bài ghép có tối đa 16 cặp câu.')
      return
    }
    if (
      excludeUsed &&
      content.stanzas.some(item =>
        [item.sixId, item.eightId].some(id => id === sixId || id === eightId)
      )
    ) {
      setMessage('Dòng nguồn đã có trong bài. Bỏ chọn Không lặp dòng nguồn nếu muốn dùng lại.')
      return
    }
    const pair = workshopPair(sixId, eightId, crypto.randomUUID())
    if (!pair) {
      setMessage('Hai dòng chưa tạo thành cặp sáu/tám cùng vần chữ.')
      return
    }
    edit({ stanzas: [...content.stanzas, pair] })
    setMessage('Đã thêm một cặp vào bài ghép.')
  }

  async function copyText(share: boolean) {
    try {
      const text = share
        ? `${window.location.origin}/lay-kieu/workshop?pairs=${encodeURIComponent(encodeWorkshopShare(content.stanzas))}`
        : workshopText(draft, 'text')
      await navigator.clipboard.writeText(text)
      setMessage(
        share ? 'Đã sao chép liên kết chỉ chứa các câu nguồn.' : 'Đã sao chép bài ghép có nguồn.'
      )
    } catch {
      setMessage('Chưa thể sao chép. Hãy tải bản văn hoặc chọn văn bản trực tiếp.')
    }
  }

  return (
    <div className="shell page-content poetry-workshop">
      <header className="page-heading">
        <div className="eyebrow">CÂU XƯA · BÀN GHÉP MỚI</div>
        <h1>Xưởng Lẩy Kiều</h1>
        <p>Chọn từng câu. Giữ một vần. Ghép nên cách đọc của riêng bạn.</p>
      </header>
      <Link
        className="text-button"
        href="/lay-kieu"
        onNavigate={event => {
          if (dirty) {
            event.preventDefault()
            setReplacement({ kind: 'leave' })
          }
        }}
      >
        ← Về Lẩy Kiều
      </Link>
      {!storageAvailable && ready && (
        <p className="workshop-notice" role="status">
          Trình duyệt chưa cho phép lưu. Bản nháp được giữ trong phiên này; hãy tải bản sao lưu
          trước khi rời trang.
        </p>
      )}
      <section className="workshop-card workshop-draft-heading" aria-label="Bản đang chỉnh sửa">
        <div className="workshop-controls">
          <label>
            Tên bài ghép
            <input
              value={content.title}
              maxLength={80}
              onChange={event => edit({ title: event.target.value })}
            />
          </label>
          <span className="small muted" role="status">
            {dirty
              ? 'Có thay đổi chưa lưu'
              : revision === null
                ? 'Bản mới chưa lưu'
                : 'Đã lưu bản hiện tại'}{' '}
            · {content.stanzas.length}/16 cặp
          </span>
        </div>
        <div className="workshop-actions">
          <button
            className="button primary"
            disabled={!ready || !content.title.trim()}
            onClick={() => save(false)}
          >
            Lưu bản nháp
          </button>
          <button
            className="button secondary"
            disabled={!ready || !content.title.trim()}
            onClick={() => save(true)}
          >
            Lưu thành bản sao
          </button>
          <button className="button secondary" onClick={() => requestReplacement({ kind: 'new' })}>
            Tạo bản mới
          </button>
          <button
            className="button secondary"
            disabled={!history.past.length}
            onClick={() =>
              setHistory(current =>
                current.past.length
                  ? {
                      past: current.past.slice(0, -1),
                      present: current.past.at(-1)!,
                      future: [current.present, ...current.future].slice(0, 30),
                    }
                  : current
              )
            }
          >
            Hoàn tác
          </button>
          <button
            className="button secondary"
            disabled={!history.future.length}
            onClick={() =>
              setHistory(current =>
                current.future.length
                  ? {
                      past: [...current.past, current.present].slice(-30),
                      present: current.future[0],
                      future: current.future.slice(1),
                    }
                  : current
              )
            }
          >
            Làm lại
          </button>
        </div>
        {stale && (
          <p className="workshop-notice">
            Bản đã lưu thay đổi ở thẻ khác. Bản đang chỉnh sửa vẫn được giữ; mở lại bản mới hoặc lưu
            thành bản sao.
          </p>
        )}
        <p role="status" className="workshop-message">
          {message}
        </p>
      </section>
      <div className="workshop-tabs" role="tablist" aria-label="Các bàn trong xưởng">
        {tabs.map((item, index) => (
          <button
            type="button"
            role="tab"
            key={item.id}
            id={`workshop-tab-${item.id}`}
            aria-controls={`workshop-panel-${item.id}`}
            aria-selected={tab === item.id}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={event => {
              let next = index
              if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
              else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length
              else if (event.key === 'Home') next = 0
              else if (event.key === 'End') next = tabs.length - 1
              else return
              event.preventDefault()
              setTab(tabs[next].id)
              document.getElementById(`workshop-tab-${tabs[next].id}`)?.focus()
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        id="workshop-panel-source"
        role="tabpanel"
        aria-labelledby="workshop-tab-source"
        hidden={tab !== 'source'}
      >
        <SourcePicker
          options={options}
          onOptions={changes => {
            if (changes.topic !== undefined) setTopic(changes.topic)
            if (changes.savedOnly !== undefined) setSavedOnly(changes.savedOnly)
          }}
          onAdd={addPair}
        />
        <section className="workshop-card" aria-labelledby="seed-title">
          <h2 id="seed-title">Thử một bản ghép có thể lặp lại</h2>
          <p className="muted small">
            Cùng hạt giống, bộ lọc và cặp đã khóa sẽ cho cùng kết quả. Cặp đã khóa được giữ nguyên
            kể cả khi bạn đổi bộ lọc. Chỉ kiểm tra vần trong từng cặp; hoạt động này không cộng XP.
          </p>
          <form
            className="workshop-controls"
            onSubmit={event => {
              event.preventDefault()
              const stanzas = generateWorkshopStanzas(Number(count), seed, options, content.stanzas)
              if (!stanzas) {
                setMessage(
                  'Không đủ câu phù hợp hoặc số cặp mới sẽ bỏ cặp đã khóa. Hãy mở rộng bộ lọc, giảm số cặp hoặc mở khóa.'
                )
                return
              }
              edit({ stanzas })
              setMessage('Đã ghép theo hạt giống; các cặp khóa được giữ nguyên.')
            }}
          >
            <label>
              Số cặp câu
              <select value={count} onChange={event => setCount(event.target.value)}>
                {[1, 2, 4, 8, 16].map(value => (
                  <option key={value} value={value}>
                    {value} cặp
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hạt giống
              <input
                value={seed}
                maxLength={80}
                required
                onChange={event => setSeed(event.target.value)}
              />
            </label>
            <button className="button primary" disabled={!seed.trim()}>
              Ghép theo hạt giống
            </button>
          </form>
          <label className="workshop-checkbox">
            <input
              type="checkbox"
              checked={excludeUsed}
              onChange={event => setExcludeUsed(event.target.checked)}
            />
            Không lặp dòng nguồn
          </label>
        </section>
      </div>
      <div
        id="workshop-panel-poem"
        role="tabpanel"
        aria-labelledby="workshop-tab-poem"
        hidden={tab !== 'poem'}
      >
        <PoemEditor
          title={content.title}
          stanzas={content.stanzas}
          onChange={stanzas => edit({ stanzas })}
          onReplace={index => {
            const stanzas = replaceWorkshopStanza(content.stanzas, index, seed, options)
            if (!stanzas) {
              setMessage(
                'Chưa có cặp thay thế trong bộ lọc hiện tại. Thử đổi hạt giống hoặc mở rộng nguồn.'
              )
              return
            }
            edit({ stanzas })
          }}
        />
        <section className="workshop-card">
          <label>
            Cảm nhận riêng
            <textarea
              rows={4}
              value={content.note}
              maxLength={2000}
              onChange={event => edit({ note: event.target.value })}
            />
          </label>
          <p className="small muted">
            Cảm nhận chỉ nằm trong bản nháp và tệp bạn xuất. Liên kết chia sẻ chỉ chứa các câu
            nguồn, không có tên bài hoặc cảm nhận riêng.
          </p>
          <div className="workshop-actions">
            <button
              className="button secondary"
              disabled={!content.stanzas.length}
              onClick={() => copyText(false)}
            >
              Sao chép bài có nguồn
            </button>
            <button
              className="button secondary"
              disabled={!content.stanzas.length}
              onClick={() =>
                downloadWorkshopFile(
                  workshopText(draft, 'text'),
                  'bai-lay-kieu.txt',
                  'text/plain;charset=utf-8'
                )
              }
            >
              Tải bản văn
            </button>
            <button
              className="button secondary"
              disabled={!content.stanzas.length}
              onClick={() =>
                downloadWorkshopFile(
                  workshopText(draft, 'markdown'),
                  'bai-lay-kieu.md',
                  'text/markdown;charset=utf-8'
                )
              }
            >
              Tải Markdown
            </button>
            <button
              className="button secondary"
              disabled={!content.stanzas.length}
              onClick={() => copyText(true)}
            >
              Sao chép liên kết bài ghép
            </button>
          </div>
        </section>
      </div>
      <div
        id="workshop-panel-drafts"
        role="tabpanel"
        aria-labelledby="workshop-tab-drafts"
        hidden={tab !== 'drafts'}
      >
        <DraftLibrary
          state={state}
          ready={ready}
          update={update}
          onOpen={item => requestReplacement({ kind: 'load', draft: item })}
          onDelete={setDeleting}
        />
      </div>
      <AlertDialog
        open={replacement !== null}
        onOpenChange={open => {
          if (!open) setReplacement(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {replacement?.kind === 'share'
                ? 'Mở bài ghép từ liên kết?'
                : 'Thay bản đang chỉnh sửa?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dirty
                ? 'Thay đổi chưa lưu sẽ bị bỏ. Các bản nháp đã lưu vẫn được giữ nguyên.'
                : 'Bài ghép sẽ mở trên bàn của bạn dưới dạng bản mới. Các bản đã lưu vẫn được giữ nguyên.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ bản đang sửa</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (replacement) performReplacement(replacement)
              }}
            >
              {replacement?.kind === 'leave'
                ? 'Bỏ thay đổi và rời'
                : dirty
                  ? 'Bỏ thay đổi và mở'
                  : 'Mở bài ghép'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={deleting !== null}
        onOpenChange={open => {
          if (!open) setDeleting(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bản nháp đã lưu?</AlertDialogTitle>
            <AlertDialogDescription>
              Chỉ bản nháp này bị xóa khỏi xưởng. Câu nguồn, dấu trang, sổ đọc và điểm trò chơi vẫn
              giữ nguyên.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ bản nháp</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return
                let removed = false
                update(current => {
                  const latest = current.drafts.find(item => item.id === deleting.id)
                  if (JSON.stringify(latest) !== JSON.stringify(deleting)) return current
                  const next = deleteWorkshopDraft(current, deleting.id, deleting.revision)
                  removed = next !== current
                  return next
                })
                if (removed && activeId === deleting.id) {
                  setActiveId('')
                  setRevision(null)
                  setPersistedSnapshot(null)
                  setBaseline(snapshot(blankComposition()))
                }
                setMessage(
                  removed
                    ? 'Đã xóa bản nháp đã chọn.'
                    : 'Bản nháp đã thay đổi ở thẻ khác. Hãy kiểm tra lại trước khi xóa.'
                )
                setDeleting(null)
              }}
            >
              Xóa bản đã chọn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
