import { getPassage, normalize, verses } from './kieu'

export const STUDIO_STORAGE_KEY = 'kieu-studio-v1'
export const STUDIO_MAX_DECKS = 40
export const STUDIO_MAX_CARDS = 500
export const studioRatings = ['again', 'hard', 'good', 'easy'] as const
export type StudioRating = (typeof studioRatings)[number]
export type StudioCounts = Record<StudioRating, number>
export type StudioCard = {
  verseId: number
  note: string
  tags: string[]
  favorite: boolean
  dueAt: number
  intervalDays: number
  reviews: number
}
export type StudioDeck = { id: string; name: string; cards: StudioCard[] }
export type StudioState = {
  version: 1
  decks: StudioDeck[]
  dailyCap: 5 | 10 | 20
  days: Record<string, StudioCounts>
}
export const studioRatingLabels: Record<StudioRating, string> = {
  again: 'Chưa nhớ',
  hard: 'Khó',
  good: 'Nhớ',
  easy: 'Dễ',
}
const validIds = new Set(verses.map(verse => verse.id))
const MILLISECONDS_PER_DAY = 86_400_000
const RETRY_DELAY_MS = 10 * 60 * 1000
const MAX_INTERVAL_DAYS = 365
const HISTORY_DAYS = 400
const reviewIntervals = {
  hard: { minimumDays: 1, multiplier: 1.2 },
  good: { minimumDays: 3, multiplier: 2 },
  easy: { minimumDays: 7, multiplier: 3 },
} satisfies Record<Exclude<StudioRating, 'again'>, { minimumDays: number; multiplier: number }>
export const emptyStudioCounts = (): StudioCounts => ({ again: 0, hard: 0, good: 0, easy: 0 })
export const createStudioState = (): StudioState => ({
  version: 1,
  decks: [],
  dailyCap: 10,
  days: {},
})
export function studioDay(now: number): string {
  const date = new Date(now)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export const studioCount = (counts: StudioCounts) =>
  studioRatings.reduce((sum, rating) => sum + counts[rating], 0)
export const studioStudiedToday = (state: StudioState, now: number) =>
  studioCount(state.days[studioDay(now)] ?? emptyStudioCounts())
export const studioRemaining = (state: StudioState, now: number) =>
  Math.max(0, state.dailyCap - studioStudiedToday(state, now))

export function studioTags(value: string): string[] {
  return [...new Set(value.split(',').map(tag => tag.trim().toLocaleLowerCase('vi').slice(0, 24)))]
    .filter(Boolean)
    .slice(0, 8)
}

function nonnegative(value: unknown, maximum: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(maximum, Math.max(0, value))
    : 0
}

export function parseStudioState(value: unknown): StudioState | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Partial<StudioState>
  if (data.version !== 1 || !Array.isArray(data.decks)) return null
  const seenDecks = new Set<string>()
  const decks = data.decks.slice(0, STUDIO_MAX_DECKS).flatMap(raw => {
    if (!raw || typeof raw !== 'object') return []
    const deck = raw as Partial<StudioDeck>
    if (
      typeof deck.id !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(deck.id) ||
      seenDecks.has(deck.id) ||
      typeof deck.name !== 'string' ||
      !deck.name.trim() ||
      !Array.isArray(deck.cards)
    )
      return []
    seenDecks.add(deck.id)
    const seenCards = new Set<number>()
    const cards = deck.cards.slice(0, STUDIO_MAX_CARDS).flatMap(rawCard => {
      if (!rawCard || typeof rawCard !== 'object') return []
      const card = rawCard as Partial<StudioCard>
      if (typeof card.verseId !== 'number' || !validIds.has(card.verseId)) return []
      const verseId = getPassage(card.verseId)[0].id
      if (seenCards.has(verseId)) return []
      seenCards.add(verseId)
      return [
        {
          verseId,
          note: typeof card.note === 'string' ? card.note.slice(0, 1000) : '',
          tags: Array.isArray(card.tags)
            ? studioTags(card.tags.filter(tag => typeof tag === 'string').join(','))
            : [],
          favorite: card.favorite === true,
          dueAt: nonnegative(card.dueAt, 8_640_000_000_000_000),
          intervalDays: nonnegative(card.intervalDays, MAX_INTERVAL_DAYS),
          reviews: Math.floor(nonnegative(card.reviews, 1_000_000)),
        },
      ]
    })
    return [{ id: deck.id, name: deck.name.trim().slice(0, 60), cards }]
  })
  const days: Record<string, StudioCounts> = {}
  if (data.days && typeof data.days === 'object' && !Array.isArray(data.days)) {
    for (const [day, raw] of Object.entries(data.days).sort().slice(-HISTORY_DAYS)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !raw || typeof raw !== 'object') continue
      const counts = raw as Partial<StudioCounts>
      days[day] = Object.fromEntries(
        studioRatings.map(rating => [rating, Math.floor(nonnegative(counts[rating], 1_000_000))])
      ) as StudioCounts
    }
  }
  return {
    version: 1,
    decks,
    dailyCap: data.dailyCap === 5 || data.dailyCap === 20 ? data.dailyCap : 10,
    days,
  }
}

export function studioCreateDeck(state: StudioState, id: string, name: string): StudioState {
  const title = name.trim().slice(0, 60)
  if (
    !title ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(id) ||
    state.decks.length >= STUDIO_MAX_DECKS ||
    state.decks.some(deck => deck.id === id)
  )
    return state
  return { ...state, decks: [...state.decks, { id, name: title, cards: [] }] }
}

export function studioChangeDeck(
  state: StudioState,
  id: string,
  recipe: (deck: StudioDeck) => StudioDeck
): StudioState {
  return { ...state, decks: state.decks.map(deck => (deck.id === id ? recipe(deck) : deck)) }
}

export function studioAddCards(state: StudioState, deckId: string, ids: number[]): StudioState {
  return studioChangeDeck(state, deckId, deck => {
    const seen = new Set(deck.cards.map(card => card.verseId))
    const added: StudioCard[] = []
    for (const id of ids) {
      if (!validIds.has(id)) continue
      const verseId = getPassage(id)[0].id
      if (seen.has(verseId) || seen.size >= STUDIO_MAX_CARDS) continue
      seen.add(verseId)
      added.push({
        verseId,
        note: '',
        tags: [],
        favorite: false,
        dueAt: 0,
        intervalDays: 0,
        reviews: 0,
      })
    }
    return { ...deck, cards: [...deck.cards, ...added] }
  })
}

export function studioMatchesCard(card: StudioCard, query: string): boolean {
  const term = normalize(query.trim())
  return (
    !term ||
    normalize(
      [
        ...getPassage(card.verseId).map(verse => `${verse.id} ${verse.text}`),
        card.note,
        ...card.tags,
      ].join(' ')
    ).includes(term)
  )
}

export function studioQueue(
  state: StudioState,
  deckId: string,
  now: number,
  options: { query?: string; favoriteOnly?: boolean; dueOnly?: boolean } = {}
): StudioCard[] {
  return (state.decks.find(deck => deck.id === deckId)?.cards ?? [])
    .filter(
      card =>
        (!options.favoriteOnly || card.favorite) &&
        (!options.dueOnly || card.dueAt <= now) &&
        studioMatchesCard(card, options.query ?? '')
    )
    .sort((a, b) => a.dueAt - b.dueAt || a.verseId - b.verseId)
    .slice(0, studioRemaining(state, now))
}

export function studioSchedule(card: StudioCard, rating: StudioRating, now: number) {
  if (rating === 'again') return { intervalDays: 0, dueAt: now + RETRY_DELAY_MS }

  const { minimumDays, multiplier } = reviewIntervals[rating]
  const intervalDays = Math.min(
    MAX_INTERVAL_DAYS,
    Math.max(minimumDays, Math.ceil(card.intervalDays * multiplier))
  )
  return { intervalDays, dueAt: now + intervalDays * MILLISECONDS_PER_DAY }
}

export function studioRateCard(
  state: StudioState,
  deckId: string,
  verseId: number,
  rating: StudioRating,
  now: number
): StudioState {
  if (
    !Number.isFinite(now) ||
    !studioRatings.includes(rating) ||
    !studioRemaining(state, now) ||
    !state.decks.find(deck => deck.id === deckId)?.cards.some(card => card.verseId === verseId)
  )
    return state
  const next = studioChangeDeck(state, deckId, deck => ({
    ...deck,
    cards: deck.cards.map(card =>
      card.verseId === verseId
        ? {
            ...card,
            ...studioSchedule(card, rating, now),
            reviews: card.reviews + 1,
          }
        : card
    ),
  }))
  const day = studioDay(now)
  const counts = state.days[day] ?? emptyStudioCounts()
  return {
    ...next,
    days: Object.fromEntries(
      Object.entries({
        ...state.days,
        [day]: { ...counts, [rating]: counts[rating] + 1 },
      })
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-HISTORY_DAYS)
    ),
  }
}

export function studioFlashcard(
  verseId: number,
  direction: 'forward' | 'reverse',
  cloze: boolean
): { prompt: string; answer: string; fragment: boolean } {
  const passage = getPassage(verseId)
  if (!passage.length) return { prompt: '', answer: '', fragment: false }
  const full = passage.map(verse => verse.text).join('\n')
  if (cloze) {
    let word = 0
    return {
      prompt: full.replace(/\p{L}+/gu, token => (++word % 3 === 0 ? '____' : token)),
      answer: full,
      fragment: false,
    }
  }
  const tokens = passage[0].text.split(/\s+/)
  const midpoint = Math.ceil(tokens.length / 2)
  const front = passage.length > 1 ? passage[0].text : tokens.slice(0, midpoint).join(' ')
  const back = passage.length > 1 ? passage[1].text : tokens.slice(midpoint).join(' ')
  return {
    prompt: direction === 'forward' ? front : back,
    answer: direction === 'forward' ? back : front,
    fragment: passage.length === 1,
  }
}
