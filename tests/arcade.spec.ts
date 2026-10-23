import { test, expect, type Page } from '@playwright/test'
import {
  arcadeModes,
  createArcadeQuestions,
  type ArcadeMode,
  type ArcadeQuestion,
} from '../lib/arcade'
import { ADVENTURE_STORAGE_KEY } from '../lib/gamification'

const seed = '22222222-2222-4222-8222-222222222222'
test.beforeEach(async ({ page }) => {
  await page.addInitScript(value => {
    crypto.randomUUID = () => value as `${string}-${string}-${string}-${string}-${string}`
  }, seed)
})

async function answerQuestion(page: Page, question: ArcadeQuestion) {
  if (question.mode === 'typed-word' || question.mode === 'recall') {
    if (question.mode === 'recall') {
      await expect(page.getByText(question.memory!, { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Che câu và thử nhớ' }).click()
      await expect(page.getByText(question.memory!, { exact: true })).toHaveCount(0)
    }
    await page.locator('#arcade-answer').fill(question.answer[0])
  } else if (question.mode === 'pair-match') {
    for (const [index, id] of question.answer.entries())
      await page.locator(`#arcade-pair-${index}`).selectOption(id)
  } else {
    const group = page.getByRole('group', { name: 'Chọn đáp án' })
    for (const id of question.answer) {
      const index = question.choices.findIndex(choice => choice.id === id)
      await group.getByRole('button').nth(index).click()
    }
  }
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Chính xác!', exact: true })).toBeVisible()
  await expect(
    page.getByRole('link', { name: `Đọc nguồn dòng ${question.passage[0].id}`, exact: true })
  ).toHaveAttribute('href', `/full?line=${question.passage[0].id}`)
}

for (const mode of Object.keys(arcadeModes) as ArcadeMode[]) {
  test(`arcade ${mode}: complete its distinct mechanic and persist result`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`/play/arcade/${mode}`)
    await page.getByRole('button', { name: 'Bắt đầu · 5 câu' }).click()
    const questions = createArcadeQuestions(mode, seed)
    for (const [index, question] of questions.entries()) {
      await answerQuestion(page, question)
      await page
        .getByRole('button', { name: index === 4 ? 'Xem kết quả' : 'Câu tiếp theo', exact: true })
        .click()
    }
    await expect(page.getByRole('heading', { name: 'Bạn đã hoàn thành xưởng thơ!' })).toBeFocused()
    await expect(page.getByText('Tri âm trọn vẹn', { exact: true })).toBeVisible()
    await expect(page.getByText('5/5 câu đúng', { exact: true })).toBeVisible()
    await expect(page.locator('.arcade-review > li')).toHaveCount(5)
    await page.getByRole('link', { name: 'Thử cách chơi khác' }).click()
    await expect(
      page
        .getByRole('link')
        .filter({ has: page.getByRole('heading', { name: arcadeModes[mode].title, exact: true }) })
    ).toContainText('Kỷ lục: 100%')
    await page.reload()
    await expect(
      page
        .getByRole('link')
        .filter({ has: page.getByRole('heading', { name: arcadeModes[mode].title, exact: true }) })
    ).toContainText('Kỷ lục: 100%')
    expect(errors).toEqual([])
  })
}

test('no-hint contract, focused mode, targeted practice and chip undo work at 320px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/play/arcade/word-order')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Bắt đầu · 5 câu' }).click()
  await expect(page.getByRole('button', { name: 'Gợi ý', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Chế độ tập trung' }).click()
  await expect(page.getByRole('button', { name: 'Hiện thông tin' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await page.getByRole('group', { name: 'Chọn đáp án' }).getByRole('button').first().click()
  await expect(page.getByRole('button', { name: /^Gỡ chữ/ })).toHaveCount(1)
  await page.getByRole('button', { name: /^Gỡ chữ/ }).click()
  await expect(page.getByRole('button', { name: /^Gỡ chữ/ })).toHaveCount(0)
  for (let index = 0; index < 5; index++) {
    await page.getByRole('button', { name: 'Bỏ qua câu này' }).click()
    await page
      .getByRole('button', { name: index === 4 ? 'Xem kết quả' : 'Câu tiếp theo', exact: true })
      .click()
  }
  const snapshot = await page.evaluate(() => JSON.stringify(localStorage))
  await page.getByRole('button', { name: 'Ôn riêng 5 câu chưa vững' }).click()
  for (const [index, question] of createArcadeQuestions('word-order', seed).entries()) {
    await answerQuestion(page, question)
    await page
      .getByRole('button', { name: index === 4 ? 'Xem kết quả' : 'Câu tiếp theo', exact: true })
      .click()
  }
  await expect(
    page.getByText('Đã hoàn thành ôn riêng. Lượt ôn này không cộng thêm XP hoặc thành tích.')
  ).toBeVisible()
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toEqual(snapshot)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
})

test('gallery filters learning mechanics and unsupported modes return 404', async ({ page }) => {
  await page.goto('/play/arcade')
  await expect(page.locator('.arcade-mode-card')).toHaveCount(10)
  await page.getByRole('button', { name: 'Nhớ chữ', exact: true }).click()
  await expect(page.locator('.arcade-mode-card')).toHaveCount(2)
  await page.getByRole('button', { name: 'Tất cả', exact: true }).click()
  await expect(page.locator('.arcade-mode-card')).toHaveCount(10)
  const response = await page.goto('/play/arcade/unsupported')
  expect(response?.status()).toBe(404)
})

test('hints and incorrect answers stay out of mastery and become targeted practice', async ({
  page,
}) => {
  await page.goto('/play/arcade/typed-word')
  await page.getByRole('button', { name: 'Bắt đầu · 5 câu' }).click()
  const questions = createArcadeQuestions('typed-word', seed)
  for (const [index, question] of questions.entries()) {
    if (index === 0) {
      await page.getByRole('button', { name: 'Gợi ý', exact: true }).click()
      await expect(page.getByText(question.hint, { exact: true })).toBeVisible()
    }
    if (index === 1) {
      await page.locator('#arcade-answer').fill('chữ không đúng')
      await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Thêm một lần để nhớ.' })).toBeVisible()
    } else await answerQuestion(page, question)
    await page
      .getByRole('button', { name: index === 4 ? 'Xem kết quả' : 'Câu tiếp theo', exact: true })
      .click()
  }
  await expect(page.getByText('4/5 câu đúng', { exact: true })).toBeVisible()
  const progress = await page.evaluate(
    key => JSON.parse(localStorage.getItem(key)!),
    ADVENTURE_STORAGE_KEY
  )
  expect(progress.mastery[String(questions[0].masteryIds[0])]).toBeUndefined()
  expect(progress.mastery[String(questions[1].masteryIds[0])]).toBeUndefined()
  for (const question of questions.slice(2))
    expect(progress.mastery[String(question.masteryIds[0])].count).toBe(1)
  await page.getByRole('button', { name: 'Ôn riêng 2 câu chưa vững' }).click()
  for (const [index, question] of questions.slice(0, 2).entries()) {
    await answerQuestion(page, question)
    await page
      .getByRole('button', { name: index === 1 ? 'Xem kết quả' : 'Câu tiếp theo', exact: true })
      .click()
  }
  expect(
    await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), ADVENTURE_STORAGE_KEY)
  ).toEqual(progress)
})

test('matching controls and gallery remain within narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/play/arcade')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
  await page.goto('/play/arcade/pair-match')
  await page.getByRole('button', { name: 'Bắt đầu · 5 câu' }).click()
  await expect(page.getByRole('combobox')).toHaveCount(3)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
  await answerQuestion(page, createArcadeQuestions('pair-match', seed)[0])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
})
