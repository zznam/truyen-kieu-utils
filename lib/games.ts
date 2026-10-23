import { couplets, verses, words, type Verse } from './kieu'

export const gameModes = {
  missing: {
    title: 'Điền chữ còn thiếu',
    description: 'Một chữ bỏ ngỏ. Bạn có nhớ lời thơ?',
    label: 'NHỚ CHỮ',
    instruction: 'Chọn từ đúng để hoàn thành câu thơ.',
  },
  continuation: {
    title: 'Nối câu Kiều',
    description: 'Từ câu lục, tìm câu bát đi cùng.',
    label: 'NỐI VẦN',
    instruction: 'Chọn câu thơ tiếp theo trong bản văn.',
  },
  order: {
    title: 'Xếp lại lời thơ',
    description: 'Đưa bốn câu thơ về đúng thứ tự.',
    label: 'XẾP CÂU',
    instruction: 'Chọn từng câu theo thứ tự. Chọn câu đã xếp để gỡ.',
  },
} as const
export type GameMode = keyof typeof gameModes
export type PlayMode = GameMode | 'daily'
export const ROUND_COUNT = 5
export const isPlayMode = (value: string): value is PlayMode =>
  value === 'daily' || Object.hasOwn(gameModes, value)
export type Question = {
  mode: GameMode
  prompt: string
  options: string[]
  answer: string[]
  passage: Verse[]
  hint: string
}

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function randomFrom(seed: string) {
  let state = 2166136261
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}
function shuffle<T>(items: readonly T[], random: () => number) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
const orderedPassages = couplets.flatMap(pair => {
  const start = verses.findIndex(verse => verse.id === pair[0].id)
  const passage = verses.slice(start, start + 4)
  return passage.length === 4 &&
    words(passage[2].text).length === 6 &&
    words(passage[3].text).length === 8 &&
    new Set(passage.map(verse => verse.text)).size === 4
    ? [passage]
    : []
})
const vocabulary = [
  ...new Set(
    couplets.flatMap(pair => words(pair[0].text).map(word => word.toLocaleLowerCase('vi')))
  ),
]

export function createQuestions(mode: PlayMode, seed: string): Question[] {
  const random = randomFrom(`kieu-games-v1:${mode}:${seed}`)
  const pairs = shuffle(couplets, random).slice(0, ROUND_COUNT)
  const pairIds = new Set(pairs.map(pair => pair[0].id))
  const passages = shuffle(
    orderedPassages.filter(passage => !pairIds.has(passage[0].id)),
    random
  ).slice(0, ROUND_COUNT)
  return pairs.map((pair, index) => {
    const kind =
      mode === 'daily' ? (['missing', 'continuation', 'order'] as const)[index % 3] : mode
    return makeQuestion(kind, kind === 'order' ? passages[index] : pair, random)
  })
}
function makeQuestion(kind: GameMode, source: Verse[], random: () => number): Question {
  if (kind === 'order') {
    const passage = source
    const answer = passage.map(verse => verse.text)
    const options = shuffle(answer, random)
    if (options.every((text, i) => text === answer[i])) options.push(options.shift()!)
    return {
      mode: kind,
      prompt: 'Bốn câu thơ, một mạch kể.',
      options,
      answer,
      passage,
      hint: `Câu mở đầu: “${answer[0]}”`,
    }
  }
  if (kind === 'continuation') {
    const answer = source[1].text
    const alternatives = [...new Set(couplets.map(item => item[1].text))].filter(
      text => text !== answer
    )
    return {
      mode: kind,
      prompt: source[0].text,
      options: shuffle([answer, ...shuffle(alternatives, random).slice(0, 3)], random),
      answer: [answer],
      passage: source,
      hint: `Câu tiếp bắt đầu bằng “${words(answer).slice(0, 2).join(' ')}”.`,
    }
  }
  const matches = [...source[0].text.matchAll(/[\p{L}]+/gu)]
  const missing = matches[matches.length - 1]
  const answer = missing[0]
  return {
    mode: kind,
    prompt:
      `${source[0].text.slice(0, missing.index)}_____` +
      source[0].text.slice(missing.index! + missing[0].length),
    options: shuffle(
      [
        answer,
        ...shuffle(
          vocabulary.filter(word => word !== answer.toLocaleLowerCase('vi')),
          random
        ).slice(0, 3),
      ],
      random
    ),
    answer: [answer],
    passage: source,
    hint: `Từ cần tìm bắt đầu bằng “${answer[0]}”. Câu tiếp: “${source[1].text}”`,
  }
}
export function createReviewQuestion(item: { mode: GameMode; verseId: number }): Question | null {
  const source =
    item.mode === 'order'
      ? orderedPassages.find(passage => passage[0].id === item.verseId)
      : couplets.find(pair => pair[0].id === item.verseId)
  if (!source || !Object.hasOwn(gameModes, item.mode)) return null
  return makeQuestion(item.mode, source, randomFrom(`review:${item.mode}:${item.verseId}`))
}
export function isCorrect(question: Question, selection: string[]) {
  return (
    selection.length === question.answer.length &&
    selection.every((text, i) => text === question.answer[i])
  )
}
export const answerPoints = (correct: boolean, hinted: boolean) => (correct ? (hinted ? 5 : 10) : 0)
