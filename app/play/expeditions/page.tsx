'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowUpRight, Flag, Map, Pin, ScrollText } from 'lucide-react'
import { useGamification } from '@/components/gamification-provider'
import { useLocalStore } from '@/hooks/use-local-store'
import {
  EXPEDITIONS_STORAGE_KEY,
  EXPEDITION_LIMIT,
  EXPEDITION_METRICS,
  archiveExpedition,
  claimExpeditionCheckpoint,
  currentAttempt,
  deleteExpedition,
  emptyExpeditions,
  expeditionDeadline,
  expeditionRecommendation,
  expeditionTemplates,
  expeditionTotals,
  metricDetails,
  parseExpeditions,
  pinExpedition,
  routeAvailability,
  saveExpeditionRoute,
  setExpeditionDeadline,
  stageProgress,
  startExpedition,
  type ExpeditionMetric,
  type ExpeditionRoute,
  type ExpeditionsState,
} from '@/lib/expeditions'
import './expeditions.css'

const dateLabel = (value: string) => value.split('-').reverse().join('/')
const routeStatus = {
  draft: 'Chưa khởi hành',
  active: 'Đang bước tiếp',
  completed: 'Đã hoàn thành',
  archived: 'Đã cất kỷ niệm',
}
const blankRoute = (): ExpeditionRoute => ({
  id: crypto.randomUUID(),
  templateId: null,
  name: '',
  stages: [{ id: crypto.randomUUID(), metric: 'read', target: 4 }],
  deadline: null,
  status: 'draft',
  attempts: [],
})

export default function ExpeditionsPage() {
  const game = useGamification()
  const store = useLocalStore<ExpeditionsState>(
    EXPEDITIONS_STORAGE_KEY,
    emptyExpeditions,
    parseExpeditions
  )
  const [draft, setDraft] = useState<ExpeditionRoute | null>(null)
  const [notice, setNotice] = useState('')
  const [showArchive, setShowArchive] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const cancelDelete = useRef<HTMLButtonElement>(null)
  const ready = game.ready && store.ready
  const totals = expeditionTotals(game.state)
  const active = store.state.routes.find(route => route.status === 'active')
  const pinned = store.state.routes.find(route => route.id === store.state.pinnedId)
  const routes = store.state.routes
    .filter(route => (showArchive ? route.status === 'archived' : route.status !== 'archived'))
    .toSorted(
      (a, b) =>
        Number(b.status === 'active') - Number(a.status === 'active') ||
        Number(b.id === store.state.pinnedId) - Number(a.id === store.state.pinnedId)
    )
  const archiveCount = store.state.routes.filter(route => route.status === 'archived').length
  const draftId = draft?.id
  useEffect(() => {
    if (draftId) nameInput.current?.focus()
  }, [draftId])
  useEffect(() => {
    if (deleteId) cancelDelete.current?.focus()
  }, [deleteId])

  function act(recipe: (previous: ExpeditionsState) => ExpeditionsState, success: string) {
    const changed = store.update(recipe)
    setNotice(changed ? success : 'Chưa thể thực hiện. Hãy kiểm tra điều kiện của lộ trình.')
    return changed
  }
  function chooseTemplate(template: (typeof expeditionTemplates)[number]) {
    const route: ExpeditionRoute = {
      id: crypto.randomUUID(),
      templateId: template.id,
      name: template.name,
      stages: template.stages.map(stage => ({ ...stage })),
      deadline: null,
      status: 'draft',
      attempts: [],
    }
    if (
      act(
        previous => saveExpeditionRoute(previous, route),
        'Đã thêm lộ trình. Bạn có thể chọn ngày hẹn rồi khởi hành.'
      )
    ) {
      setShowArchive(false)
      requestAnimationFrame(() => document.getElementById(`route-${route.id}`)?.focus())
    }
  }
  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return
    if (act(previous => saveExpeditionRoute(previous, draft), 'Đã giữ mục tiêu riêng của bạn.')) {
      setDraft(null)
      setShowArchive(false)
    }
  }
  function updateStage(index: number, change: Partial<ExpeditionRoute['stages'][number]>) {
    setDraft(
      previous =>
        previous && {
          ...previous,
          stages: previous.stages.map((stage, at) =>
            at === index ? { ...stage, ...change } : stage
          ),
        }
    )
  }
  return (
    <div className="shell page-content expedition-page">
      <Link className="text-link" href="/play/adventure">
        <ArrowLeft size={16} /> Vườn tri âm
      </Link>
      <header className="expedition-heading">
        <div>
          <div className="eyebrow">MỖI CHẶNG ĐƯỜNG · MỘT LỜI HẸN</div>
          <h1>Lộ trình tri âm.</h1>
          <p>Chọn một đích nhỏ, bước qua từng chặng bằng những hoạt động thật của bạn cùng Kiều.</p>
        </div>
        <Map className="expedition-map-icon" size={64} strokeWidth={1} aria-hidden="true" />
      </header>
      <p className="expedition-note">
        Đây là mục tiêu cá nhân. Hoạt động vẫn nhận XP Hành trình như thường lệ; xác nhận chặng
        không tặng thêm XP. Chỉ hoạt động sau lúc khởi hành hoặc xác nhận chặng trước mới được tính.
      </p>
      {(!store.storageAvailable || !game.storageAvailable) && (
        <p className="expedition-warning" role="status">
          Trình duyệt chưa lưu được đầy đủ tiến độ. Bạn có thể tiếp tục trong phiên này; dữ liệu có
          thể mất khi đóng trang.
        </p>
      )}
      <p className="expedition-notice" role="status" aria-live="polite">
        {notice}
      </p>
      {!ready ? (
        <p role="status">Đang mở bản đồ lộ trình…</p>
      ) : (
        <>
          {active && (
            <aside className="expedition-resume">
              <Flag size={22} aria-hidden="true" />
              <div>
                <strong>Bạn đang đi: {active.name}</strong>
                <p>
                  Tiến độ được giữ khi bạn rời trang. Chỉ một lộ trình khởi hành tại một thời điểm.
                </p>
              </div>
              <a href={`#route-${active.id}`} onClick={() => setShowArchive(false)}>
                Tiếp tục lộ trình <ArrowUpRight size={16} />
              </a>
            </aside>
          )}
          {pinned && (
            <p className="expedition-pinned">
              <Pin size={15} aria-hidden="true" /> Đang ghim: <strong>{pinned.name}</strong>
            </p>
          )}
          <section aria-labelledby="expedition-templates">
            <div className="expedition-section-heading">
              <div>
                <div className="eyebrow">BA GỢI Ý KHỞI HÀNH</div>
                <h2 id="expedition-templates">Chọn một lối đi.</h2>
              </div>
              <button
                className="expedition-button"
                onClick={() => setDraft(blankRoute())}
                disabled={store.state.routes.length >= EXPEDITION_LIMIT}
              >
                Tạo lộ trình riêng
              </button>
            </div>
            <div className="expedition-template-grid">
              {expeditionTemplates.map(template => (
                <article className="expedition-template" key={template.id}>
                  <span>{template.stages.length} chặng nối tiếp</span>
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                  <ol>
                    {template.stages.map(stage => (
                      <li key={stage.id}>
                        {metricDetails[stage.metric].label} · {stage.target}{' '}
                        {metricDetails[stage.metric].unit}
                      </li>
                    ))}
                  </ol>
                  <button
                    className="expedition-button secondary"
                    onClick={() => chooseTemplate(template)}
                    disabled={store.state.routes.length >= EXPEDITION_LIMIT}
                  >
                    Chọn lộ trình này
                  </button>
                </article>
              ))}
            </div>
            {store.state.routes.length >= EXPEDITION_LIMIT && (
              <p className="expedition-note">
                Sổ đã có {EXPEDITION_LIMIT} lộ trình. Xóa một mục tiêu riêng chưa khởi hành để có
                thêm chỗ.
              </p>
            )}
          </section>
          {draft && (
            <section className="expedition-editor" aria-labelledby="expedition-editor-title">
              <h2 id="expedition-editor-title">
                {store.state.routes.some(route => route.id === draft.id)
                  ? 'Sửa lời hẹn chưa khởi hành'
                  : 'Viết lời hẹn của riêng bạn'}
              </h2>
              <form onSubmit={saveDraft}>
                <label htmlFor="route-name">
                  Tên mục tiêu
                  <input
                    ref={nameInput}
                    id="route-name"
                    required
                    maxLength={80}
                    value={draft.name}
                    onChange={event => setDraft({ ...draft, name: event.target.value })}
                    placeholder="Ví dụ: Mỗi ngày một trang thơ"
                  />
                </label>
                <label htmlFor="route-deadline">
                  Ngày hẹn hoàn thành (không bắt buộc)
                  <input
                    id="route-deadline"
                    type="date"
                    value={draft.deadline ?? ''}
                    onChange={event => setDraft({ ...draft, deadline: event.target.value || null })}
                  />
                </label>
                <p className="expedition-note">
                  Chặng sau chỉ bắt đầu tính khi bạn xác nhận chặng trước. Có thể thêm tối đa 6
                  chặng; ngày hẹn không làm mất tiến độ.
                </p>
                {draft.stages.map((stage, index) => (
                  <fieldset key={stage.id} className="expedition-stage-editor">
                    <legend>Chặng {index + 1}</legend>
                    <label htmlFor={`metric-${stage.id}`}>
                      Hoạt động
                      <select
                        id={`metric-${stage.id}`}
                        value={stage.metric}
                        onChange={event => {
                          const metric = event.target.value as ExpeditionMetric
                          updateStage(index, {
                            metric,
                            target: Math.min(stage.target, metricDetails[metric].limit),
                          })
                        }}
                      >
                        {EXPEDITION_METRICS.map(metric => (
                          <option key={metric} value={metric}>
                            {metricDetails[metric].label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label htmlFor={`target-${stage.id}`}>
                      Mục tiêu ({metricDetails[stage.metric].unit})
                      <input
                        id={`target-${stage.id}`}
                        type="number"
                        required
                        min={1}
                        max={metricDetails[stage.metric].limit}
                        step={1}
                        value={Number.isFinite(stage.target) ? stage.target : ''}
                        onChange={event =>
                          updateStage(index, { target: event.target.valueAsNumber })
                        }
                      />
                    </label>
                    <p>{metricDetails[stage.metric].note}</p>
                    {draft.stages.length > 1 && (
                      <button
                        type="button"
                        className="expedition-text-button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            stages: draft.stages.filter((_, at) => at !== index),
                          })
                        }
                      >
                        Bỏ chặng {index + 1}
                      </button>
                    )}
                  </fieldset>
                ))}
                <div className="expedition-actions">
                  <button
                    type="button"
                    className="expedition-button secondary"
                    disabled={draft.stages.length >= 6}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        stages: [
                          ...draft.stages,
                          { id: crypto.randomUUID(), metric: 'correct', target: 3 },
                        ],
                      })
                    }
                  >
                    Thêm chặng
                  </button>
                  <button className="expedition-button" type="submit">
                    Lưu lộ trình riêng
                  </button>
                  <button
                    type="button"
                    className="expedition-text-button"
                    onClick={() => setDraft(null)}
                  >
                    Hủy chỉnh sửa
                  </button>
                </div>
              </form>
            </section>
          )}
          <section aria-labelledby="expedition-my-routes">
            <div className="expedition-section-heading">
              <h2 id="expedition-my-routes">Sổ lộ trình của bạn</h2>
              <div className="expedition-filters" aria-label="Lọc lộ trình">
                <button aria-pressed={!showArchive} onClick={() => setShowArchive(false)}>
                  Đang giữ ({store.state.routes.length - archiveCount})
                </button>
                <button aria-pressed={showArchive} onClick={() => setShowArchive(true)}>
                  Kỷ niệm đã cất ({archiveCount})
                </button>
              </div>
            </div>
            {!routes.length && (
              <div className="expedition-empty">
                <ScrollText size={30} aria-hidden="true" />
                <p>
                  {showArchive
                    ? 'Những lộ trình hoàn thành được cất sẽ hiện ở đây.'
                    : 'Sổ còn để ngỏ. Chọn một gợi ý hoặc viết mục tiêu riêng để bắt đầu.'}
                </p>
              </div>
            )}
            <div className="expedition-route-list">
              {routes.map(route => {
                const attempt = currentAttempt(route)
                const progress = stageProgress(route, totals)
                const deadline = expeditionDeadline(route.deadline, game.today)
                const unavailable = routeAvailability(route, totals)
                const recommendation =
                  progress && expeditionRecommendation(progress.stage.metric, game.state)
                return (
                  <article
                    className="expedition-route"
                    key={route.id}
                    id={`route-${route.id}`}
                    tabIndex={-1}
                    aria-labelledby={`name-${route.id}`}
                    data-active={route.status === 'active'}
                  >
                    <div className="expedition-route-heading">
                      <div>
                        <span className="expedition-kicker">
                          {routeStatus[route.status]} ·{' '}
                          {route.templateId ? 'Lộ trình gợi ý' : 'Mục tiêu riêng'}
                        </span>
                        <h3 id={`name-${route.id}`}>{route.name}</h3>
                      </div>
                      <button
                        className="expedition-text-button"
                        aria-pressed={store.state.pinnedId === route.id}
                        onClick={() =>
                          act(
                            previous =>
                              pinExpedition(
                                previous,
                                previous.pinnedId === route.id ? null : route.id
                              ),
                            store.state.pinnedId === route.id
                              ? 'Đã bỏ ghim lộ trình.'
                              : 'Đã ghim lộ trình.'
                          )
                        }
                      >
                        <Pin size={15} aria-hidden="true" />
                        {store.state.pinnedId === route.id ? 'Bỏ ghim' : 'Ghim lộ trình'}
                      </button>
                    </div>
                    {route.status === 'draft' && (
                      <label
                        className="expedition-inline-deadline"
                        htmlFor={`deadline-${route.id}`}
                      >
                        Ngày hẹn hoàn thành
                        <input
                          id={`deadline-${route.id}`}
                          type="date"
                          value={route.deadline ?? ''}
                          onChange={event =>
                            act(
                              previous =>
                                setExpeditionDeadline(
                                  previous,
                                  route.id,
                                  event.target.value || null
                                ),
                              'Đã giữ ngày hẹn của bạn.'
                            )
                          }
                        />
                      </label>
                    )}
                    {deadline && (
                      <p className="expedition-deadline">
                        <time dateTime={route.deadline!}>{dateLabel(route.deadline!)}</time> ·{' '}
                        {route.status === 'completed' || route.status === 'archived'
                          ? 'Ngày hẹn của lộ trình'
                          : deadline.text}
                      </p>
                    )}
                    <ol className="expedition-stages">
                      {route.stages.map((stage, index) => {
                        const checkpoint = attempt?.checkpoints[index]
                        const isCurrent = progress?.stage.id === stage.id
                        return (
                          <li
                            key={stage.id}
                            data-checkpoint={Boolean(checkpoint)}
                            aria-current={isCurrent ? 'step' : undefined}
                          >
                            <span className="expedition-step-number" aria-hidden="true">
                              {checkpoint ? '✓' : index + 1}
                            </span>
                            <div>
                              <strong>{metricDetails[stage.metric].label}</strong>
                              <span>
                                {stage.target} {metricDetails[stage.metric].unit}
                                {checkpoint && (
                                  <>
                                    {' '}
                                    · xác nhận{' '}
                                    <time dateTime={checkpoint.claimedAt}>
                                      {dateLabel(checkpoint.claimedAt)}
                                    </time>
                                  </>
                                )}
                                {!checkpoint &&
                                  !isCurrent &&
                                  route.status === 'active' &&
                                  ' · chờ chặng trước'}
                              </span>
                              {isCurrent && (
                                <>
                                  <label
                                    className="expedition-progress-label"
                                    htmlFor={`progress-${route.id}`}
                                  >
                                    {Math.min(progress.value, stage.target)} / {stage.target}{' '}
                                    {metricDetails[stage.metric].unit} từ đầu chặng
                                  </label>
                                  <progress
                                    id={`progress-${route.id}`}
                                    value={Math.min(progress.value, stage.target)}
                                    max={stage.target}
                                  />
                                  <p className="expedition-note">
                                    {metricDetails[stage.metric].note}
                                  </p>
                                </>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                    {route.status === 'draft' && (
                      <>
                        {unavailable && <p className="expedition-warning">{unavailable}</p>}
                        <div className="expedition-actions">
                          <button
                            className="expedition-button"
                            disabled={Boolean(active || unavailable)}
                            onClick={() =>
                              act(
                                previous =>
                                  startExpedition(
                                    previous,
                                    route.id,
                                    expeditionTotals(game.state),
                                    game.today
                                  ),
                                'Đã khởi hành. Hoạt động mới từ bây giờ sẽ được tính cho chặng đầu.'
                              )
                            }
                          >
                            Khởi hành lộ trình
                          </button>
                          {!route.templateId && (
                            <>
                              <button
                                className="expedition-text-button"
                                onClick={() =>
                                  setDraft({
                                    ...route,
                                    stages: route.stages.map(stage => ({ ...stage })),
                                  })
                                }
                              >
                                Sửa mục tiêu riêng
                              </button>
                              <button
                                className="expedition-text-button"
                                onClick={() => setDeleteId(route.id)}
                              >
                                Xóa mục tiêu riêng
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                    {progress && recommendation && (
                      <div className="expedition-next">
                        <div>
                          <span className="expedition-kicker">BƯỚC TIẾP THEO</span>
                          <p>
                            {progress.reached
                              ? 'Bạn đã đủ hoạt động. Xác nhận để mở chặng tiếp theo.'
                              : 'Hoạt động sau khi mở chặng sẽ được tự đối chiếu tại đây.'}
                          </p>
                          <Link className="text-link" href={recommendation.href}>
                            {recommendation.label}
                            <ArrowUpRight size={16} />
                          </Link>
                        </div>
                        <button
                          className="expedition-button"
                          disabled={!progress.reached}
                          onClick={() =>
                            act(
                              previous =>
                                claimExpeditionCheckpoint(
                                  previous,
                                  route.id,
                                  expeditionTotals(game.state),
                                  game.today
                                ),
                              attempt!.checkpoints.length + 1 === route.stages.length
                                ? 'Bạn đã hoàn thành lời hẹn. Chứng nhận của bạn đã mở!'
                                : 'Đã xác nhận chặng. Chặng mới bắt đầu tính từ bây giờ.'
                            )
                          }
                        >
                          Xác nhận chặng {attempt!.checkpoints.length + 1}
                        </button>
                      </div>
                    )}
                    {attempt?.completedAt && (
                      <div
                        className="expedition-certificate"
                        aria-label={`Chứng nhận ${route.name}`}
                      >
                        <div className="eyebrow">CHỨNG NHẬN LỜI HẸN TRI ÂM</div>
                        <h4>{route.name}</h4>
                        <p>
                          {game.state.profile.name || 'Bạn đọc'} đã bước qua {route.stages.length}{' '}
                          chặng bằng hoạt động được Hành trình ghi nhận.
                        </p>
                        <p>
                          <time dateTime={attempt.startedAt}>{dateLabel(attempt.startedAt)}</time> —{' '}
                          <time dateTime={attempt.completedAt}>
                            {dateLabel(attempt.completedAt)}
                          </time>
                        </p>
                        <span>Hoàn thành lần {route.attempts.length} · Một lời hẹn đã thành</span>
                      </div>
                    )}
                    {(route.status === 'completed' || route.status === 'archived') && (
                      <>
                        <div className="expedition-actions">
                          <button
                            className="expedition-button secondary"
                            disabled={Boolean(active || unavailable || route.attempts.length >= 20)}
                            onClick={() => {
                              if (
                                act(
                                  previous =>
                                    startExpedition(
                                      previous,
                                      route.id,
                                      expeditionTotals(game.state),
                                      game.today
                                    ),
                                  'Đã mở lần đi mới từ tiến độ hiện tại; các lần đi cũ vẫn được giữ.'
                                )
                              )
                                setShowArchive(false)
                            }}
                          >
                            Đi lại từ đầu
                          </button>
                          {route.status === 'completed' && (
                            <button
                              className="expedition-text-button"
                              onClick={() =>
                                act(
                                  previous => archiveExpedition(previous, route.id),
                                  'Đã cất lộ trình vào góc kỷ niệm.'
                                )
                              }
                            >
                              Cất lộ trình đã hoàn thành
                            </button>
                          )}
                        </div>
                        {unavailable && (
                          <p className="expedition-note">Chưa thể đi lại: {unavailable}</p>
                        )}
                        {route.attempts.length >= 20 && (
                          <p className="expedition-note">
                            Sổ đã giữ đủ 20 lần đi của lộ trình này.
                          </p>
                        )}
                      </>
                    )}
                    {route.attempts.length > 0 && (
                      <details className="expedition-history">
                        <summary>Lịch sử lộ trình ({route.attempts.length} lần đi)</summary>
                        {route.attempts.map((run, index) => (
                          <div key={`${run.startedAt}-${index}`}>
                            <h4>
                              Lần {index + 1} · khởi hành {dateLabel(run.startedAt)}
                            </h4>
                            {run.checkpoints.length ? (
                              <ol>
                                {run.checkpoints.map((checkpoint, at) => (
                                  <li key={checkpoint.stageId}>
                                    Chặng {at + 1}: {metricDetails[route.stages[at].metric].label} ·{' '}
                                    {checkpoint.evidence}{' '}
                                    {metricDetails[route.stages[at].metric].unit} ·{' '}
                                    <time dateTime={checkpoint.claimedAt}>
                                      {dateLabel(checkpoint.claimedAt)}
                                    </time>
                                  </li>
                                ))}
                              </ol>
                            ) : (
                              <p>Chưa xác nhận chặng nào.</p>
                            )}
                            <p>
                              {run.completedAt
                                ? `Hoàn thành ${dateLabel(run.completedAt)}`
                                : 'Lần đi đang tiếp tục'}
                            </p>
                          </div>
                        ))}
                      </details>
                    )}
                    {deleteId === route.id && (
                      <div
                        className="expedition-delete"
                        role="alertdialog"
                        aria-labelledby={`delete-title-${route.id}`}
                        aria-describedby={`delete-description-${route.id}`}
                        onKeyDown={event => {
                          if (event.key === 'Escape') {
                            setDeleteId(null)
                            setNotice('Đã giữ lại mục tiêu riêng.')
                          }
                        }}
                      >
                        <h4 id={`delete-title-${route.id}`}>Xóa “{route.name}”?</h4>
                        <p id={`delete-description-${route.id}`}>
                          Mục tiêu riêng chưa khởi hành này sẽ được xóa khỏi sổ.
                        </p>
                        <div className="expedition-actions">
                          <button
                            ref={cancelDelete}
                            className="expedition-button secondary"
                            onClick={() => setDeleteId(null)}
                          >
                            Giữ lại mục tiêu
                          </button>
                          <button
                            className="expedition-button"
                            onClick={() => {
                              act(
                                previous => deleteExpedition(previous, route.id),
                                'Đã xóa mục tiêu riêng chưa khởi hành.'
                              )
                              setDeleteId(null)
                            }}
                          >
                            Xác nhận xóa mục tiêu
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
