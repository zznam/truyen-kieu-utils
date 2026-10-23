import { test as base, expect, type Page } from '@playwright/test'
import { createQuestions, createReviewQuestion, type Question } from '../lib/games'
import { GAME_STORAGE_KEY } from '../lib/game-progress'

const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text())
      })
      await use(errors)
      expect(errors).toEqual([])
    },
    { auto: true },
  ],
})
const day = '2026-10-23'
const seed = '11111111-1111-4111-8111-111111111111'
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 23, 12))
  await page.addInitScript(value => {
    crypto.randomUUID = () => value as `${string}-${string}-${string}-${string}-${string}`
  }, seed)
})
async function answer(page: Page, question: Question, hint = false) {
  if (hint) await page.getByRole('button', { name: 'Gợi ý · tối đa 5 điểm' }).click()
  for (const text of question.answer)
    await page
      .getByRole('group')
      .getByRole('button')
      .filter({ has: page.getByText(text, { exact: true }) })
      .click()
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: `Chính xác! +${hint ? 5 : 10} điểm` })
  ).toBeVisible()
}
async function finish(page: Page, questions: Question[], hintFirst = false) {
  for (const [index, question] of questions.entries()) {
    await answer(page, question, hintFirst && index === 0)
    await page
      .getByRole('button', {
        name: index === questions.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo',
        exact: true,
      })
      .click()
  }
  await expect(page.getByRole('heading', { name: 'Bạn đã hoàn thành!' })).toBeFocused()
}
for (const mode of ['missing', 'continuation', 'order'] as const) {
  test(`${mode}: complete, review, bookmark, persist and navigate`, async ({ page }) => {
    await page.goto(`/play/${mode}`)
    await page.getByRole('button', { name: 'Bắt đầu · 5 câu' }).click()
    await finish(page, createQuestions(mode, seed), true)
    await expect(page.locator('.game-score')).toContainText('45/50 điểm')
    await expect(page.getByText('Đúng 5/5 câu · +45 XP · Tổng 45 XP')).toBeVisible()
    await page.getByRole('button', { name: 'Lưu câu thơ', exact: true }).first().click()
    await expect(page.getByRole('button', { name: 'Đã lưu', exact: true }).first()).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await page.getByRole('link', { name: 'Xem hành trình' }).click()
    await expect(page.getByText('45 XP', { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByText('45 XP', { exact: true })).toBeVisible()
    await expect(page.getByText('1 lượt', { exact: true })).toBeVisible()
    await expect(page.getByText('Kỷ lục 45/50 điểm')).toBeVisible()
    await page.goto('/saved')
    await expect(page.locator('.passage-card').first()).toBeVisible()
  })
}
test('daily replay and another tab cannot grant the daily reward again', async ({
  page,
  context,
}) => {
  await page.goto('/play/daily')
  await page.getByRole('button', { name: 'Bắt đầu · 5 câu' }).click()
  await finish(page, createQuestions('daily', day))
  await expect(page.getByText('Đúng 5/5 câu · +60 XP · Tổng 60 XP')).toBeVisible()
  await page.getByRole('button', { name: 'Ôn lại bộ câu hôm nay' }).click()
  await finish(page, createQuestions('daily', day))
  await expect(page.getByText('Đúng 5/5 câu · +0 XP · Tổng 60 XP')).toBeVisible()
  const second = await context.newPage()
  await second.goto('/play')
  await expect(second.getByText('60 XP', { exact: true })).toBeVisible()
  await expect(second.getByText('1 lượt', { exact: true })).toBeVisible()
  await expect(second.getByRole('link', { name: 'Chơi lại thử thách' })).toBeVisible()
  await second.clock.setFixedTime(new Date(2026, 9, 23, 12))
  await second.goto('/play/daily')
  await second.getByRole('button', { name: 'Bắt đầu · 5 câu' }).click()
  for (let i = 0; i < 5; i++) {
    await second.getByRole('button', { name: 'Bỏ qua câu này' }).click()
    await second
      .getByRole('button', { name: i === 4 ? 'Xem kết quả' : 'Câu tiếp theo', exact: true })
      .click()
  }
  await expect(second.getByText('Đúng 0/5 câu · +0 XP · Tổng 60 XP')).toBeVisible()
  await second.close()
})
test('wrong answers, skip, ordering removal and keyboard controls', async ({ page }) => {
  await page.goto('/play/order')
  await page.getByRole('button', { name: 'Bắt đầu · 5 câu' }).click()
  await expect(page.getByRole('button', { name: 'Kiểm tra', exact: true })).toBeDisabled()
  const option = page.getByRole('group').getByRole('button').first()
  await option.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: /^Gỡ câu 1:/ })).toBeVisible()
  await page.getByRole('button', { name: /^Gỡ câu 1:/ }).click()
  await expect(page.getByText('0/4 câu đã xếp')).toBeVisible()
  await page.getByRole('button', { name: 'Bỏ qua câu này' }).click()
  await expect(page.getByRole('heading', { name: 'Cùng nhớ lại lời thơ' })).toBeVisible()
  await page.getByRole('button', { name: 'Câu tiếp theo', exact: true }).click()
  await expect(page.locator('.game-prompt')).toBeFocused()
  await page.goto('/play/missing')
  await page.getByRole('button', { name: 'Bắt đầu · 5 câu' }).click()
  const question = createQuestions('missing', seed)[0]
  const wrong = question.options.find(option => option !== question.answer[0])!
  await page
    .getByRole('group')
    .getByRole('button')
    .filter({ has: page.getByText(wrong, { exact: true }) })
    .click()
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Cùng nhớ lại lời thơ' })).toBeVisible()
  await expect(page.locator('.game-option.correct')).toContainText(question.answer[0])
  await page.goto('/play')
  await expect(page.getByText('0 lượt', { exact: true })).toBeVisible()
})
test('blocked storage still permits completion and explains session-only progress', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage blocked', 'SecurityError')
    }
  })
  await page.goto('/play/missing')
  await page.getByRole('button', { name: 'Bắt đầu · 5 câu' }).click()
  await finish(page, createQuestions('missing', seed))
  await expect(
    page.getByText('Không thể lưu trong trình duyệt. Thành tích được giữ trong phiên này.')
  ).toBeVisible()
  await page.getByRole('link', { name: 'Xem hành trình' }).click()
  await expect(page.getByText('50 XP', { exact: true })).toBeVisible()
})
test('malformed stored progress does not break a fresh game', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{broken json'), GAME_STORAGE_KEY)
  await page.goto('/play/missing')
  await page.getByRole('button', { name: 'Bắt đầu · 5 câu' }).click()
  await finish(page, createQuestions('missing', seed))
  expect(
    await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).xp, GAME_STORAGE_KEY)
  ).toBe(50)
})
for (const width of [320, 390, 768, 820, 1001, 1280]) {
  test(`game hub and active order game fit ${width}px in both themes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/play', '/play/order']) {
      await page.goto(route)
      if (route.endsWith('order')) {
        await page.getByRole('button', { name: 'Bắt đầu · 5 câu' }).click()
        for (const text of createQuestions('order', seed)[0].answer)
          await page
            .getByRole('group')
            .getByRole('button')
            .filter({ has: page.getByText(text, { exact: true }) })
            .click()
        await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click()
      }
      for (const theme of ['light', 'dark']) {
        if (theme === 'dark') await page.getByRole('button', { name: 'Bật giao diện tối' }).click()
        await page.evaluate(() => document.fonts.ready)
        const overflow = await page.evaluate(() => ({
          page: document.documentElement.scrollWidth,
          viewport: document.documentElement.clientWidth,
          controls: [...document.querySelectorAll('button, input, nav a')]
            .filter(el => {
              const r = el.getBoundingClientRect()
              return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1)
            })
            .map(el => el.textContent),
        }))
        expect(overflow.page).toBeLessThanOrEqual(overflow.viewport + 1)
        expect(overflow.controls).toEqual([])
      }
      await page.getByRole('button', { name: 'Bật giao diện sáng' }).click()
    }
  })
}

test('home and tablet navigation lead to games and highlight the active section', async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 900 })
  await page.goto('/')
  await page.getByRole('link', { name: /Điền chữ, nối câu, xếp thơ/ }).click()
  await expect(page).toHaveURL(/\/play$/)
  await page.getByRole('link', { name: /Điền chữ còn thiếu/ }).click()
  await page.getByRole('button', { name: 'Mở menu' }).click()
  const nav = page.getByRole('navigation', { name: 'Điều hướng di động' })
  await expect(nav.getByRole('link', { name: 'Chơi cùng Kiều' })).toHaveAttribute(
    'aria-current',
    'page'
  )
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Mở menu' })).toBeFocused()
})

test('missed questions persist, short reviews clear them, and hints retain them without awarding XP', async ({
  page,
}) => {
  await page.goto('/play/missing')
  await page.getByRole('button', { name: 'Bắt đầu · 5 câu' }).click()
  const questions = createQuestions('missing', seed)
  for (let i = 0; i < 5; i++) {
    if (i < 2) await page.getByRole('button', { name: 'Bỏ qua câu này' }).click()
    else await answer(page, questions[i])
    await page
      .getByRole('button', { name: i === 4 ? 'Xem kết quả' : 'Câu tiếp theo', exact: true })
      .click()
  }
  await page.getByRole('link', { name: 'Ôn 2 câu chưa nhớ' }).click()
  await expect(page).toHaveURL(/\/play\/review$/)
  await page.reload()
  await page.getByRole('button', { name: 'Bắt đầu · 2 câu' }).click()
  const reviews = questions
    .slice(0, 2)
    .map(q => createReviewQuestion({ mode: q.mode, verseId: q.passage[0].id })!)
  await finish(page, reviews, true)
  await expect(page.getByText('Đúng 2/2 câu · +0 XP · Tổng 30 XP')).toBeVisible()
  await expect(page.getByText(/Còn 1 câu trong sổ ôn/)).toBeVisible()
  await page.getByRole('button', { name: 'Ôn các câu còn lại' }).click()
  await finish(page, [reviews[0]])
  await expect(page.getByRole('button', { name: 'Ôn các câu còn lại' })).toBeDisabled()
  await page.goto('/play/journey')
  await expect(page.getByRole('heading', { name: 'Sổ ôn đang trống' })).toBeVisible()
  await expect(page.locator('.journey-history li')).toHaveCount(1)
  await expect(page.locator('.journey-history')).toContainText('Đúng 3/5 câu')
  await page.reload()
  await expect(page.getByRole('heading', { name: '1/7 ngày cùng thơ' })).toBeVisible()
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), GAME_STORAGE_KEY)
  expect(saved).toMatchObject({ xp: 30, sessions: 1, review: [] })
  expect(saved.activity[0].sessions).toBe(1)
})

test('missions earn a single bonus across tabs and reset with the local day', async ({
  page,
  context,
}) => {
  await page.goto('/play')
  await expect(page.getByRole('button', { name: 'Nhận 20 XP' })).toBeDisabled()
  await page.goto('/play/missing')
  await page.getByRole('button', { name: 'Bắt đầu · 5 câu' }).click()
  await finish(page, createQuestions('missing', seed))
  await page.goto('/play/continuation')
  const nextSeed = '22222222-2222-4222-8222-222222222222'
  await page.evaluate(value => {
    crypto.randomUUID = () => value as `${string}-${string}-${string}-${string}-${string}`
  }, nextSeed)
  await page.getByRole('button', { name: 'Bắt đầu · 5 câu' }).click()
  await finish(page, createQuestions('continuation', nextSeed))
  await page.getByRole('link', { name: 'Xem hành trình' }).click()
  await expect(page.getByRole('button', { name: 'Nhận 20 XP' })).toBeEnabled()
  const second = await context.newPage()
  await second.clock.setFixedTime(new Date(2026, 9, 23, 12))
  await second.goto('/play')
  await expect(second.getByRole('button', { name: 'Nhận 20 XP' })).toBeEnabled()
  await page.getByRole('button', { name: 'Nhận 20 XP' }).click()
  await expect(page.getByText('120 XP', { exact: true })).toBeVisible()
  await expect(second.getByRole('button', { name: 'Đã nhận thưởng hôm nay' })).toBeDisabled()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Đã nhận thưởng hôm nay' })).toBeDisabled()
  await page.clock.setFixedTime(new Date(2026, 9, 24, 0, 1))
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('button', { name: 'Nhận 20 XP' })).toBeDisabled()
  await expect(page.getByRole('progressbar', { name: 'Nhớ mười câu thơ' })).toHaveAttribute(
    'value',
    '0'
  )
  await expect(page.getByText('120 XP', { exact: true })).toBeVisible()
  await second.close()
})

test('legacy progress keeps its XP and shows useful empty journal and review states', async ({
  page,
}) => {
  await page.addInitScript(
    key =>
      localStorage.setItem(
        key,
        JSON.stringify({
          xp: 345,
          sessions: 7,
          correct: 29,
          best: { missing: 50 },
          dates: ['2026-10-23'],
          perfect: true,
        })
      ),
    GAME_STORAGE_KEY
  )
  await page.goto('/play')
  await expect(page.getByText('345 XP', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: /Sổ hành trình/ }).click()
  await expect(page.getByText('Chưa có lượt chơi nào trong sổ.')).toBeVisible()
  await expect(page.getByRole('heading', { name: '1/7 ngày cùng thơ' })).toBeVisible()
  await page.goto('/play/review')
  await expect(page.getByRole('link', { name: 'Khám phá các trò chơi' })).toBeVisible()
})

for (const width of [320, 390, 768, 1280]) {
  test(`journey and review fit ${width}px with populated data in both themes`, async ({ page }) => {
    const q = createQuestions('order', seed)[0]
    await page.addInitScript(
      ({ key, review, date }) =>
        localStorage.setItem(
          key,
          JSON.stringify({
            xp: 40,
            sessions: 1,
            dates: [date],
            review,
            history: [{ id: 'layout', date, mode: 'continuation', score: 40, correct: 4 }],
          })
        ),
      { key: GAME_STORAGE_KEY, review: [{ mode: q.mode, verseId: q.passage[0].id }], date: day }
    )
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/play/journey', '/play/review']) {
      await page.goto(route)
      if (route.endsWith('review'))
        await page.getByRole('button', { name: 'Bắt đầu · 1 câu' }).click()
      for (const theme of ['light', 'dark']) {
        if (theme === 'dark') await page.getByRole('button', { name: 'Bật giao diện tối' }).click()
        await page.evaluate(() => document.fonts.ready)
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
        ).toBe(true)
      }
      await page.getByRole('button', { name: 'Bật giao diện sáng' }).click()
    }
  })
}
