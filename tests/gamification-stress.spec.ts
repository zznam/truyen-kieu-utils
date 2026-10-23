import { test, expect } from '@playwright/test'
import {
  ADVENTURE_STORAGE_KEY,
  emptyAdventure,
  emptyActivity,
  parseAdventure,
  shiftDay,
  SESSION_MODES,
  TOPIC_IDS,
} from '../lib/gamification'
import { verses } from '../lib/kieu'

function fullNotebook() {
  const state = emptyAdventure()
  state.xp = 100000
  state.coins = state.earnedCoins = 10000
  state.profile.name = 'W'.repeat(40)
  state.readIds = state.savedIds = verses.map(verse => verse.id)
  state.topics = [...TOPIC_IDS]
  state.mastery = Object.fromEntries(
    verses.map(verse => [verse.id, { count: 3, lastDate: '2026-10-22' }])
  )
  state.activity = Array.from({ length: 366 }, (_, index) => ({
    ...emptyActivity(shiftDay('2026-10-23', index - 365)),
    xp: 100,
    sessions: 20,
    total: 100,
    correct: 100,
    modes: [...SESSION_MODES],
  }))
  state.eventIds = Array.from({ length: 5000 }, (_, index) => `event-${index}`)
  state.history = Array.from({ length: 200 }, (_, index) => ({
    id: `session-${index}`,
    date: '2026-10-23',
    mode: SESSION_MODES[index % SESSION_MODES.length],
    correct: 5,
    total: 5,
    hints: 0,
    xp: 40,
  }))
  state.stats.sessions = state.stats.perfect = state.stats.noHint = 7320
  state.stats.correct = state.stats.total = 36600
  state.best = Object.fromEntries(SESSION_MODES.map(mode => [mode, 100]))
  const parsed = parseAdventure(state)
  if (!parsed) throw new Error('Invalid stress fixture')
  return parsed
}

for (const width of [320, 390, 768, 1280]) {
  test(`full notebook remains usable at ${width}px in both themes`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), {
      key: ADVENTURE_STORAGE_KEY,
      state: fullNotebook(),
    })
    await page.goto('/play/adventure')
    for (const dark of [false, true]) {
      await page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark)
      for (const panel of [
        'Hôm nay',
        'Nhiệm vụ',
        'Đường thơ',
        'Dấu ấn',
        'Bộ sưu tập',
        'Sổ luyện',
        'Quà tặng',
        'Góc của bạn',
      ]) {
        await page.getByRole('tab', { name: panel, exact: true }).click()
        await expect(page.getByRole('tabpanel')).toBeVisible()
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          `${panel}, dark=${dark}`
        ).toBe(true)
      }
    }
    expect(errors).toEqual([])
  })
}
