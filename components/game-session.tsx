'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Bookmark, Check, Lightbulb, RotateCcw, Trophy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLibrary } from '@/components/library-provider'
import type { Outcome } from '@/lib/game-journey'
import { useGameProgress } from '@/components/game-provider'
import {
  answerPoints,
  createQuestions,
  createReviewQuestion,
  gameModes,
  isCorrect,
  localDateKey,
  type PlayMode,
  type Question,
} from '@/lib/games'

type Answer = { selection: string[]; hinted: boolean; correct: boolean; points: number }
type Run = { id: string; date: string; questions: Question[] }
export function GameSession({ mode }: { mode: PlayMode | 'review' }) {
  const { ready, progress, record, storageAvailable, reviewAnswers } = useGameProgress()
  const { library, toggleSaved } = useLibrary()
  const [run, setRun] = useState<Run | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selection, setSelection] = useState<string[]>([])
  const [hinted, setHinted] = useState(false)
  const [submitted, setSubmitted] = useState<Answer | null>(null)
  const [finished, setFinished] = useState(false)
  const [earned, setEarned] = useState(0)
  const finishLock = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const feedback = useRef<HTMLDivElement>(null)
  const reviewing = mode === 'review'
  const total = run?.questions.length ?? (reviewing ? Math.min(progress.review.length, 5) : 5)
  const title = reviewing
    ? 'Ôn câu chưa nhớ'
    : mode === 'daily'
      ? 'Thử thách hôm nay'
      : gameModes[mode].title
  const question = run?.questions[answers.length]
  const score = answers.reduce((sum, answer) => sum + answer.points, 0)
  useEffect(() => {
    if (run) heading.current?.focus()
  }, [run, answers.length, finished])
  useEffect(() => {
    if (submitted) feedback.current?.focus()
  }, [submitted])
  function start() {
    const date = localDateKey()
    const id = mode === 'daily' ? `daily:${date}` : crypto.randomUUID()
    const questions = reviewing
      ? progress.review.slice(0, 5).flatMap(item => {
          const question = createReviewQuestion(item)
          return question ? [question] : []
        })
      : createQuestions(mode, mode === 'daily' ? date : id)
    if (!questions.length) return
    setRun({ id, date, questions })
    setAnswers([])
    setSelection([])
    setHinted(false)
    setSubmitted(null)
    setFinished(false)
    setEarned(0)
    finishLock.current = false
  }
  function submit(skip = false) {
    if (!question || submitted) return
    const chosen = skip ? [] : selection
    const correct = isCorrect(question, chosen)
    setSubmitted({ selection: chosen, correct, hinted, points: answerPoints(correct, hinted) })
  }
  function next() {
    if (!submitted || !run || finishLock.current) return
    const completed = [...answers, submitted]
    if (completed.length === total) {
      finishLock.current = true
      const outcomes: Outcome[] = run.questions.map((question, index) => ({
        mode: question.mode,
        verseId: question.passage[0].id,
        correct: completed[index].correct,
        hinted: completed[index].hinted,
      }))
      if (reviewing) reviewAnswers(outcomes)
      else
        setEarned(
          record({
            outcomes,
            id: run.id,
            date: mode === 'daily' ? run.date : localDateKey(),
            mode,
            score: completed.reduce((sum, answer) => sum + answer.points, 0),
            correct: completed.filter(answer => answer.correct).length,
          })
        )
      setFinished(true)
    }
    setAnswers(completed)
    setSelection([])
    setHinted(false)
    setSubmitted(null)
  }
  return (
    <div className="shell page-content play-page game-page">
      <Link href="/play" className="text-link">
        <ArrowLeft size={16} /> Chơi cùng Kiều
      </Link>
      <header className="page-heading">
        <div className="eyebrow">MỘT CHÚT THỬ TÀI, MỘT CHÚT YÊU THƠ</div>
        <h1>{title}</h1>
      </header>
      {!run ? (
        <section className="game-intro game-panel">
          <span className="feature-icon green">
            <Trophy size={28} />
          </span>
          <h2>
            {reviewing
              ? !ready
                ? 'Đang mở sổ ôn…'
                : total
                  ? `${progress.review.length} câu thơ đang chờ bạn`
                  : 'Sổ ôn đang trống'
              : mode === 'daily'
                ? 'Cuộc hẹn với lời Kiều'
                : gameModes[mode].description}
          </h2>
          <p>
            {reviewing
              ? 'Ôn tối đa 5 câu từng trả lời sai hoặc bỏ qua. Trả lời đúng không dùng gợi ý để đưa câu ra khỏi sổ ôn.'
              : mode === 'daily'
                ? 'Năm câu hỏi kết hợp cả ba trò chơi. Cùng một bộ câu hỏi cho ngày trên thiết bị của bạn.'
                : gameModes[mode].instruction}{' '}
            Không giới hạn thời gian.
          </p>
          {(!reviewing || total > 0) && (
            <ul>
              <li>
                {reviewing
                  ? 'Lượt ôn không cộng XP luyện tập hay chuỗi ngày ở đây. Câu nhớ lại được ghi nhận riêng trong Vườn tri âm.'
                  : 'Mỗi câu đúng được 10 điểm, hoặc 5 điểm nếu dùng gợi ý.'}
              </li>
              <li>Sau mỗi câu, đọc lại lời thơ và mở bản văn để tìm hiểu thêm.</li>
              <li>
                Hoàn thành cả {total} câu để lưu {reviewing ? 'kết quả ôn' : 'thành tích'}. Rời
                trang giữa chừng sẽ bắt đầu lại lượt chơi.
              </li>
            </ul>
          )}
          {mode === 'daily' && (
            <p className="notice">
              Thưởng 10 XP khi hoàn thành lần đầu mỗi ngày. Chơi lại để ôn tập, không cộng thêm XP
              hay lượt chơi.
            </p>
          )}
          {(!reviewing || total > 0) && (
            <button className="button primary" onClick={start} disabled={!ready || !total}>
              {ready ? `Bắt đầu · ${total} câu` : 'Đang mở sổ thành tích…'} <ArrowRight size={17} />
            </button>
          )}
          {reviewing && ready && !total && (
            <Link href="/play" className="text-link">
              Khám phá các trò chơi <ArrowRight size={16} />
            </Link>
          )}
        </section>
      ) : finished ? (
        <>
          <section className="game-panel game-summary">
            <Trophy size={38} />
            <div className="eyebrow">THÊM MỘT LẦN GẦN KIỀU</div>
            <h2 ref={heading} tabIndex={-1}>
              Bạn đã hoàn thành!
            </h2>
            <div className="game-score">
              {score}
              <span>/{total * 10} điểm</span>
            </div>
            <p>
              Đúng {answers.filter(answer => answer.correct).length}/{total} câu · +{earned} XP ·
              Tổng {progress.xp} XP
            </p>
            <Link className="text-link" href="/play/adventure">
              Ghé Vườn tri âm để xem nhiệm vụ và phần thưởng <ArrowRight size={16} />
            </Link>
            {reviewing && (
              <p role="status" className="notice">
                Còn {progress.review.length} câu trong sổ ôn. Câu đúng có gợi ý vẫn được giữ để bạn
                thử lại.
              </p>
            )}
            {!reviewing && progress.review.length > 0 && (
              <Link className="text-link" href="/play/review">
                Ôn {progress.review.length} câu chưa nhớ <ArrowRight size={16} />
              </Link>
            )}
            {mode === 'daily' && earned === 0 && (
              <p className="notice">
                Thử thách ngày {run.date} đã được ghi nhận trước đó. Lượt ôn tập này không cộng thêm
                XP hay lượt chơi.
              </p>
            )}
            {!storageAvailable && (
              <p role="status" className="notice">
                Không thể lưu trong trình duyệt. Thành tích được giữ trong phiên này.
              </p>
            )}
            <div className="game-actions">
              <button
                className="button primary"
                onClick={start}
                disabled={reviewing && !progress.review.length}
              >
                <RotateCcw size={16} />{' '}
                {reviewing
                  ? 'Ôn các câu còn lại'
                  : mode === 'daily'
                    ? 'Ôn lại bộ câu hôm nay'
                    : 'Chơi bộ câu mới'}
              </button>
              <Link className="button secondary" href="/play">
                Xem hành trình <ArrowRight size={16} />
              </Link>
            </div>
          </section>
          <section className="play-section" aria-labelledby="review-title">
            <h2 id="review-title">Mang theo những câu thơ</h2>
            <p className="play-caption">Đọc lại đáp án, lưu câu yêu thích hoặc mở bản văn.</p>
            <div className="game-review">
              {run.questions.map((item, index) => (
                <article className="game-panel" key={index}>
                  <div className="eyebrow">
                    CÂU {index + 1} · {answers[index].correct ? 'CHÍNH XÁC' : 'CÙNG NHỚ LẠI'} ·{' '}
                    {answers[index].points} ĐIỂM
                  </div>
                  {!answers[index].correct && (
                    <p className="play-caption">
                      {answers[index].selection.length
                        ? `Bạn đã chọn: ${answers[index].selection.join(' / ')}`
                        : 'Bạn đã bỏ qua câu này.'}
                    </p>
                  )}
                  <blockquote>
                    {item.passage.map(verse => (
                      <p key={verse.id}>{verse.text}</p>
                    ))}
                  </blockquote>
                  <div className="game-actions">
                    <Link className="text-link" href={`/full?line=${item.passage[0].id}`}>
                      Đọc dòng {item.passage[0].id}–{item.passage.at(-1)!.id}{' '}
                      <ArrowRight size={15} />
                    </Link>
                    <button
                      className="button secondary"
                      aria-pressed={library.saved.includes(item.passage[0].id)}
                      onClick={() => toggleSaved(item.passage[0].id)}
                    >
                      <Bookmark size={15} />
                      {library.saved.includes(item.passage[0].id) ? 'Đã lưu' : 'Lưu câu thơ'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        question && (
          <section className="game-panel">
            <div className="game-meta">
              <span>
                Câu {answers.length + 1}/{total} · {gameModes[question.mode].label}
              </span>
              <span>{score + (submitted?.points ?? 0)} điểm</span>
            </div>
            <progress
              value={answers.length + (submitted ? 1 : 0)}
              max={total}
              aria-label="Tiến độ lượt chơi"
            />
            <h2 className="game-prompt" tabIndex={-1} ref={heading}>
              {question.prompt}
            </h2>
            <p className="play-caption">{gameModes[question.mode].instruction}</p>
            {question.mode === 'order' && (
              <div className="game-order" aria-label="Thứ tự bạn chọn">
                <span className="play-caption">{selection.length}/4 câu đã xếp</span>
                {selection.length === 0 && <p>Câu đầu tiên sẽ ở đây…</p>}
                {selection.map((text, i) => (
                  <button
                    key={text}
                    disabled={!!submitted}
                    onClick={() => setSelection(selection.filter(item => item !== text))}
                    aria-label={`Gỡ câu ${i + 1}: ${text}`}
                  >
                    <span>{i + 1}</span>
                    {text}
                    <span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            )}
            <div
              className="game-options"
              role="group"
              aria-label={question.mode === 'order' ? 'Các câu chưa xếp' : 'Các đáp án'}
            >
              {question.options.map((option, index) => (
                <button
                  key={option}
                  className={`game-option ${selection.includes(option) ? 'selected' : ''} ${submitted && question.answer.includes(option) && question.mode !== 'order' ? 'correct' : ''}`}
                  aria-pressed={selection.includes(option)}
                  disabled={
                    !!submitted || (question.mode === 'order' && selection.includes(option))
                  }
                  onClick={() =>
                    setSelection(question.mode === 'order' ? [...selection, option] : [option])
                  }
                >
                  <span className="game-option-label">{String.fromCharCode(65 + index)}</span>
                  <span>{option}</span>
                  {submitted && question.answer.includes(option) && question.mode !== 'order' && (
                    <Check size={18} />
                  )}
                </button>
              ))}
            </div>
            {hinted && (
              <p className="notice game-hint" role="status">
                {question.hint}
              </p>
            )}
            {submitted ? (
              <div className="game-feedback" ref={feedback} tabIndex={-1}>
                <h3>
                  {submitted.correct
                    ? `Chính xác! +${submitted.points} điểm`
                    : 'Cùng nhớ lại lời thơ'}
                </h3>
                <blockquote>
                  {question.passage.map(verse => (
                    <p key={verse.id}>{verse.text}</p>
                  ))}
                </blockquote>
                <Link
                  className="text-link"
                  href={`/full?line=${question.passage[0].id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Đọc trong bản văn (tab mới) <ArrowRight size={15} />
                </Link>
                <button className="button primary" onClick={next}>
                  {answers.length === total - 1 ? 'Xem kết quả' : 'Câu tiếp theo'}{' '}
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="game-actions">
                <button
                  className="button primary"
                  disabled={selection.length !== question.answer.length}
                  onClick={() => submit()}
                >
                  Kiểm tra <Check size={17} />
                </button>
                <button
                  className="button secondary"
                  disabled={hinted}
                  onClick={() => setHinted(true)}
                >
                  <Lightbulb size={16} /> Gợi ý · tối đa 5 điểm
                </button>
                <button className="text-link" onClick={() => submit(true)}>
                  Bỏ qua câu này
                </button>
              </div>
            )}
          </section>
        )
      )}
      <p className="play-caption game-edition">
        Câu hỏi dùng nguyên văn trong ứng dụng. Số dòng theo bản văn nhập, không phải số câu của bản
        khảo đính.
      </p>
    </div>
  )
}
