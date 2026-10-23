'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, EyeOff, Lightbulb, RotateCcw, Sparkles } from 'lucide-react'
import { useGamification } from '@/components/gamification-provider'
import {
  ARCADE_ROUNDS,
  arcadeAnswerText,
  arcadeModes,
  arcadeRank,
  createArcadeQuestions,
  isArcadeCorrect,
  type ArcadeMode,
  type ArcadeQuestion,
} from '@/lib/arcade'

type Answer = { selected: string[]; correct: boolean; hinted: boolean; skipped: boolean }
type Run = { id: string; questions: ArcadeQuestion[]; practice: boolean }

export function ArcadeSession({ mode }: { mode: ArcadeMode }) {
  const { track, ready, storageAvailable } = useGamification()
  const [run, setRun] = useState<Run | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selection, setSelection] = useState<string[]>([])
  const [submitted, setSubmitted] = useState<Answer | null>(null)
  const [hinted, setHinted] = useState(false)
  const [concealed, setConcealed] = useState(false)
  const [focus, setFocus] = useState(false)
  const [noHints, setNoHints] = useState(false)
  const [finished, setFinished] = useState(false)
  const [recorded, setRecorded] = useState(false)
  const finishLock = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const feedback = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const game = arcadeModes[mode]
  const question = run?.questions[answers.length]
  const total = run?.questions.length ?? ARCADE_ROUNDS
  const correct = answers.filter(answer => answer.correct).length
  const hints = answers.filter(answer => answer.hinted).length
  let combo = 0
  let bestCombo = 0
  for (const answer of answers) {
    combo = answer.correct && !answer.hinted ? combo + 1 : 0
    bestCombo = Math.max(bestCombo, combo)
  }
  useEffect(() => {
    if (run) heading.current?.focus()
  }, [run, answers.length, finished])
  useEffect(() => {
    if (submitted) feedback.current?.focus()
  }, [submitted])
  function resetRound() {
    setSelection([])
    setSubmitted(null)
    setHinted(false)
    setConcealed(false)
  }
  function start() {
    const id = crypto.randomUUID()
    setRun({ id, questions: createArcadeQuestions(mode, id), practice: false })
    setAnswers([])
    setFinished(false)
    setRecorded(false)
    finishLock.current = false
    resetRound()
  }
  function practiceWeakQuestions() {
    if (!run) return
    const questions = run.questions.filter(
      (_, index) => !answers[index].correct || answers[index].hinted
    )
    if (!questions.length) return
    setRun({ id: crypto.randomUUID(), questions, practice: true })
    setAnswers([])
    setFinished(false)
    finishLock.current = false
    resetRound()
  }
  function select(id: string) {
    if (!question || submitted) return
    if (mode === 'word-order' || mode === 'double-blank') {
      setSelection(current =>
        current.includes(id)
          ? current.filter(value => value !== id)
          : current.length < question.answer.length
            ? [...current, id]
            : current
      )
    } else setSelection([id])
  }
  function submit(skipped = false) {
    if (!question || submitted) return
    const selected = skipped ? [] : selection
    setSubmitted({
      selected,
      skipped,
      correct: !skipped && isArcadeCorrect(question, selected),
      hinted,
    })
  }
  function next() {
    if (!run || !submitted || finishLock.current) return
    const completed = [...answers, submitted]
    if (completed.length === total) {
      finishLock.current = true
      if (!run.practice)
        setRecorded(
          track({
            type: 'session',
            id: run.id,
            mode: `arcade-${mode}`,
            correct: completed.filter(answer => answer.correct).length,
            total,
            hints: completed.filter(answer => answer.hinted).length,
            verseIds: [
              ...new Set(
                run.questions.flatMap((item, index) =>
                  completed[index].correct && !completed[index].hinted ? item.masteryIds : []
                )
              ),
            ],
          })
        )
      setFinished(true)
    }
    setAnswers(completed)
    resetRound()
  }
  const canSubmit =
    question &&
    selection.length === question.answer.length &&
    selection.every(value => value.trim()) &&
    (mode !== 'recall' || concealed)

  return (
    <div className={`shell page-content arcade-page ${focus ? 'arcade-focus' : ''}`}>
      <Link className="back-link" href="/play/arcade">
        <ArrowLeft size={16} /> Mười cách chơi cùng thơ
      </Link>
      <header className="page-heading">
        <div className="eyebrow">
          XƯỞNG CHƠI CÙNG KIỀU · {game.category.toLocaleUpperCase('vi')}
        </div>
        <h1>{game.title}</h1>
        {!focus && <p>{game.description}</p>}
      </header>
      {!storageAvailable && (
        <p className="notice" role="status">
          Trình duyệt chưa lưu được hành trình. Kết quả chỉ được giữ trong phiên này; bạn có thể
          xuất bản sao ở Vườn tri âm.
        </p>
      )}
      {!run ? (
        <section className="game-panel arcade-intro" aria-label="Hướng dẫn lượt chơi">
          <h2>Năm câu hỏi, một cách nhớ mới.</h2>
          <p>{game.instruction}</p>
          <p>
            Không bấm giờ. Bạn có thể dùng gợi ý hoặc bỏ qua. Hoàn thành cả năm câu để ghi nhận lượt
            chơi.
          </p>
          <p className="play-caption">
            Các câu dựa trên bản văn trong ứng dụng; số dòng là số của bản nhập này. Thành tích được
            giữ trên thiết bị.
          </p>
          <label className="arcade-contract">
            <input
              type="checkbox"
              checked={noHints}
              onChange={event => setNoHints(event.target.checked)}
            />
            <span>Thử thách tự nhớ: tắt gợi ý cho lượt này. Vẫn có thể bỏ qua.</span>
          </label>
          <button className="button primary" disabled={!ready} onClick={start}>
            Bắt đầu · 5 câu <ArrowRight size={16} />
          </button>
        </section>
      ) : finished ? (
        <section className="arcade-results">
          <div className="game-panel arcade-result-card">
            <Sparkles size={30} aria-hidden="true" />
            <h2 ref={heading} tabIndex={-1}>
              Bạn đã hoàn thành xưởng thơ!
            </h2>
            <p className="arcade-rank">{arcadeRank(correct, total, hints)}</p>
            <p>
              <strong>
                {correct}/{total} câu đúng
              </strong>{' '}
              · {hints} gợi ý · Chuỗi đúng không gợi ý dài nhất: {bestCombo}
            </p>
            <p>
              {run.practice
                ? 'Đã hoàn thành ôn riêng. Lượt ôn này không cộng thêm XP hoặc thành tích.'
                : recorded
                  ? 'Đã ghi nhận lượt chơi. Những câu đúng không gợi ý được thêm vào sổ thuộc thơ.'
                  : 'Đã hoàn thành lượt luyện. Chưa ghi thêm thành tích: lượt đã được tính hoặc đã đạt giới hạn 20 lượt thưởng hôm nay.'}
            </p>
            <div className="arcade-actions">
              <button className="button primary" onClick={start}>
                <RotateCcw size={16} /> Chơi một bộ mới
              </button>
              {answers.some(answer => !answer.correct || answer.hinted) && (
                <button className="button secondary" onClick={practiceWeakQuestions}>
                  Ôn riêng {answers.filter(answer => !answer.correct || answer.hinted).length} câu
                  chưa vững
                </button>
              )}
              <Link className="button secondary" href="/play/adventure">
                Xem thành tích
              </Link>
              <Link className="button secondary" href="/play/arcade">
                Thử cách chơi khác
              </Link>
            </div>
          </div>
          <h2>Đọc lại để nhớ lâu hơn</h2>
          <ol className="arcade-review">
            {run.questions.map((item, index) => (
              <li className="game-panel" key={`${item.passage[0].id}-${index}`}>
                <h3>
                  Câu {index + 1} ·{' '}
                  {answers[index].skipped
                    ? 'Đã bỏ qua'
                    : answers[index].correct
                      ? 'Chính xác'
                      : 'Cùng nhớ lại'}
                  {answers[index].hinted ? ' · Có gợi ý' : ''}
                </h3>
                <p>Bạn trả lời: {arcadeAnswerText(item, answers[index].selected)}</p>
                <p>{item.explanation}</p>
                <SourcePassage question={item} />
              </li>
            ))}
          </ol>
        </section>
      ) : (
        question && (
          <section className="game-panel arcade-game" aria-label="Lượt chơi">
            <div className="arcade-toolbar">
              <span>
                Câu {answers.length + 1}/{total}
                {run.practice ? ' · Ôn riêng, không cộng điểm' : ''}
              </span>
              <button
                className="arcade-text-button"
                aria-pressed={focus}
                onClick={() => setFocus(current => !current)}
              >
                {focus ? 'Hiện thông tin' : 'Chế độ tập trung'}
              </button>
            </div>
            <progress value={answers.length} max={total} aria-label="Tiến độ lượt chơi" />
            {!focus && (
              <p className="play-caption">
                Đúng {correct} câu · Chuỗi đúng không gợi ý: {combo}
              </p>
            )}
            {noHints && <p className="play-caption">Thử thách tự nhớ · Gợi ý đang tắt</p>}
            <h2 ref={heading} tabIndex={-1}>
              Câu {answers.length + 1}:{' '}
              {mode === 'recall' && !concealed ? 'Đọc câu thơ này' : game.title}
            </h2>
            <p id="arcade-instruction">{game.instruction}</p>
            {mode === 'recall' && !concealed && !submitted ? (
              <div className="arcade-memory">
                <blockquote>{question.memory}</blockquote>
                <button
                  className="button primary"
                  onClick={() => {
                    setConcealed(true)
                    requestAnimationFrame(() => input.current?.focus())
                  }}
                >
                  <EyeOff size={17} /> Che câu và thử nhớ
                </button>
              </div>
            ) : (
              <>
                <blockquote className="arcade-prompt">{question.prompt}</blockquote>
                {mode === 'typed-word' || mode === 'recall' ? (
                  <form
                    onSubmit={event => {
                      event.preventDefault()
                      if (canSubmit) submit()
                    }}
                  >
                    <label className="arcade-input-label" htmlFor="arcade-answer">
                      {mode === 'recall' ? 'Câu thơ bạn nhớ' : 'Chữ còn thiếu'}
                    </label>
                    <input
                      ref={input}
                      id="arcade-answer"
                      className="arcade-input"
                      value={selection[0] ?? ''}
                      onChange={event => setSelection([event.target.value])}
                      disabled={!!submitted}
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={200}
                      aria-describedby="arcade-instruction"
                    />
                  </form>
                ) : mode === 'pair-match' ? (
                  <fieldset className="arcade-pairs" disabled={!!submitted}>
                    <legend>Ghép câu bát cho từng câu lục</legend>
                    {question.left?.map((verse, index) => (
                      <div key={verse.id}>
                        <label htmlFor={`arcade-pair-${index}`}>
                          {index + 1}. {verse.text}
                        </label>
                        <select
                          id={`arcade-pair-${index}`}
                          value={selection[index] ?? ''}
                          onChange={event =>
                            setSelection(current => {
                              const next = Array.from({ length: 3 }, (_, i) => current[i] ?? '')
                              next[index] = event.target.value
                              return next
                            })
                          }
                        >
                          <option value="">Chọn câu bát…</option>
                          {question.choices.map(choice => (
                            <option
                              key={choice.id}
                              value={choice.id}
                              disabled={selection.some((id, i) => i !== index && id === choice.id)}
                            >
                              {choice.text}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </fieldset>
                ) : (
                  <>
                    {(mode === 'word-order' || mode === 'double-blank') && (
                      <div
                        className="arcade-arrangement"
                        aria-label="Các chữ đã xếp"
                        aria-live="polite"
                      >
                        {selection.length ? (
                          selection.map((id, index) => (
                            <button
                              className="arcade-token"
                              key={id}
                              disabled={!!submitted}
                              onClick={() => select(id)}
                              aria-label={`Gỡ chữ ${index + 1}: ${question.choices.find(choice => choice.id === id)?.text}`}
                            >
                              <span>{index + 1}.</span>{' '}
                              {question.choices.find(choice => choice.id === id)?.text}
                            </button>
                          ))
                        ) : (
                          <span>Chọn các chữ bên dưới để xếp vào đây.</span>
                        )}
                      </div>
                    )}
                    <div
                      role="group"
                      aria-label="Chọn đáp án"
                      aria-describedby="arcade-instruction"
                      className={`arcade-choices ${['word-order', 'double-blank', 'changed-word'].includes(mode) ? 'arcade-word-choices' : ''}`}
                    >
                      {question.choices.map((choice, index) => (
                        <button
                          key={choice.id}
                          className="arcade-choice"
                          aria-pressed={selection.includes(choice.id)}
                          disabled={
                            !!submitted ||
                            ((mode === 'word-order' || mode === 'double-blank') &&
                              selection.includes(choice.id))
                          }
                          onClick={() => select(choice.id)}
                        >
                          {mode === 'changed-word' && (
                            <span className="arcade-choice-index">{index + 1}. </span>
                          )}
                          {choice.text}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            {!submitted && (
              <>
                {hinted && (
                  <p className="arcade-hint" role="status">
                    <Lightbulb size={17} aria-hidden="true" />
                    {question.hint}
                  </p>
                )}
                <div className="arcade-actions">
                  <button className="button primary" disabled={!canSubmit} onClick={() => submit()}>
                    Kiểm tra
                  </button>
                  {!noHints && (
                    <button
                      className="button secondary"
                      disabled={hinted || (mode === 'recall' && !concealed)}
                      onClick={() => setHinted(true)}
                    >
                      <Lightbulb size={16} /> Gợi ý
                    </button>
                  )}
                  <button className="arcade-text-button" onClick={() => submit(true)}>
                    Bỏ qua câu này
                  </button>
                </div>
              </>
            )}
            {submitted && (
              <div
                className={`arcade-feedback ${submitted.correct ? 'arcade-correct' : ''}`}
                ref={feedback}
                tabIndex={-1}
                role="status"
              >
                <h3>
                  {submitted.correct
                    ? 'Chính xác!'
                    : submitted.skipped
                      ? 'Cùng đọc lại câu này.'
                      : 'Thêm một lần để nhớ.'}
                </h3>
                <p>{question.explanation}</p>
                <SourcePassage question={question} />
                <button className="button primary" onClick={next}>
                  {answers.length === total - 1 ? 'Xem kết quả' : 'Câu tiếp theo'}{' '}
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </section>
        )
      )}
    </div>
  )
}

function SourcePassage({ question }: { question: ArcadeQuestion }) {
  return (
    <div className="arcade-source">
      {question.passage.map(verse => (
        <p key={verse.id}>
          {verse.text}{' '}
          <Link href={`/full?line=${verse.id}`} aria-label={`Đọc nguồn dòng ${verse.id}`}>
            ↗ {verse.id}
          </Link>
        </p>
      ))}
      <span className="play-caption">
        Nguyễn Du · Truyện Kiều · Số dòng theo bản nhập trong ứng dụng
      </span>
    </div>
  )
}
