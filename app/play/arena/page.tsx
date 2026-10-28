'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, Feather } from 'lucide-react'
import { useGamification } from '@/components/gamification-provider'
import { useLibrary } from '@/components/library-provider'
import { useLocalStore } from '@/hooks/use-local-store'
import {
  ARENA_STORAGE_KEY,
  arenaCalibration,
  arenaDailySeed,
  arenaExport,
  arenaModes,
  arenaSettingsKey,
  createArenaRun,
  emptyArena,
  parseArena,
  recordArenaBest,
  type ArenaAnswer,
  type ArenaBest,
  type ArenaMode,
  type ArenaQuestion,
  type ArenaSettings,
} from '@/lib/arena'
import { verses } from '@/lib/kieu'
import './arena.css'

type Run = { id: string; settings: ArenaSettings; questions: ArenaQuestion[]; previous?: ArenaBest }
const modeKeys = Object.keys(arenaModes) as ArenaMode[]
const finalLine = verses.at(-1)!.id

export default function ArenaPage() {
  const { library, ready: libraryReady } = useLibrary()
  const { track, ready: adventureReady } = useGamification()
  const store = useLocalStore(ARENA_STORAGE_KEY, emptyArena, parseArena)
  const [modes, setModes] = useState<ArenaMode[]>([...modeKeys])
  const [length, setLength] = useState<3 | 5 | 10>(10)
  const [from, setFrom] = useState('1')
  const [to, setTo] = useState(String(finalLine))
  const [savedOnly, setSavedOnly] = useState(false)
  const [seedMode, setSeedMode] = useState('daily')
  const [seed, setSeed] = useState('')
  const [secondChance, setSecondChance] = useState(false)
  const [run, setRun] = useState<Run | null>(null)
  const [answers, setAnswers] = useState<ArenaAnswer[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState('')
  const [confidence, setConfidence] = useState<ArenaAnswer['confidence'] | null>(null)
  const [attempts, setAttempts] = useState<string[]>([])
  const [feedback, setFeedback] = useState<'retry' | 'correct' | 'reveal' | null>(null)
  const [complete, setComplete] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const rewarded = useRef(new Set<string>())
  const focusTarget = useRef<HTMLHeadingElement>(null)
  const question = run?.questions[index]
  const score = answers.filter(answer => answer.firstCorrect).length
  const ready = store.ready && libraryReady && adventureReady
  useEffect(() => {
    if (run) focusTarget.current?.focus()
  }, [index, feedback, complete, run])

  function start() {
    setError('')
    setNotice('')
    if (!modes.length) {
      setError('Chọn ít nhất một cách chơi.')
      return
    }
    const startLine = Number(from)
    const endLine = Number(to)
    if (
      !Number.isInteger(startLine) ||
      !Number.isInteger(endLine) ||
      startLine < 1 ||
      endLine > finalLine ||
      startLine > endLine
    ) {
      setError(`Chọn khoảng dòng hợp lệ từ 1 đến ${finalLine}.`)
      return
    }
    if (seedMode === 'custom' && !seed.trim()) {
      setError('Nhập hạt giống để có thể tạo lại lượt chơi.')
      return
    }
    const settings: ArenaSettings = {
      modes,
      length,
      from: startLine,
      to: endLine,
      savedOnly,
      savedIds: library.saved,
      seed: seedMode === 'daily' ? arenaDailySeed(new Date()) : seed.trim(),
      secondChance,
    }
    const generated = createArenaRun(settings)
    if (!generated.questions.length) {
      setError(
        savedOnly
          ? 'Chưa đủ đôi câu đã lưu trong khoảng này. Lưu thêm thơ hoặc mở rộng nguồn để chơi.'
          : 'Chưa đủ đôi câu trong khoảng này. Mở rộng khoảng dòng hoặc chọn cách chơi khác.'
      )
      return
    }
    const notes: string[] = []
    if (generated.unavailable.length)
      notes.push(
        `Nguồn này chưa hỗ trợ: ${generated.unavailable.map(mode => arenaModes[mode].title).join(', ')}.`
      )
    if (generated.questions.length < length)
      notes.push(
        `Nguồn đủ cho ${generated.questions.length} câu khác nhau; lượt này dùng số câu đó.`
      )
    setNotice(notes.join(' '))
    setRun({
      id: `arena:${crypto.randomUUID()}`,
      settings,
      questions: generated.questions,
      previous: store.state.best[arenaSettingsKey(settings)],
    })
    setAnswers([])
    setIndex(0)
    setSelected('')
    setConfidence(null)
    setAttempts([])
    setFeedback(null)
    setComplete(false)
  }

  function submit() {
    if (!question || !selected || confidence === null || feedback) return
    const correct = selected === question.answer
    if (!correct && run?.settings.secondChance && attempts.length === 0) {
      setAttempts([selected])
      setSelected('')
      setFeedback('retry')
      return
    }
    const answer: ArenaAnswer = {
      questionId: question.id,
      choice: selected,
      correct,
      firstCorrect: correct && attempts.length === 0,
      attempts: attempts.length + 1,
      confidence,
    }
    setAnswers(previous => [...previous, answer])
    setFeedback(correct ? 'correct' : 'reveal')
  }

  function advance() {
    if (!run || !question || !feedback) return
    if (feedback === 'retry') {
      setFeedback(null)
      return
    }
    if (index < run.questions.length - 1) {
      setIndex(index + 1)
      setSelected('')
      setConfidence(null)
      setAttempts([])
      setFeedback(null)
      return
    }
    if (!rewarded.current.has(run.id)) {
      rewarded.current.add(run.id)
      store.update(previous =>
        recordArenaBest(
          previous,
          arenaSettingsKey(run.settings),
          score,
          run.questions.length,
          new Date().toISOString()
        )
      )
      track({
        type: 'session',
        id: run.id,
        mode: 'arena',
        correct: score,
        total: run.questions.length,
        hints: 0,
        verseIds: run.questions.flatMap((item, position) =>
          answers[position]?.firstCorrect ? item.verseIds : []
        ),
      })
    }
    setComplete(true)
  }

  function download() {
    if (!run || !complete) return
    const url = URL.createObjectURL(
      new Blob([arenaExport(run.settings, run.questions, answers)], {
        type: 'text/plain;charset=utf-8',
      })
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'so-luyen-kieu-dau-truong.txt'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="shell page-content arena-page">
      <Link className="back-link" href="/play">
        <ArrowLeft size={16} /> Chơi cùng Kiều
      </Link>
      <header className="page-heading">
        <div className="eyebrow">TÁM GÓC NHÌN MỚI VÀO CÂU THƠ</div>
        <h1>Đấu trường chữ.</h1>
        <p>
          Một cuộc chơi với chính mình: quan sát dấu, nhận ra chữ, tìm vị trí của thơ trong bản văn.
        </p>
      </header>
      {!store.storageAvailable && (
        <p className="notice" role="status">
          Trình duyệt chưa cho lưu. Bạn vẫn chơi được; kỷ lục chỉ giữ trong phiên này.
        </p>
      )}
      {!ready ? (
        <p role="status">Đang mở sổ luyện…</p>
      ) : !run ? (
        <form
          className="arena-setup"
          onSubmit={event => {
            event.preventDefault()
            start()
          }}
        >
          <fieldset>
            <legend>1. Ghép danh sách cách chơi</legend>
            <p>
              Chọn nhiều cách chơi. Lượt ngắn sẽ lấy một phần danh sách bằng hạt giống; lượt dài
              luân phiên các cách đã chọn.
            </p>
            <div className="arena-modes">
              {modeKeys.map(mode => (
                <label className="arena-mode" key={mode}>
                  <input
                    type="checkbox"
                    checked={modes.includes(mode)}
                    onChange={event =>
                      setModes(current =>
                        event.target.checked
                          ? [...current, mode]
                          : current.filter(item => item !== mode)
                      )
                    }
                  />
                  <span>
                    <strong>{arenaModes[mode].title}</strong>
                    <span>{arenaModes[mode].description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="arena-settings">
            <fieldset>
              <legend>2. Nguồn câu thơ</legend>
              <div className="arena-range">
                <label>
                  Từ dòng
                  <input
                    type="number"
                    min="1"
                    max={finalLine}
                    value={from}
                    onChange={event => setFrom(event.target.value)}
                  />
                </label>
                <label>
                  Đến dòng
                  <input
                    type="number"
                    min="1"
                    max={finalLine}
                    value={to}
                    onChange={event => setTo(event.target.value)}
                  />
                </label>
              </div>
              <label className="arena-check">
                <input
                  type="checkbox"
                  checked={savedOnly}
                  onChange={event => setSavedOnly(event.target.checked)}
                />{' '}
                Chỉ dùng đôi câu đã lưu
              </label>
              <p className="play-caption">
                Một đôi câu hợp lệ có cả hai dòng trong khoảng. Dấu trang ở một trong hai dòng chọn
                cả đôi. Bạn có {library.saved.length} dấu trang.
              </p>
              <Link className="text-link" href="/saved">
                Mở những câu đã lưu
              </Link>
            </fieldset>
            <fieldset>
              <legend>3. Nhịp luyện của bạn</legend>
              <label>
                Số câu
                <select
                  value={length}
                  onChange={event => setLength(Number(event.target.value) as 3 | 5 | 10)}
                >
                  {[3, 5, 10].map(value => (
                    <option key={value} value={value}>
                      {value} câu
                    </option>
                  ))}
                </select>
              </label>
              <label className="arena-check">
                <input
                  type="checkbox"
                  checked={secondChance}
                  onChange={event => setSecondChance(event.target.checked)}
                />{' '}
                Cho thử lại sau lần sai đầu
              </label>
              <p className="play-caption">
                Tối đa hai lần thử rồi hiện nguồn. Điểm và kỷ lục chỉ tính câu đúng ngay lần đầu.
              </p>
            </fieldset>
          </div>
          <fieldset>
            <legend>4. Hạt giống câu hỏi</legend>
            <label>
              Kiểu hạt giống
              <select value={seedMode} onChange={event => setSeedMode(event.target.value)}>
                <option value="daily">Theo ngày trên thiết bị</option>
                <option value="custom">Tự đặt để tạo lại lượt</option>
              </select>
            </label>
            {seedMode === 'custom' && (
              <label>
                Hạt giống tự đặt
                <input
                  value={seed}
                  maxLength={100}
                  onChange={event => setSeed(event.target.value)}
                  placeholder="Ví dụ: ben-song-2026"
                />
              </label>
            )}
            <p className="play-caption">
              Cùng ngày hoặc cùng hạt giống, cùng cài đặt và cùng bộ dấu trang sẽ tạo lại cùng câu
              hỏi. Không bấm giờ.
            </p>
          </fieldset>
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" type="submit">
            <Feather size={18} /> Bắt đầu luyện
          </button>
        </form>
      ) : complete ? (
        <section className="arena-results">
          <h2 tabIndex={-1} ref={focusTarget}>
            Bạn đã khép lại một lượt luyện.
          </h2>
          <p className="arena-score">
            {score}/{run.questions.length} câu đúng lần đầu
          </p>
          <p>
            {answers.filter(answer => answer.correct && !answer.firstCorrect).length} câu tìm ra ở
            lần thử thứ hai.
          </p>
          <p>
            {run.previous
              ? `Kỷ lục trước với cùng cài đặt: ${run.previous.correct}/${run.previous.total}. ${score / run.questions.length > run.previous.correct / run.previous.total ? 'Bạn đã vượt kỷ lục!' : 'Mỗi lần nhìn kỹ là một lần hiểu thêm.'}`
              : 'Đây là kỷ lục đầu tiên với tổ hợp cài đặt này.'}
          </p>
          <p className="play-caption">Hạt giống: {run.settings.seed}</p>
          <h3>Tự tin và kết quả thực tế</h3>
          <p>
            Đối chiếu mức tự tin trước lần trả lời đầu với tỷ lệ đúng lần đầu. Ít câu chỉ là một gợi
            ý, chưa phải đánh giá năng lực.
          </p>
          <ul className="arena-calibration">
            {arenaCalibration(answers).map(group => (
              <li key={group.confidence}>
                <strong>Tự tin {group.confidence}%</strong>
                <span>
                  {group.total
                    ? `${group.correct}/${group.total} đúng lần đầu · thực tế ${group.accuracy}%`
                    : 'Chưa có câu ở mức này'}
                </span>
              </li>
            ))}
          </ul>
          <div className="arena-actions">
            <button className="button secondary" onClick={download}>
              <Download size={17} /> Tải bản ghi có nguồn
            </button>
            <button
              className="button primary"
              onClick={() => {
                setRun(null)
                setComplete(false)
                setError('')
              }}
            >
              Chọn lượt tiếp
            </button>
          </div>
          <h3>Đọc lại nguyên văn</h3>
          <ol className="arena-review">
            {run.questions.map((item, position) => (
              <li key={item.id}>
                <h4>
                  {arenaModes[item.mode].title} ·{' '}
                  {answers[position].firstCorrect ? 'Đúng lần đầu' : 'Chưa đúng lần đầu'}
                </h4>
                <p>{item.explanation}</p>
                <Source question={item} />
              </li>
            ))}
          </ol>
        </section>
      ) : question ? (
        <section className="arena-game" aria-label="Lượt luyện">
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          <div className="arena-meta">
            <span>
              Câu {index + 1}/{run.questions.length}
            </span>
            <span>{arenaModes[question.mode].title}</span>
          </div>
          <progress max={run.questions.length} value={index} aria-label="Tiến độ lượt luyện" />
          <h2 tabIndex={-1} ref={!feedback ? focusTarget : undefined}>
            {question.prompt}
          </h2>
          {question.context.map((text, position) => (
            <p className="arena-context" key={position}>
              {text}
            </p>
          ))}
          <form
            onSubmit={event => {
              event.preventDefault()
              submit()
            }}
          >
            <fieldset className="arena-options" disabled={!!feedback}>
              <legend>Chọn đáp án</legend>
              {question.choices.map(choice => (
                <label
                  className="arena-option"
                  key={choice.id}
                  data-selected={selected === choice.id}
                >
                  <input
                    type="radio"
                    name="arena-answer"
                    value={choice.id}
                    checked={selected === choice.id}
                    disabled={attempts.includes(choice.id)}
                    onChange={() => setSelected(choice.id)}
                  />
                  <span>
                    {choice.text}
                    {attempts.includes(choice.id) ? ' · Đã thử, chưa đúng' : ''}
                  </span>
                </label>
              ))}
            </fieldset>
            <fieldset className="arena-confidence" disabled={!!feedback || attempts.length > 0}>
              <legend>Mức tự tin trước khi kiểm tra</legend>
              {([50, 75, 100] as const).map(value => (
                <label key={value}>
                  <input
                    type="radio"
                    name="arena-confidence"
                    checked={confidence === value}
                    onChange={() => setConfidence(value)}
                  />
                  {value}%
                </label>
              ))}
            </fieldset>
            {!feedback && (
              <button
                className="button primary"
                type="submit"
                disabled={!selected || confidence === null}
              >
                Kiểm tra đáp án
              </button>
            )}
          </form>
          {feedback && (
            <div className="arena-feedback" role="status">
              <h2 tabIndex={-1} ref={focusTarget}>
                {feedback === 'retry'
                  ? 'Chưa đúng. Bạn còn một lần thử.'
                  : feedback === 'correct'
                    ? attempts.length
                      ? 'Bạn đã tìm ra ở lần thứ hai.'
                      : 'Đúng ngay lần đầu!'
                    : 'Cùng nhìn lại nguyên văn.'}
              </h2>
              {feedback === 'retry' ? (
                <p>
                  Mức tự tin được giữ từ lần đầu. Lần thử tiếp giúp bạn học, điểm câu này không
                  tăng.
                </p>
              ) : (
                <>
                  <p>{question.explanation}</p>
                  <Source question={question} />
                </>
              )}
              <button className="button primary" onClick={advance}>
                {feedback === 'retry'
                  ? 'Thử lần thứ hai'
                  : index === run.questions.length - 1
                    ? 'Xem kết quả luyện'
                    : 'Câu tiếp'}
              </button>
            </div>
          )}
        </section>
      ) : null}
      <p className="arena-footnote">
        Nguyễn Du · Truyện Kiều. Thứ tự và số dòng theo bản nhập trong ứng dụng. Những lựa chọn đổi
        dấu, tráo dòng và dòng lạc đoạn là chất liệu câu hỏi; phần nguồn luôn giữ nguyên văn.
      </p>
    </div>
  )
}

function Source({ question }: { question: ArenaQuestion }) {
  return (
    <div className="arena-source">
      {question.passage.map(verse => (
        <p key={verse.id}>
          {verse.text}{' '}
          <Link href={`/full?line=${verse.id}`} aria-label={`Đọc nguồn dòng ${verse.id}`}>
            ↗ {verse.id}
          </Link>
        </p>
      ))}
      <p className="play-caption">Nguyễn Du · Truyện Kiều · Bản văn trong ứng dụng</p>
    </div>
  )
}
