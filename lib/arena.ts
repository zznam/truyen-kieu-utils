import { couplets, normalize, passageText, verses, words, type Verse } from './kieu'

export const ARENA_STORAGE_KEY = 'kieu-arena-v1'
export const arenaModes = {
  accents: {
    title: 'Trả dấu cho thơ',
    description: 'Chọn dòng có dấu tiếng Việt đúng nguyên văn.',
  },
  ordinal: { title: 'Chữ ở vị trí nào?', description: 'Tìm thứ tự của một chữ trong dòng thơ.' },
  echo: {
    title: 'Tiếng vọng trong đôi câu',
    description: 'Tìm chữ xuất hiện ở cả câu lục và câu bát.',
  },
  frequency: { title: 'Đếm dấu chân chữ', description: 'Đếm một chữ cụ thể trong cả đoạn thơ.' },
  intact: {
    title: 'Đôi câu không tráo',
    description: 'Nhận ra cặp lục bát nguyên vẹn giữa những cặp đã tráo.',
  },
  boundaries: {
    title: 'Hai đầu câu thơ',
    description: 'Nhận ra cặp chữ mở đầu và kết thúc khi phần giữa được che.',
  },
  chronology: {
    title: 'Trước sau trong bản văn',
    description: 'Xếp hai đoạn xa nhau theo thứ tự bản nhập.',
  },
  window: {
    title: 'Vị khách lạc đoạn',
    description: 'Tìm dòng không thuộc một cửa sổ bốn dòng của bản văn.',
  },
} as const
export type ArenaMode = keyof typeof arenaModes
export type ArenaSettings = {
  modes: ArenaMode[]
  length: 3 | 5 | 10
  from: number
  to: number
  savedOnly: boolean
  savedIds: number[]
  seed: string
  secondChance: boolean
}
export type ArenaQuestion = {
  id: string
  mode: ArenaMode
  prompt: string
  context: string[]
  choices: { id: string; text: string }[]
  answer: string
  passage: Verse[]
  verseIds: number[]
  explanation: string
}
export type ArenaAnswer = {
  questionId: string
  choice: string
  correct: boolean
  firstCorrect: boolean
  attempts: number
  confidence: 50 | 75 | 100
}
export type ArenaBest = { correct: number; total: number; at: string }
export type ArenaState = { version: 1; best: Record<string, ArenaBest> }
export const emptyArena = (): ArenaState => ({ version: 1, best: {} })
export const isArenaMode = (mode: string): mode is ArenaMode => Object.hasOwn(arenaModes, mode)
const lower = (value: string) => value.normalize('NFC').toLocaleLowerCase('vi')
const unique = <T>(values: T[]) => [...new Set(values)]
const tokens = (verse: Verse) => words(verse.text).map(lower)
const validPairs = couplets.filter(pair => pair.length === 2)

function randomFrom(seed: string) {
  let value = 2166136261
  for (const char of seed) value = Math.imul(value ^ char.charCodeAt(0), 16777619)
  return () => {
    value += 0x6d2b79f5
    let next = value
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}
function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}

export function arenaSource(settings: ArenaSettings): Verse[][] {
  const saved = new Set(settings.savedIds)
  return validPairs.filter(
    pair =>
      pair.every(verse => verse.id >= settings.from && verse.id <= settings.to) &&
      (!settings.savedOnly || pair.some(verse => saved.has(verse.id)))
  )
}

function toneVariants(text: string): string[] {
  const source = text.normalize('NFD')
  // Change a tone mark only: breve, circumflex and horn remain intact.
  const match = /[aeiouyAEIOUY][\u0300-\u036f]*/u.exec(source)
  if (!match) return [text]
  const stem = match[0].replace(/[\u0300\u0301\u0303\u0309\u0323]/g, '')
  return unique(
    ['', '\u0300', '\u0301', '\u0309', '\u0303', '\u0323'].map(tone =>
      (
        source.slice(0, match.index) +
        stem +
        tone +
        source.slice(match.index + match[0].length)
      ).normalize('NFC')
    )
  ).filter(value => value !== text.normalize('NFC'))
}

function makeQuestion(
  mode: ArenaMode,
  pair: Verse[],
  pool: Verse[][],
  random: () => number
): ArenaQuestion | null {
  const first = pair[0]
  const sourceTokens = tokens(first)
  const others = shuffled(
    pool.filter(item => item[0].id !== first.id),
    random
  )
  const base: ArenaQuestion = {
    id: `${mode}:${first.id}`,
    mode,
    prompt: '',
    context: [],
    choices: [],
    answer: '',
    passage: pair,
    verseIds: ['accents', 'intact', 'boundaries'].includes(mode) ? [first.id] : [],
    explanation: '',
  }
  let correct = ''
  let alternatives: string[] = []
  switch (mode) {
    case 'accents':
      base.prompt = 'Dòng nào giữ đúng dấu tiếng Việt của nguyên văn? Các lựa chọn khác đã đổi dấu.'
      base.context = [normalize(first.text)]
      correct = first.text
      alternatives = toneVariants(first.text).slice(0, 3)
      break
    case 'ordinal': {
      const candidates = sourceTokens.flatMap((word, index) =>
        sourceTokens.indexOf(word) === sourceTokens.lastIndexOf(word) ? [index] : []
      )
      if (!candidates.length) return null
      const index = shuffled(candidates, random)[0]
      base.prompt = `Chữ “${words(first.text)[index]}” đứng thứ mấy? Đếm từ 1, bỏ qua dấu câu.`
      base.context = [first.text]
      correct = String(index + 1)
      alternatives = shuffled(
        sourceTokens.map((_, position) => String(position + 1)).filter(value => value !== correct),
        random
      ).slice(0, 3)
      break
    }
    case 'echo': {
      const shared = unique(sourceTokens.filter(word => tokens(pair[1]).includes(word)))
      if (!shared.length) return null
      correct = shuffled(shared, random)[0]
      alternatives = shuffled(
        unique(pair.flatMap(tokens)).filter(word => !shared.includes(word)),
        random
      ).slice(0, 3)
      base.prompt = 'Chữ nào xuất hiện ở cả hai dòng?'
      base.context = pair.map(verse => verse.text)
      break
    }
    case 'frequency': {
      const all = pair.flatMap(tokens)
      const target = shuffled(unique(all), random)[0]
      correct = String(all.filter(word => word === target).length)
      alternatives = ['0', '1', '2', '3', '4', '5'].filter(value => value !== correct).slice(0, 3)
      base.prompt = `Chữ “${target}” xuất hiện bao nhiêu lần trong hai dòng? Không phân biệt hoa thường, giữ nguyên dấu.`
      base.context = pair.map(verse => verse.text)
      break
    }
    case 'intact': {
      correct = pair.map(verse => verse.text).join('\n')
      const authentic = new Set(pool.map(item => item.map(verse => verse.text).join('\n')))
      alternatives = others
        .flatMap(item => [`${first.text}\n${item[1].text}`, `${item[0].text}\n${pair[1].text}`])
        .filter(value => !authentic.has(value))
        .slice(0, 3)
      base.prompt = 'Đôi câu nào liền nhau đúng nguyên văn? Các đôi còn lại đã tráo dòng.'
      break
    }
    case 'boundaries': {
      correct = `${words(first.text)[0]} · ${words(first.text).at(-1)}`
      alternatives = others
        .map(item => `${words(item[0].text)[0]} · ${words(item[0].text).at(-1)}`)
        .filter(value => value !== correct)
        .slice(0, 3)
      base.prompt = 'Chọn đúng chữ đầu và chữ cuối của dòng này.'
      base.context = [
        `${normalize(words(first.text)[0])} … ${normalize(words(first.text).at(-1)!)}`,
        'Phần giữa đã che; hai đầu được bỏ dấu để bạn nhận ra.',
      ]
      break
    }
    case 'chronology': {
      const distant = others.find(item => Math.abs(item[0].id - first.id) >= 4)
      if (!distant) return null
      base.prompt = 'Đoạn nào xuất hiện trước trong bản văn của ứng dụng?'
      base.context = [
        `A\n${pair.map(verse => verse.text).join('\n')}`,
        `B\n${distant.map(verse => verse.text).join('\n')}`,
      ]
      correct = first.id < distant[0].id ? 'A trước B' : 'B trước A'
      alternatives = [first.id < distant[0].id ? 'B trước A' : 'A trước B']
      base.passage = [...pair, ...distant].sort((a, b) => a.id - b.id)
      break
    }
    case 'window': {
      const index = verses.findIndex(verse => verse.id === first.id)
      const nextPair = pool.find(
        item => item[0].id === verses[index + 2]?.id && item[1].id === verses[index + 3]?.id
      )
      if (!nextPair) return null
      const window = [...pair, ...nextPair]
      const decoy = others.flat().find(verse => !window.some(item => item.text === verse.text))
      if (!decoy) return null
      base.prompt = `Dòng nào KHÔNG thuộc đoạn bốn dòng bắt đầu bằng “${first.text}”?`
      correct = decoy.text
      alternatives = shuffled(
        window.slice(1).map(verse => verse.text),
        random
      )
      base.passage = window
      break
    }
  }
  const choices = unique([correct, ...alternatives])
  if (!correct || choices.length < 2) return null
  base.choices = shuffled(choices, random).map((text, index) => ({ id: String(index), text }))
  base.answer = base.choices.find(choice => choice.text === correct)!.id
  base.explanation =
    mode === 'chronology'
      ? `${correct}, theo thứ tự dòng trong bản nhập; đây không phải mốc thời gian lịch sử.`
      : mode === 'window'
        ? `Dòng lạc đoạn: “${correct}”. Bốn dòng nguồn của đoạn hiện ở dưới.`
        : `Đáp án: ${correct}`
  return base
}

export function createArenaRun(settings: ArenaSettings): {
  questions: ArenaQuestion[]
  unavailable: ArenaMode[]
  sourceCount: number
} {
  const modes = unique(settings.modes.filter(mode => isArenaMode(mode))).sort()
  const pool = arenaSource(settings)
  const random = randomFrom(`kieu-arena-v1:${arenaSettingsKey(settings)}:${settings.seed}`)
  const byMode = new Map(
    modes.map(mode => {
      const questions: ArenaQuestion[] = []
      for (const pair of shuffled(pool, random)) {
        const question = makeQuestion(mode, pair, pool, random)
        if (question) questions.push(question)
        if (questions.length >= settings.length) break
      }
      return [mode, questions] as const
    })
  )
  const unavailable = modes.filter(mode => !byMode.get(mode)?.length)
  const active = shuffled(
    modes.filter(mode => !unavailable.includes(mode)),
    random
  )
  const questions: ArenaQuestion[] = []
  // Every selected, available mechanic appears before the playlist repeats.
  for (let round = 0; questions.length < settings.length && active.length; round++) {
    let added = false
    for (const mode of active) {
      const candidate = byMode.get(mode)?.[round]
      if (candidate && questions.length < settings.length) {
        questions.push(candidate)
        added = true
      }
    }
    if (!added) break
  }
  return { questions, unavailable, sourceCount: pool.length }
}

export function arenaSettingsKey(settings: ArenaSettings): string {
  return [
    unique(settings.modes).sort().join(','),
    settings.length,
    settings.from,
    settings.to,
    settings.savedOnly
      ? unique(settings.savedIds)
          .sort((a, b) => a - b)
          .join(',')
      : 'all',
    settings.secondChance ? 'two' : 'one',
  ].join('|')
}

export function arenaDailySeed(date: Date): string {
  return `daily:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function arenaCalibration(answers: ArenaAnswer[]) {
  return ([50, 75, 100] as const).map(confidence => {
    const group = answers.filter(answer => answer.confidence === confidence)
    const correct = group.filter(answer => answer.firstCorrect).length
    return {
      confidence,
      total: group.length,
      correct,
      accuracy: group.length ? Math.round((correct * 100) / group.length) : null,
    }
  })
}
export function recordArenaBest(
  state: ArenaState,
  key: string,
  correct: number,
  total: number,
  at: string
): ArenaState {
  if (
    !Number.isInteger(correct) ||
    !Number.isInteger(total) ||
    total < 1 ||
    correct < 0 ||
    correct > total
  )
    return state
  const previous = state.best[key]
  if (previous && previous.correct / previous.total >= correct / total) return state
  return {
    version: 1,
    best: Object.fromEntries(
      [...Object.entries(state.best), [key, { correct, total, at }]].slice(-100)
    ),
  }
}
export function parseArena(value: unknown): ArenaState | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Partial<ArenaState>
  if (data.version !== 1 || !data.best || typeof data.best !== 'object' || Array.isArray(data.best))
    return null
  const best: Record<string, ArenaBest> = {}
  for (const [key, item] of Object.entries(data.best).slice(-100)) {
    if (
      !item ||
      typeof item !== 'object' ||
      key.length > 15000 ||
      !Number.isInteger(item.correct) ||
      !Number.isInteger(item.total) ||
      item.total < 1 ||
      item.total > 10 ||
      item.correct < 0 ||
      item.correct > item.total ||
      typeof item.at !== 'string' ||
      !Number.isFinite(Date.parse(item.at))
    )
      return null
    Object.defineProperty(best, key, {
      value: { correct: item.correct, total: item.total, at: item.at },
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }
  return { version: 1, best }
}
export function arenaExport(
  settings: ArenaSettings,
  questions: ArenaQuestion[],
  answers: ArenaAnswer[]
): string {
  const score = answers.filter(answer => answer.firstCorrect).length
  const header = [
    'SỔ LUYỆN KIỀU · ĐẤU TRƯỜNG CHỮ',
    `Hạt giống: ${settings.seed}`,
    `Đúng lần đầu: ${score}/${questions.length}`,
  ].join('\n')
  const entries = questions.map((question, index) => {
    const answer = answers[index]
    const choice = question.choices.find(choice => choice.id === answer?.choice)?.text ?? 'Bỏ qua'
    const result = answer?.firstCorrect ? 'Đúng lần đầu' : 'Chưa đúng lần đầu'
    return [
      `${index + 1}. ${arenaModes[question.mode].title}`,
      question.prompt,
      question.context.join('\n'),
      `Bạn chọn: ${choice}`,
      `Tự tin: ${answer?.confidence ?? 0}% · ${answer?.attempts ?? 0} lần thử · ${result}`,
      question.explanation,
      passageText(question.passage),
    ].join('\n')
  })
  return `${header}\n\n${entries.join('\n\n')}`
}
