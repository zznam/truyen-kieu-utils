import { rhymeKey } from '../app/services/lay_kieu'
import { getPassage, normalize, topics, verses, words, type Verse } from './kieu'

export const WORKSHOP_KEY = 'kieu-workshop-v1'
export const MAX_WORKSHOP_DRAFTS = 20
export const MAX_WORKSHOP_STANZAS = 16
export const MAX_WORKSHOP_BACKUP_BYTES = 250_000

export type WorkshopStanza = { id: string; sixId: number; eightId: number; locked: boolean }
export type WorkshopDraft = {
  id: string
  title: string
  note: string
  stanzas: WorkshopStanza[]
  revision: number
}
export type WorkshopState = { version: 1; drafts: WorkshopDraft[] }
export type WorkshopOptions = {
  query?: string
  topic?: string
  savedOnly?: boolean
  savedIds?: number[]
  excludeUsed?: boolean
}

const byId = new Map(verses.map(verse => [verse.id, verse]))
const syllables = new Map(verses.map(verse => [verse.id, words(verse.text.normalize('NFC'))]))
const sixLines = verses.filter(verse => syllables.get(verse.id)!.length === 6)
const eightLines = verses.filter(verse => syllables.get(verse.id)!.length === 8)

export function createWorkshopState(): WorkshopState {
  return { version: 1, drafts: [] }
}

function validId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 80 &&
    value.trim().length > 0 &&
    !/[\u0000-\u001f]/.test(value)
  )
}

export function workshopRhyme(
  pair: Pick<WorkshopStanza, 'sixId' | 'eightId'>
): { sixWord: string; eightWord: string; key: string } | null {
  const six = syllables.get(pair.sixId)
  const eight = syllables.get(pair.eightId)
  if (six?.length !== 6 || eight?.length !== 8) return null
  const key = rhymeKey(six[5])
  if (!key || key !== rhymeKey(eight[5])) return null
  return { sixWord: six[5], eightWord: eight[5], key }
}

export function workshopPair(sixId: number, eightId: number, id: string): WorkshopStanza | null {
  if (!validId(id) || !workshopRhyme({ sixId, eightId })) return null
  return { id, sixId, eightId, locked: false }
}

function parseStanzas(value: unknown): WorkshopStanza[] | null {
  if (!Array.isArray(value) || value.length > MAX_WORKSHOP_STANZAS) return null
  const ids = new Set<string>()
  const result: WorkshopStanza[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const stanza = raw as WorkshopStanza
    const pair = workshopPair(stanza.sixId, stanza.eightId, stanza.id)
    if (!pair || typeof stanza.locked !== 'boolean' || ids.has(pair.id)) return null
    ids.add(pair.id)
    result.push({ ...pair, locked: stanza.locked })
  }
  return result
}

export function parseWorkshopState(value: unknown): WorkshopState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = value as Record<string, unknown>
  if (data.version !== 1 || !Array.isArray(data.drafts) || data.drafts.length > MAX_WORKSHOP_DRAFTS)
    return null
  const ids = new Set<string>()
  const drafts: WorkshopDraft[] = []
  for (const raw of data.drafts) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const draft = raw as WorkshopDraft
    if (
      !validId(draft.id) ||
      ids.has(draft.id) ||
      typeof draft.title !== 'string' ||
      !draft.title.trim() ||
      draft.title.length > 80 ||
      typeof draft.note !== 'string' ||
      draft.note.length > 2000 ||
      !Number.isSafeInteger(draft.revision) ||
      draft.revision < 0
    )
      return null
    const stanzas = parseStanzas(draft.stanzas)
    if (!stanzas) return null
    ids.add(draft.id)
    drafts.push({
      id: draft.id,
      title: draft.title.trim(),
      note: draft.note,
      stanzas,
      revision: draft.revision,
    })
  }
  return { version: 1, drafts }
}

function filterSources(lines: Verse[], options: WorkshopOptions): Verse[] {
  const query = normalize((options.query ?? '').trim())
  const topic = topics.find(item => item.id === (options.topic ?? 'all'))
  if (!topic) return []
  const saved = options.savedOnly
    ? new Set((options.savedIds ?? []).flatMap(id => getPassage(id).map(line => line.id)))
    : null
  return lines.filter(line => {
    if (saved && !saved.has(line.id)) return false
    if (
      query &&
      (/^\d+$/.test(query) ? line.id !== Number(query) : !normalize(line.text).includes(query))
    )
      return false
    if (
      topic.id !== 'all' &&
      !topic.terms.some(term =>
        syllables.get(line.id)!.some(word => word.toLocaleLowerCase('vi') === term)
      )
    )
      return false
    return true
  })
}

export function workshopAnchors(options: WorkshopOptions = {}): Verse[] {
  return filterSources(sixLines, options)
}

export function workshopMatches(sixId: number, options: WorkshopOptions = {}): Verse[] {
  const tokens = syllables.get(sixId)
  if (tokens?.length !== 6) return []
  const key = rhymeKey(tokens[5])
  if (!key) return []
  return filterSources(eightLines, options).filter(
    line => rhymeKey(syllables.get(line.id)![5]) === key
  )
}

function seedHash(seed: string): number {
  let hash = 2166136261
  for (const character of seed.normalize('NFC'))
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return hash >>> 0
}

function seededRandom(seed: string): () => number {
  let value = seedHash(seed)
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
    const previous = result[index]
    result[index] = result[other]
    result[other] = previous
  }
  return result
}

type RhymeGroup = { six: Verse[]; eight: Verse[] }
function sourceGroups(
  options: WorkshopOptions,
  used: Set<number>,
  random: () => number
): RhymeGroup[] {
  const groups = new Map<string, RhymeGroup>()
  for (const line of filterSources(sixLines, options)) {
    if (used.has(line.id)) continue
    const key = rhymeKey(syllables.get(line.id)![5])
    if (!key) continue
    const group = groups.get(key) ?? { six: [], eight: [] }
    group.six.push(line)
    groups.set(key, group)
  }
  for (const line of filterSources(eightLines, options)) {
    if (used.has(line.id)) continue
    groups.get(rhymeKey(syllables.get(line.id)![5]))?.eight.push(line)
  }
  return shuffled(
    [...groups.values()].filter(group => group.eight.length > 0),
    random
  ).map(group => ({ six: shuffled(group.six, random), eight: shuffled(group.eight, random) }))
}

function validSeed(seed: string): boolean {
  return typeof seed === 'string' && seed.trim().length > 0 && seed.length <= 120
}

function generatedId(seed: string, index: number, occupied: Set<string>): string {
  const base = `generated-${seedHash(seed).toString(16)}-${index}`
  let candidate = base
  let suffix = 1
  while (occupied.has(candidate)) candidate = `${base}-${suffix++}`
  occupied.add(candidate)
  return candidate
}

export function generateWorkshopStanzas(
  count: number,
  seed: string,
  options: WorkshopOptions = {},
  current: WorkshopStanza[] = []
): WorkshopStanza[] | null {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > MAX_WORKSHOP_STANZAS ||
    !validSeed(seed) ||
    !parseStanzas(current)
  )
    return null
  if (current.some((pair, index) => pair.locked && index >= count)) return null
  const unique = options.excludeUsed !== false
  const used = new Set<number>()
  const occupied = new Set<string>()
  for (const pair of current.filter(item => item.locked)) {
    if (unique && (used.has(pair.sixId) || used.has(pair.eightId))) return null
    if (unique) {
      used.add(pair.sixId)
      used.add(pair.eightId)
    }
    occupied.add(pair.id)
  }
  const random = seededRandom(seed)
  const groups = sourceGroups(options, used, random)
  const needed = count - current.filter(pair => pair.locked).length
  if (
    needed &&
    (!groups.length ||
      (unique &&
        groups.reduce((total, group) => total + Math.min(group.six.length, group.eight.length), 0) <
          needed))
  )
    return null
  const result: WorkshopStanza[] = []
  for (let index = 0; index < count; index++) {
    if (current[index]?.locked) {
      result.push({ ...current[index] })
      continue
    }
    const available = groups.filter(group => group.six.length && group.eight.length)
    const group = available[Math.floor(random() * available.length)]
    const six = unique ? group.six.pop()! : group.six[Math.floor(random() * group.six.length)]
    const eight = unique
      ? group.eight.pop()!
      : group.eight[Math.floor(random() * group.eight.length)]
    result.push({
      id: generatedId(seed, index, occupied),
      sixId: six.id,
      eightId: eight.id,
      locked: false,
    })
  }
  return result
}

export function replaceWorkshopStanza(
  current: WorkshopStanza[],
  index: number,
  seed: string,
  options: WorkshopOptions = {}
): WorkshopStanza[] | null {
  if (
    !parseStanzas(current) ||
    !Number.isInteger(index) ||
    !current[index] ||
    current[index].locked ||
    !validSeed(seed)
  )
    return null
  const target = current[index]
  const used = new Set<number>()
  if (options.excludeUsed !== false) {
    for (const [position, pair] of current.entries()) {
      if (position === index) continue
      if (used.has(pair.sixId) || used.has(pair.eightId)) return null
      used.add(pair.sixId)
      used.add(pair.eightId)
    }
  }
  const groups = sourceGroups(options, used, seededRandom(seed))
  for (const group of groups) {
    // Rhyme groups are complete bipartite pools, so a different first source or
    // second source suffices to find an alternative without a quadratic scan.
    const six = group.six.find(line => line.id !== target.sixId) ?? group.six[0]
    const eight = group.eight.find(line => line.id !== target.eightId) ?? group.eight[0]
    if (six.id === target.sixId && eight.id === target.eightId) continue
    return current.map((pair, position) =>
      position === index ? { ...pair, sixId: six.id, eightId: eight.id } : pair
    )
  }
  return null
}

export function moveWorkshopStanza(
  stanzas: WorkshopStanza[],
  id: string,
  direction: -1 | 1
): WorkshopStanza[] {
  const index = stanzas.findIndex(pair => pair.id === id)
  const next = index + direction
  if (index < 0 || next < 0 || next >= stanzas.length) return stanzas
  const result = [...stanzas]
  result[index] = stanzas[next]
  result[next] = stanzas[index]
  return result
}

export function saveWorkshopDraft(
  state: WorkshopState,
  draft: WorkshopDraft,
  expectedRevision: number | null
): WorkshopState | null {
  const parsed = parseWorkshopState({ version: 1, drafts: [draft] })
  if (!parsed) return null
  const current = state.drafts.find(item => item.id === draft.id)
  if (current) {
    if (current.revision !== expectedRevision || current.revision === Number.MAX_SAFE_INTEGER)
      return null
    const updated = { ...parsed.drafts[0], revision: current.revision + 1 }
    return { version: 1, drafts: state.drafts.map(item => (item.id === draft.id ? updated : item)) }
  }
  if (expectedRevision !== null || state.drafts.length >= MAX_WORKSHOP_DRAFTS) return null
  return { version: 1, drafts: [...state.drafts, { ...parsed.drafts[0], revision: 0 }] }
}

export function deleteWorkshopDraft(
  state: WorkshopState,
  id: string,
  expectedRevision: number
): WorkshopState {
  const current = state.drafts.find(item => item.id === id)
  if (!current || current.revision !== expectedRevision) return state
  return { ...state, drafts: state.drafts.filter(item => item.id !== id) }
}

export function mergeWorkshopState(
  local: WorkshopState,
  incoming: WorkshopState
): WorkshopState | null {
  const valid = parseWorkshopState(incoming)
  if (!valid) return null
  const ids = new Set(local.drafts.map(draft => draft.id))
  const additions = valid.drafts.filter(draft => !ids.has(draft.id))
  if (local.drafts.length + additions.length > MAX_WORKSHOP_DRAFTS) return null
  return { version: 1, drafts: [...local.drafts, ...additions] }
}

function markdownText(value: string): string {
  return value.replace(/([\\`*_{}\[\]<>#+.!|~-])/g, '\\$1')
}

export function workshopText(draft: WorkshopDraft, format: 'text' | 'markdown'): string {
  const markdown = format === 'markdown'
  const text = markdown ? markdownText : (value: string) => value
  const sections = [
    markdown ? `# ${text(draft.title)}` : draft.title,
    'Lẩy Kiều — bản ghép cá nhân từ câu thơ Nguyễn Du; thứ tự không phải nguyên tác.',
  ]
  for (const pair of draft.stanzas) {
    const six = byId.get(pair.sixId)
    const eight = byId.get(pair.eightId)
    if (!six || !eight || !workshopRhyme(pair)) continue
    sections.push(
      markdown ? `> ${text(six.text)}  \n> ${text(eight.text)}` : `${six.text}\n${eight.text}`
    )
    sections.push(
      `Nguồn: Nguyễn Du, Truyện Kiều (dòng ${pair.sixId} + ${pair.eightId}, bản văn trong ứng dụng).`
    )
  }
  if (draft.note) sections.push(`Ghi chú cá nhân: ${text(draft.note)}`)
  sections.push('Ghép theo vần chữ; chưa xác nhận đầy đủ luật thanh hay ý nghĩa.')
  return sections.join('\n\n')
}

export function encodeWorkshopShare(stanzas: WorkshopStanza[]): string {
  if (!stanzas.length || !parseStanzas(stanzas)) return ''
  return stanzas.map(pair => `${pair.sixId}-${pair.eightId}`).join(',')
}

export function decodeWorkshopShare(value: string): WorkshopStanza[] | null {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > 160 ||
    !/^\d{1,4}-\d{1,4}(,\d{1,4}-\d{1,4})*$/.test(value)
  )
    return null
  const parts = value.split(',')
  if (parts.length > MAX_WORKSHOP_STANZAS) return null
  const result: WorkshopStanza[] = []
  for (const [index, part] of parts.entries()) {
    const [sixId, eightId] = part.split('-').map(Number)
    const pair = workshopPair(sixId, eightId, `share-${index}`)
    if (!pair) return null
    result.push(pair)
  }
  return result
}
