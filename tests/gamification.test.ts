import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ADVENTURE_STORAGE_KEY,
  achievements,
  applyAdventureEvent,
  buyAdventureItem,
  chapters,
  claimAdventureChapter,
  claimAdventureQuest,
  collections,
  currentStreak,
  emptyAdventure,
  equipAdventureItem,
  exportAdventure,
  importAdventure,
  levelInfo,
  localDay,
  longestStreak,
  parseAdventure,
  pinAdventureAchievement,
  quests,
  recentActivity,
  setAdventureGoal,
  shiftDay,
  updateAdventureProfile,
  weekKey,
  type AdventureEvent,
} from '../lib/gamification'
import { verses } from '../lib/kieu'

const date = '2026-10-23'
const ids = verses.slice(0, 40).map(verse => verse.id)
const session = (id = 'session'): AdventureEvent => ({
  type: 'session',
  id,
  mode: 'arcade-recall',
  correct: 4,
  total: 5,
  hints: 1,
  verseIds: ids.slice(0, 3),
})

test('unique reading and saving rewards survive different event IDs and repeat dates', () => {
  const first = applyAdventureEvent(
    emptyAdventure(),
    { type: 'read', id: 'read', verseIds: [...ids.slice(0, 12), ids[0]] },
    date
  )
  assert.equal(first.readIds.length, 12)
  assert.equal(first.xp, 24)
  assert.equal(first.coins, 12)
  assert.equal(
    applyAdventureEvent(
      first,
      { type: 'read', id: 'another-read', verseIds: ids.slice(0, 12) },
      shiftDay(date, 1)
    ),
    first
  )
  const saved = applyAdventureEvent(first, { type: 'save', id: 'saved', verseId: ids[0] }, date)
  assert.equal(saved.xp, 29)
  assert.equal(
    applyAdventureEvent(saved, { type: 'save', id: 'resaved', verseId: ids[0] }, date),
    saved
  )
  assert.equal(first.xp, 24, 'the previous state remains immutable')
})

test('dedupe applies across actions; invalid verse IDs, topics, modes and impossible results are rejected', () => {
  const state = applyAdventureEvent(emptyAdventure(), session(), date)
  assert.equal(applyAdventureEvent(state, session(), date), state)
  assert.equal(applyAdventureEvent(state, { type: 'create', id: 'session' }, date), state)
  const malformed: AdventureEvent[] = [
    { type: 'read', id: 'bad-read', verseIds: [-1] },
    { type: 'save', id: 'bad-save', verseId: 999999 },
    { type: 'explore', id: 'bad-topic', topic: '__proto__' },
    {
      type: 'session',
      id: 'bad-mode',
      mode: '__proto__',
      correct: 1,
      total: 5,
      hints: 0,
      verseIds: [],
    },
    {
      type: 'session',
      id: 'bad-score',
      mode: 'missing',
      correct: 6,
      total: 5,
      hints: 0,
      verseIds: [],
    },
    {
      type: 'session',
      id: 'bad-hint',
      mode: 'missing',
      correct: 3,
      total: 5,
      hints: 8,
      verseIds: [],
    },
    {
      type: 'session',
      id: 'zero-rounds',
      mode: 'missing',
      correct: 0,
      total: 0,
      hints: 0,
      verseIds: [],
    },
    { type: 'focus', id: 'fraction', minutes: 0.5, verseIds: ids.slice(0, 1) },
  ]
  for (const event of malformed) assert.equal(applyAdventureEvent(state, event, date), state)
  assert.equal(applyAdventureEvent(state, { type: 'create', id: 'bad-date' }, '2026-02-30'), state)
  assert.equal(applyAdventureEvent(state, { type: 'create', id: '' }, date), state)
})

test('sessions accept zero correct and track scores, all-time statistics and only supplied mastery IDs', () => {
  const failed = applyAdventureEvent(
    emptyAdventure(),
    {
      type: 'session',
      id: 'failed',
      mode: 'missing',
      correct: 0,
      total: 5,
      hints: 0,
      verseIds: [],
    },
    date
  )
  assert.equal(failed.stats.sessions, 1)
  assert.equal(failed.stats.correct, 0)
  assert.deepEqual(failed.mastery, {})
  const state = applyAdventureEvent(failed, session(), date)
  assert.equal(state.stats.sessions, 2)
  assert.equal(state.stats.correct, 4)
  assert.equal(state.stats.hints, 1)
  assert.equal(state.best['arcade-recall'], 80)
  assert.equal(Object.keys(state.mastery).length, 3)
  assert.equal(state.stats.perfect, 0)
  const perfect = applyAdventureEvent(
    state,
    {
      type: 'session',
      id: 'perfect',
      mode: 'arcade-recall',
      total: 5,
      correct: 5,
      hints: 0,
      verseIds: ids.slice(0, 5),
    },
    date
  )
  assert.equal(perfect.best['arcade-recall'], 100)
  assert.equal(perfect.stats.perfect, 1)
  assert.equal(perfect.stats.noHint, 1)
  assert.equal(perfect.history.at(-1)?.xp, 40)
})

test('mastery is spaced across days and a same-day review cannot farm rewards', () => {
  let state = applyAdventureEvent(emptyAdventure(), session(), date)
  assert.equal(state.mastery[ids[0]].count, 1)
  assert.equal(
    applyAdventureEvent(state, { type: 'review', id: 'same-day', verseIds: ids.slice(0, 3) }, date),
    state
  )
  state = applyAdventureEvent(
    state,
    { type: 'review', id: 'next-day', verseIds: ids.slice(0, 3) },
    shiftDay(date, 1)
  )
  assert.equal(state.mastery[ids[0]].count, 2)
  assert.equal(state.stats.reviews, 3)
  state = applyAdventureEvent(
    state,
    { type: 'review', id: 'third-day', verseIds: ids.slice(0, 3) },
    shiftDay(date, 2)
  )
  assert.equal(state.mastery[ids[0]].count, 3)
})

test('daily and weekly quests are date-bound, gated and claimed exactly once', () => {
  let state = emptyAdventure()
  const locked = quests(state, date).find(
    quest => quest.id.endsWith(':read') && quest.period === 'daily'
  )!
  assert.equal(claimAdventureQuest(state, locked.id, date), state)
  state = applyAdventureEvent(state, { type: 'read', id: 'read', verseIds: ids.slice(0, 12) }, date)
  assert.equal(quests(state, date).find(quest => quest.id === locked.id)?.value, 12)
  const claimed = claimAdventureQuest(state, locked.id, date)
  assert.equal(claimed.xp, state.xp + locked.xp)
  assert.equal(claimAdventureQuest(claimed, locked.id, date), claimed)
  assert.equal(claimAdventureQuest(state, locked.id, shiftDay(date, 1)), state)
  assert.ok(
    quests(claimed, shiftDay(date, 1))
      .filter(quest => quest.period === 'daily')
      .every(quest => !quest.claimed)
  )
  assert.equal(weekKey('2026-10-25'), '2026-10-19')
  assert.equal(weekKey('2026-10-26'), '2026-10-26')
})

test('campaign chapters require earlier claims and unlock in sequence', () => {
  let state = applyAdventureEvent(
    emptyAdventure(),
    { type: 'read', id: 'read', verseIds: ids },
    date
  )
  for (const id of ids.slice(0, 5))
    state = applyAdventureEvent(state, { type: 'save', id: `save-${id}`, verseId: id }, date)
  assert.equal(chapters(state)[1].unlocked, false)
  assert.equal(claimAdventureChapter(state, 'keepsake', date), state)
  state = claimAdventureChapter(state, 'opening', date)
  assert.equal(chapters(state)[1].unlocked, true)
  const claimed = claimAdventureChapter(state, 'keepsake', date)
  assert.equal(claimed.claimedChapters.length, 2)
  assert.equal(claimAdventureChapter(claimed, 'keepsake', date), claimed)
})

test('shop purchase and equip require earned coins, avoid duplicate charges and lock cosmetics', () => {
  const empty = emptyAdventure()
  assert.equal(buyAdventureItem(empty, 'avatar-lotus', date), empty)
  assert.equal(equipAdventureItem(empty, 'avatar-lotus'), empty)
  assert.equal(updateAdventureProfile(empty, { avatar: '🪷' }).profile.avatar, '📖')
  const funded = applyAdventureEvent(empty, { type: 'read', id: 'read', verseIds: ids }, date)
  const bought = buyAdventureItem(funded, 'avatar-lotus', date)
  assert.equal(bought.coins, 10)
  assert.equal(buyAdventureItem(bought, 'avatar-lotus', date), bought)
  assert.equal(equipAdventureItem(bought, 'avatar-lotus').profile.avatar, '🪷')
  assert.equal(bought.profile.avatar, '📖', 'buying does not silently equip')
  assert.equal(updateAdventureProfile(bought, { name: '  Kiều  ' }).profile.name, 'Kiều')
  assert.equal(updateAdventureProfile(bought, { accent: 'untrusted' }).profile.accent, 'indigo')
})

test('streak repair only covers yesterday after one missed day and does not count as an active day', () => {
  const firstDate = shiftDay(date, -2)
  const state = applyAdventureEvent(
    emptyAdventure(),
    { type: 'read', id: 'read', verseIds: ids },
    firstDate
  )
  assert.equal(currentStreak(state, date), 0)
  const repaired = buyAdventureItem(state, 'freeze', date)
  assert.equal(repaired.coins, 0)
  assert.deepEqual(repaired.freezeDays, [shiftDay(date, -1)])
  assert.equal(currentStreak(repaired, date), 1)
  const today = applyAdventureEvent(repaired, { type: 'create', id: 'create' }, date)
  assert.equal(currentStreak(today, date), 2)
  assert.equal(buyAdventureItem(repaired, 'freeze', date), repaired)
  assert.equal(buyAdventureItem(state, 'freeze', shiftDay(date, 1)), state)
})

test('focus rewards respect completion amount, cap daily time and do not mark verses read', () => {
  let state = applyAdventureEvent(
    emptyAdventure(),
    { type: 'focus', id: 'focus-1', minutes: 60, verseIds: ids.slice(0, 1) },
    date
  )
  assert.equal(state.stats.focusMinutes, 60)
  assert.equal(state.readIds.length, 0)
  state = applyAdventureEvent(
    state,
    { type: 'focus', id: 'focus-2', minutes: 60, verseIds: ids.slice(0, 1) },
    date
  )
  assert.equal(state.stats.focusMinutes, 120)
  assert.equal(
    applyAdventureEvent(
      state,
      { type: 'focus', id: 'focus-3', minutes: 1, verseIds: ids.slice(0, 1) },
      date
    ),
    state
  )
})

test('repeatable activities have daily limits without blocking tomorrow', () => {
  let state = emptyAdventure()
  for (let i = 0; i < 25; i++) state = applyAdventureEvent(state, session(`session-${i}`), date)
  assert.equal(state.stats.sessions, 20)
  for (let i = 0; i < 10; i++)
    state = applyAdventureEvent(state, { type: 'create', id: `create-${i}` }, date)
  assert.equal(state.stats.created, 3)
  state = applyAdventureEvent(state, { type: 'create', id: 'tomorrow' }, shiftDay(date, 1))
  assert.equal(state.stats.created, 4)
})

test('backup round trip is lossless, legacy game saves are separate and invalid imports cannot replace state', () => {
  const state = applyAdventureEvent(emptyAdventure(), session(), date)
  assert.deepEqual(importAdventure(exportAdventure(state)), state)
  assert.equal(ADVENTURE_STORAGE_KEY, 'kieu-adventure-v1')
  assert.equal(parseAdventure({ xp: 500, sessions: 10 }), null)
  assert.equal(parseAdventure({ ...state, version: 2 }), null)
  assert.equal(parseAdventure({ ...state, coins: -1 }), null)
  assert.equal(parseAdventure({ ...state, xp: Infinity }), null)
  assert.equal(parseAdventure({ ...state, readIds: [ids[0], ids[0]] }), null)
  assert.equal(
    parseAdventure({ ...state, mastery: { constructor: { count: 1, lastDate: date } } }),
    null
  )
  assert.equal(
    parseAdventure({ ...state, activity: [{ ...state.activity[0], date: '2026-02-30' }] }),
    null
  )
  assert.equal(importAdventure('{'), null)
  assert.equal(importAdventure('x'.repeat(2_000_001)), null)
  assert.equal(importAdventure(JSON.stringify({ app: 'other', version: 1, state })), null)
  assert.equal(importAdventure(JSON.stringify({ app: 'kieu-adventure', version: 2, state })), null)
})

test('level boundaries, goal settings, collection unlocks and pinning reflect actual progress', () => {
  assert.equal(levelInfo(0).level, 1)
  assert.equal(levelInfo(99).level, 1)
  assert.equal(levelInfo(100).level, 2)
  assert.equal(levelInfo(400).level, 3)
  assert.equal(levelInfo(100).progress, 0)
  const empty = emptyAdventure()
  assert.equal(setAdventureGoal(empty, 19), empty)
  assert.equal(setAdventureGoal(empty, 100).dailyGoal, 100)
  assert.equal(pinAdventureAchievement(empty, 'reader'), empty)
  const state = applyAdventureEvent(empty, { type: 'read', id: 'read', verseIds: ids }, date)
  assert.equal(achievements(state).find(item => item.id === 'reader')?.unlocked, true)
  assert.equal(collections(state).find(item => item.id === 'reading-1')?.unlocked, true)
  assert.equal(pinAdventureAchievement(state, 'reader').pinnedAchievement, 'reader')
  assert.equal(recentActivity(state, date, 7).length, 7)
  assert.equal(recentActivity(state, date, 7).at(-1)?.read, 40)
  assert.equal(localDay(new Date(2026, 9, 23, 0, 5)), date)
})

test('earlier earned profile titles remain usable, and locked backup cosmetics are rejected', () => {
  const state = { ...emptyAdventure(), xp: 900 }
  assert.equal(
    updateAdventureProfile(state, { title: 'Người tìm chữ' }).profile.title,
    'Người tìm chữ'
  )
  assert.equal(updateAdventureProfile(state, { title: 'Thi nhân' }), state)
  assert.equal(updateAdventureProfile(state, { avatar: '🪷' }), state)
  assert.equal(parseAdventure({ ...state, profile: { ...state.profile, avatar: '🪷' } }), null)
  assert.equal(parseAdventure({ ...state, profile: { ...state.profile, title: 'Thi nhân' } }), null)
  const purchased = { ...state, inventory: ['avatar-lotus'] }
  assert.equal(
    parseAdventure({ ...purchased, profile: { ...purchased.profile, avatar: '🪷' } })?.profile
      .avatar,
    '🪷'
  )
})

test('backup claim IDs and mastery keys reject impossible dates, skipped chapters and numeric aliases', () => {
  const state = emptyAdventure()
  assert.equal(parseAdventure({ ...state, claimedQuests: ['daily:2026-02-30:read'] }), null)
  assert.equal(parseAdventure({ ...state, claimedQuests: ['daily:2026-10-23:invented'] }), null)
  assert.equal(parseAdventure({ ...state, claimedQuests: ['weekly:2026-10-23:read'] }), null)
  assert.equal(parseAdventure({ ...state, claimedChapters: ['mastery'] }), null)
  assert.equal(
    parseAdventure({ ...state, mastery: { [`0${ids[0]}`]: { count: 1, lastDate: date } } }),
    null
  )
})

test('mastery remains available beyond daily reward cap and never exceeds its third rank', () => {
  const fifty = verses.slice(0, 50).map(verse => verse.id)
  let state = applyAdventureEvent(
    emptyAdventure(),
    { type: 'review', id: 'first-50', verseIds: fifty },
    date
  )
  const earned = state.xp
  state = applyAdventureEvent(
    state,
    { type: 'review', id: 'next-10', verseIds: verses.slice(50, 60).map(verse => verse.id) },
    date
  )
  assert.equal(state.stats.reviews, 60)
  assert.equal(Object.keys(state.mastery).length, 60)
  assert.equal(state.xp, earned)
  for (let day = 1; day <= 5; day++) {
    state = applyAdventureEvent(
      state,
      { type: 'review', id: `later-${day}`, verseIds: fifty },
      shiftDay(date, day)
    )
  }
  assert.equal(state.mastery[fifty[0]].count, 3)
  assert.equal(state.mastery[fifty[0]].lastDate, shiftDay(date, 5))
})

test('changing a daily goal updates today without retroactively completing historical goals', () => {
  let state = applyAdventureEvent(
    emptyAdventure(),
    { type: 'read', id: 'yesterday', verseIds: ids.slice(0, 10) },
    shiftDay(date, -1)
  )
  assert.equal(state.activity[0].goalTarget, 50)
  state = applyAdventureEvent(
    state,
    { type: 'read', id: 'today', verseIds: ids.slice(10, 20) },
    date
  )
  state = setAdventureGoal(state, 20, date)
  assert.equal(state.activity.find(day => day.date === date)?.goalTarget, 20)
  assert.equal(state.activity.find(day => day.date === shiftDay(date, -1))?.goalTarget, 50)
  assert.equal(quests(state, date).find(quest => quest.id.endsWith(':habit'))?.value, 1)
})

test('longest streak preserves real breaks, ignores frozen days in its count and tolerates imported order', () => {
  let state = emptyAdventure()
  for (const offset of [0, 1, 3, 7, 8])
    state = applyAdventureEvent(
      state,
      { type: 'create', id: `day-${offset}` },
      shiftDay(date, offset)
    )
  assert.equal(longestStreak(state), 2)
  state.freezeDays = [shiftDay(date, 2)]
  state.activity.reverse()
  assert.equal(longestStreak(state), 3)
})
