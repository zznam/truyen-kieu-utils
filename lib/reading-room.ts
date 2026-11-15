import { normalize, passageText, verses, words, type Verse } from './kieu'

export const READING_ROOM_KEY = 'kieu-reading-room-v1'
export const MAX_EXCERPT_LINES = 40
export const MAX_READING_ENTRIES = 60
export const MAX_READING_BACKUP_BYTES = 500_000
export type ReadingRange = { start: number; end: number }
export type ReadingEntry = ReadingRange & {
  title: string
  note: string
  cursor: number
  status: 'queued' | 'reading' | 'done'
}
export type ReadingRoomState = { version: 1; entries: ReadingEntry[] }
export type MemoryMode = 'visible' | 'endings' | 'initials' | 'hidden'

const indices = new Map(verses.map((verse, index) => [verse.id, index]))

export function createReadingRoom(): ReadingRoomState {
  return { version: 1, entries: [] }
}

/** Source IDs belong to this edition; slice by position, never by verse parity. */
export function excerpt(range: ReadingRange): Verse[] {
  const start = indices.get(range.start)
  const end = indices.get(range.end)
  if (start === undefined || end === undefined || end < start || end - start >= MAX_EXCERPT_LINES)
    return []
  return verses.slice(start, end + 1)
}

export function excerptContext(
  range: ReadingRange,
  count: number
): { before: Verse[]; after: Verse[] } {
  const selected = excerpt(range)
  if (!selected.length || !Number.isInteger(count) || count < 0 || count > 8)
    return { before: [], after: [] }
  const start = indices.get(range.start)!
  const end = indices.get(range.end)!
  return {
    before: verses.slice(Math.max(0, start - count), start),
    after: verses.slice(end + 1, end + 1 + count),
  }
}

export function rangeKey(range: ReadingRange): string {
  return `${range.start}:${range.end}`
}

export function readingEntryMatches(entry: ReadingEntry, query: string): boolean {
  const term = normalize(query.trim())
  if (!term) return true
  // A line lookup should find an excerpt containing that line, including its interior.
  if (/^\d+$/.test(term)) return excerpt(entry).some(line => line.id === Number(term))
  return normalize(`${entry.title} ${entry.note}`).includes(term)
}

export function memoryText(text: string, mode: MemoryMode): string {
  const normalized = text.normalize('NFC')
  const tokens = words(normalized)
  let position = 0
  return normalized.replace(/[\p{L}]+/gu, token => {
    position += 1
    if (mode === 'visible') return token
    if (mode === 'initials') return `${token[0]}…`
    if (mode === 'endings' && position <= tokens.length - 2) return token
    return '____'
  })
}

function exactWord(value: string): string {
  return value.normalize('NFC').toLocaleLowerCase('vi')
}

export type RecallToken = {
  kind: 'correct' | 'changed' | 'missing' | 'extra'
  expected: string
  actual: string
}
export type RecallResult = { tokens: RecallToken[]; correct: number; total: number; exact: boolean }

/** Align insertions and omissions so one forgotten word does not mark every later word wrong. */
export function checkRecall(source: string, answer: string): RecallResult {
  const expected = words(source.normalize('NFC')).slice(0, 400)
  const actual = words(answer.normalize('NFC')).slice(0, 400)
  const cost = Array.from({ length: expected.length + 1 }, () => new Uint16Array(actual.length + 1))
  for (let i = 0; i <= expected.length; i++) cost[i][0] = i
  for (let j = 0; j <= actual.length; j++) cost[0][j] = j
  for (let i = 1; i <= expected.length; i++) {
    for (let j = 1; j <= actual.length; j++) {
      const same = exactWord(expected[i - 1]) === exactWord(actual[j - 1])
      cost[i][j] = Math.min(
        cost[i - 1][j] + 1,
        cost[i][j - 1] + 1,
        cost[i - 1][j - 1] + (same ? 0 : 1)
      )
    }
  }
  const tokens: RecallToken[] = []
  let i = expected.length
  let j = actual.length
  while (i || j) {
    const same = i > 0 && j > 0 && exactWord(expected[i - 1]) === exactWord(actual[j - 1])
    if (i && j && cost[i][j] === cost[i - 1][j - 1] + (same ? 0 : 1)) {
      tokens.push({
        kind: same ? 'correct' : 'changed',
        expected: expected[--i],
        actual: actual[--j],
      })
    } else if (i && cost[i][j] === cost[i - 1][j] + 1) {
      tokens.push({ kind: 'missing', expected: expected[--i], actual: '' })
    } else {
      tokens.push({ kind: 'extra', expected: '', actual: actual[--j] })
    }
  }
  tokens.reverse()
  return {
    tokens,
    correct: tokens.filter(token => token.kind === 'correct').length,
    total: expected.length,
    exact: expected.length > 0 && cost[expected.length][actual.length] === 0,
  }
}

export function sharedVocabulary(first: Verse[], second: Verse[]): string[] {
  const other = new Set(second.flatMap(verse => words(exactWord(verse.text))))
  return [...new Set(first.flatMap(verse => words(exactWord(verse.text))))].filter(word =>
    other.has(word)
  )
}

export function concordance(query: string, mode: 'word' | 'loose'): Verse[] {
  const term = query.trim().normalize('NFC')
  if (!term || term.length > 100) return []
  if (mode === 'word')
    return verses.filter(verse => words(exactWord(verse.text)).includes(exactWord(term)))
  const loose = normalize(term)
  return verses.filter(verse => normalize(verse.text).includes(loose))
}

export function parseReadingRoom(value: unknown): ReadingRoomState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = value as Record<string, unknown>
  if (
    data.version !== 1 ||
    !Array.isArray(data.entries) ||
    data.entries.length > MAX_READING_ENTRIES
  )
    return null
  const entries: ReadingEntry[] = []
  const keys = new Set<string>()
  for (const raw of data.entries) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const entry = raw as ReadingEntry
    const selected = excerpt(entry)
    if (
      !selected.length ||
      typeof entry.title !== 'string' ||
      !entry.title.trim() ||
      entry.title.length > 80 ||
      typeof entry.note !== 'string' ||
      entry.note.length > 2000 ||
      !selected.some(verse => verse.id === entry.cursor) ||
      !['queued', 'reading', 'done'].includes(entry.status) ||
      keys.has(rangeKey(entry))
    )
      return null
    keys.add(rangeKey(entry))
    entries.push({
      start: entry.start,
      end: entry.end,
      title: entry.title.trim(),
      note: entry.note,
      cursor: entry.cursor,
      status: entry.status,
    })
  }
  return { version: 1, entries }
}

export function addReadingEntry(
  state: ReadingRoomState,
  range: ReadingRange,
  title: string
): ReadingRoomState {
  if (
    !excerpt(range).length ||
    !title.trim() ||
    title.trim().length > 80 ||
    state.entries.length >= MAX_READING_ENTRIES ||
    state.entries.some(entry => rangeKey(entry) === rangeKey(range))
  )
    return state
  return {
    ...state,
    entries: [
      ...state.entries,
      { ...range, title: title.trim(), note: '', cursor: range.start, status: 'queued' },
    ],
  }
}

export function editReadingEntry(
  state: ReadingRoomState,
  range: ReadingRange,
  changes: Partial<Pick<ReadingEntry, 'title' | 'note' | 'cursor' | 'status'>>
): ReadingRoomState {
  const next = {
    ...state,
    entries: state.entries.map(entry =>
      rangeKey(entry) === rangeKey(range) ? { ...entry, ...changes } : entry
    ),
  }
  return parseReadingRoom(next) ?? state
}

export function moveReadingEntry(
  state: ReadingRoomState,
  range: ReadingRange,
  direction: -1 | 1
): ReadingRoomState {
  const index = state.entries.findIndex(entry => rangeKey(entry) === rangeKey(range))
  const next = index + direction
  if (index < 0 || next < 0 || next >= state.entries.length) return state
  const entries = [...state.entries]
  ;[entries[index], entries[next]] = [entries[next], entries[index]]
  return { ...state, entries }
}

/** Import adds new excerpts only; existing notes, order and reading positions win conflicts. */
export function mergeReadingRoom(
  current: ReadingRoomState,
  incoming: ReadingRoomState
): ReadingRoomState | null {
  const existing = new Set(current.entries.map(rangeKey))
  const additions = incoming.entries.filter(entry => !existing.has(rangeKey(entry)))
  if (current.entries.length + additions.length > MAX_READING_ENTRIES) return null
  return { version: 1, entries: [...current.entries, ...additions] }
}

export function readingRoomText(state: ReadingRoomState): string {
  const labels = { queued: 'Chờ đọc', reading: 'Đang đọc', done: 'Đã đọc' }
  return [
    'SỔ ĐỌC KIỀU',
    'Ghi chép cá nhân · Số dòng thuộc bản văn trong ứng dụng.',
    ...state.entries.map(
      entry =>
        `\n${entry.title}\n${labels[entry.status]} · Đang ở dòng ${entry.cursor}\n${passageText(excerpt(entry))}${entry.note ? `\nCảm nhận cá nhân: ${entry.note}` : ''}`
    ),
  ].join('\n')
}
