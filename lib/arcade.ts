import { couplets, normalize, words, type Verse } from './kieu'

export const arcadeModes = {
  'word-order': {
    title: 'Dệt lại câu thơ',
    description: 'Xếp từng chữ để khôi phục một câu lục.',
    instruction: 'Chọn các chữ theo thứ tự. Chọn chữ đã xếp để gỡ và xếp lại.',
    category: 'Sắp xếp',
  },
  'double-blank': {
    title: 'Hai chữ bỏ ngỏ',
    description: 'Điền hai khoảng trống theo đúng thứ tự.',
    instruction: 'Chọn chữ cho ô ① trước, rồi ô ②. Chọn lại để gỡ.',
    category: 'Nhớ chữ',
  },
  'previous-verse': {
    title: 'Tìm câu đi trước',
    description: 'Từ câu bát, nhớ lại câu lục mở đầu.',
    instruction: 'Chọn câu lục đứng ngay trước câu bát này trong bản văn.',
    category: 'Kết nối',
  },
  'true-verse': {
    title: 'Nguyên văn hay đổi chữ?',
    description: 'Nhận ra một câu thơ đã bị thay một chữ.',
    instruction: 'Câu hiển thị giống nguyên văn, hay đã bị thay một chữ?',
    category: 'Quan sát',
  },
  'syllable-count': {
    title: 'Nhịp sáu, nhịp tám',
    description: 'Phân biệt câu lục và câu bát qua số tiếng.',
    instruction: 'Đếm các tiếng trong câu thơ và chọn sáu hoặc tám.',
    category: 'Nhịp thơ',
  },
  'changed-word': {
    title: 'Thám tử câu thơ',
    description: 'Chỉ ra đúng vị trí chữ đã bị thay.',
    instruction: 'Một chữ trong câu đã bị đổi. Chọn vị trí chữ đó.',
    category: 'Quan sát',
  },
  initials: {
    title: 'Dấu chữ đầu',
    description: 'Giải câu thơ từ các chữ cái mở đầu.',
    instruction: 'Mỗi chữ cái gợi một tiếng. Chọn câu thơ khớp dãy chữ này.',
    category: 'Giải mã',
  },
  'typed-word': {
    title: 'Tự tay điền chữ',
    description: 'Gõ chữ còn thiếu mà không có đáp án gợi sẵn.',
    instruction: 'Gõ chữ còn thiếu. Có thể gõ không dấu, không phân biệt hoa thường.',
    category: 'Nhớ chữ',
  },
  'pair-match': {
    title: 'Ba cặp tri âm',
    description: 'Ghép ba câu lục với ba câu bát tương ứng.',
    instruction: 'Với mỗi câu lục, chọn câu bát đi cùng. Mỗi câu bát dùng một lần.',
    category: 'Kết nối',
  },
  recall: {
    title: 'Đọc, che, nhớ',
    description: 'Đọc một câu, tự che rồi viết lại từ trí nhớ.',
    instruction: 'Đọc thong thả, nhấn che câu rồi gõ lại. Không cần dấu hay dấu câu.',
    category: 'Hồi tưởng',
  },
} as const

export type ArcadeMode = keyof typeof arcadeModes
export const isArcadeMode = (value: string): value is ArcadeMode =>
  Object.hasOwn(arcadeModes, value)
export const ARCADE_ROUNDS = 5
export type ArcadeChoice = { id: string; text: string }
export type ArcadeQuestion = {
  mode: ArcadeMode
  prompt: string
  choices: ArcadeChoice[]
  answer: string[]
  passage: Verse[]
  masteryIds: number[]
  hint: string
  explanation: string
  left?: Verse[]
  memory?: string
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
const lower = (text: string) => text.normalize('NFC').toLocaleLowerCase('vi')
export const normalizeArcadeAnswer = (text: string) =>
  normalize(words(text.normalize('NFC')).join(' '))
const vocabulary = [...new Set(couplets.flatMap(pair => words(pair[0].text).map(lower)))]
const validPairs = couplets.filter(pair => new Set(words(pair[0].text).map(lower)).size > 1)
const firstLetters = (text: string) =>
  words(text)
    .map(word => word[0].toLocaleUpperCase('vi'))
    .join(' · ')
function replaceWords(text: string, replacements: Map<number, string>) {
  let index = 0
  return text.replace(/[\p{L}]+/gu, word => replacements.get(index++) ?? word)
}
function lineChoices(answer: string, random: () => number, initials = false) {
  const alternatives = [...new Set(validPairs.map(pair => pair[0].text))].filter(
    text => text !== answer && (!initials || firstLetters(text) !== firstLetters(answer))
  )
  return shuffle([answer, ...shuffle(alternatives, random).slice(0, 3)], random).map(text => ({
    id: text,
    text,
  }))
}

export function createArcadeQuestions(mode: ArcadeMode, seed: string): ArcadeQuestion[] {
  const random = randomFrom(`kieu-arcade-v1:${mode}:${seed}`)
  const pool = shuffle(validPairs, random)
  // Matching uses fifteen distinct source pairs; every other mode uses five.
  return Array.from({ length: ARCADE_ROUNDS }, (_, round) => {
    const pair = pool[round * (mode === 'pair-match' ? 3 : 1)]
    const tokens = words(pair[0].text)
    const position = Math.floor(random() * tokens.length)
    const replacement = shuffle(
      vocabulary.filter(word => lower(tokens[position]) !== word),
      random
    )[0]
    const base: ArcadeQuestion = {
      mode,
      prompt: pair[0].text,
      choices: [],
      answer: [],
      passage: pair,
      masteryIds: [pair[0].id],
      hint: `Câu bát đi cùng: “${pair[1].text}”`,
      explanation: `Nguyên văn: “${pair[0].text}”`,
    }
    switch (mode) {
      case 'word-order': {
        const choices = tokens.map((text, index) => ({ id: String(index), text }))
        base.choices = shuffle(choices, random)
        if (base.choices.every((choice, index) => choice.text === tokens[index]))
          base.choices.push(base.choices.shift()!)
        base.answer = choices.map(choice => choice.id)
        base.prompt = 'Dệt sáu chữ thành một câu lục.'
        base.hint = `Hai chữ đầu: “${tokens.slice(0, 2).join(' ')}”.`
        break
      }
      case 'double-blank': {
        const second = shuffle(
          tokens
            .map((_, index) => index)
            .filter(index => lower(tokens[index]) !== lower(tokens[position])),
          random
        )[0]
        const positions = [position, second].sort((a, b) => a - b)
        base.answer = positions.map(index => tokens[index])
        base.prompt = replaceWords(
          pair[0].text,
          new Map(positions.map((index, i) => [index, i === 0 ? '① _____' : '② _____']))
        )
        const distractors = shuffle(
          vocabulary.filter(word => !base.answer.map(lower).includes(word)),
          random
        ).slice(0, 3)
        base.choices = shuffle([...base.answer, ...distractors], random).map(text => ({
          id: text,
          text,
        }))
        base.hint = `Hai chữ cần tìm bắt đầu bằng ${base.answer.map(word => `“${word[0]}”`).join(' và ')}.`
        break
      }
      case 'previous-verse':
        base.prompt = pair[1].text
        base.answer = [pair[0].text]
        base.choices = lineChoices(pair[0].text, random)
        base.hint = `Câu lục bắt đầu bằng “${tokens.slice(0, 2).join(' ')}”.`
        break
      case 'true-verse': {
        const authentic = random() < 0.5
        base.prompt = authentic
          ? pair[0].text
          : replaceWords(pair[0].text, new Map([[position, replacement]]))
        base.answer = [authentic ? 'original' : 'altered']
        base.choices = [
          { id: 'original', text: 'Đúng nguyên văn' },
          { id: 'altered', text: 'Đã đổi một chữ' },
        ]
        break
      }
      case 'syllable-count': {
        const verse = pair[random() < 0.5 ? 0 : 1]
        base.prompt = verse.text
        base.masteryIds = [verse.id]
        base.answer = [String(words(verse.text).length)]
        base.choices = [
          { id: '6', text: '6 tiếng · câu lục' },
          { id: '8', text: '8 tiếng · câu bát' },
        ]
        base.hint = words(verse.text)
          .map((word, index) => `${index + 1}. ${word}`)
          .join(' / ')
        base.explanation = `Câu này có ${base.answer[0]} tiếng: ${words(verse.text).join(' / ')}.`
        break
      }
      case 'changed-word':
        base.prompt = 'Tìm chữ đã bị thay trong câu dưới đây.'
        base.choices = tokens.map((text, index) => ({
          id: String(index),
          text: index === position ? replacement : text,
        }))
        base.answer = [String(position)]
        base.hint = `Chữ nguyên văn ở vị trí cần tìm bắt đầu bằng “${tokens[position][0]}”.`
        base.explanation = `Chữ thứ ${position + 1} phải là “${tokens[position]}”. Nguyên văn: “${pair[0].text}”`
        break
      case 'initials':
        base.prompt = firstLetters(pair[0].text)
        base.answer = [pair[0].text]
        base.choices = lineChoices(pair[0].text, random, true)
        break
      case 'typed-word':
        base.prompt = replaceWords(pair[0].text, new Map([[position, '_____']]))
        base.answer = [tokens[position]]
        base.hint = `Chữ cần tìm bắt đầu bằng “${tokens[position][0]}”.`
        break
      case 'pair-match': {
        // Reject duplicate displayed lines to keep every match unambiguous.
        const pairs: Verse[][] = []
        for (let offset = 0; pairs.length < 3; offset++) {
          const candidate = pool[(round * 3 + offset) % pool.length]
          if (
            !pairs.some(
              selected =>
                selected[0].text === candidate[0].text || selected[1].text === candidate[1].text
            )
          )
            pairs.push(candidate)
        }
        base.prompt = 'Ghép ba cặp lục bát.'
        base.left = pairs.map(item => item[0])
        base.passage = pairs.flat()
        base.masteryIds = base.passage.map(verse => verse.id)
        base.answer = pairs.map(item => String(item[1].id))
        base.choices = shuffle(
          pairs.map(item => ({ id: String(item[1].id), text: item[1].text })),
          random
        )
        base.hint = `Cặp đầu: “${pairs[0][0].text} / ${pairs[0][1].text}”`
        base.explanation = 'Mỗi câu lục đi cùng câu bát ngay sau nó trong bản văn.'
        break
      }
      case 'recall':
        base.prompt = 'Viết lại câu thơ bạn vừa đọc.'
        base.memory = pair[0].text
        base.answer = [pair[0].text]
        base.hint = `Các chữ đầu: ${firstLetters(pair[0].text)}.`
        break
    }
    return base
  })
}

export function isArcadeCorrect(question: ArcadeQuestion, selection: string[]) {
  if (selection.length !== question.answer.length) return false
  if (question.mode === 'typed-word' || question.mode === 'recall')
    return normalizeArcadeAnswer(selection[0]) === normalizeArcadeAnswer(question.answer[0])
  if (question.mode === 'word-order') {
    if (new Set(selection).size !== selection.length) return false
    const text = (id: string) => question.choices.find(choice => choice.id === id)?.text
    return selection.every(
      (id, index) => text(id) !== undefined && text(id) === text(question.answer[index])
    )
  }
  return selection.every((answer, index) => answer === question.answer[index])
}

export function arcadeAnswerText(question: ArcadeQuestion, selection: string[]) {
  if (!selection.length || selection.every(value => !value.trim())) return 'Đã bỏ qua'
  return selection
    .map(id => question.choices.find(choice => choice.id === id)?.text ?? id)
    .join(' · ')
}

export function arcadeRank(correct: number, total: number, hints: number) {
  if (correct === total && hints === 0) return 'Tri âm trọn vẹn'
  if (correct >= total * 0.8) return 'Vững lời thơ'
  if (correct >= total * 0.6) return 'Đang nở hoa'
  return 'Mỗi lần chơi, thêm một lần nhớ'
}
