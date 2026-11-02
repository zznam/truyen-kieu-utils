import { expect, test, type Page } from '@playwright/test'
import { STUDIO_STORAGE_KEY, type StudioState } from '../lib/studio'

const readStudio = (page: Page): Promise<StudioState> =>
  page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), STUDIO_STORAGE_KEY)

test('a personal deck keeps notes, deduplicates source pairs and schedules a complete study session', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const now = new Date('2026-10-30T05:00:00Z')
  await page.clock.setFixedTime(now)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/play/studio')
  await expect(page.getByRole('heading', { name: 'Đặt tên cho một cách nhớ.' })).toBeVisible()
  const progressBefore = await page.evaluate(() => ({
    adventure: localStorage.getItem('kieu-adventure-v1'),
    classic: localStorage.getItem('kieu-games-v1'),
  }))

  await page.getByLabel('Tên bộ thẻ mới', { exact: true }).fill('Những câu mở đầu')
  await page.getByRole('button', { name: 'Tạo bộ thẻ', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Những câu mở đầu' })).toBeVisible()
  const line = page.getByLabel('Số dòng trong bản nhập', { exact: true })
  await line.fill('1')
  await page.getByRole('button', { name: 'Thêm thẻ theo dòng' }).click()
  await expect(page.getByRole('article', { name: 'Thẻ dòng 1', exact: true })).toBeVisible()
  await line.fill('2')
  await page.getByRole('button', { name: 'Thêm thẻ theo dòng' }).click()
  await expect(page.getByRole('status')).toContainText('Cặp thơ này đã có trong bộ thẻ')
  await expect(page.getByRole('article')).toHaveCount(1)
  await line.fill('3')
  await page.getByRole('button', { name: 'Thêm thẻ theo dòng' }).click()
  await expect(page.getByRole('article')).toHaveCount(2)

  const firstCard = page.getByRole('article', { name: 'Thẻ dòng 1', exact: true })
  await firstCard.getByRole('button', { name: 'Yêu thích thẻ 1', exact: true }).click()
  await firstCard.getByText('Ghi chú và nhãn riêng', { exact: true }).click()
  await firstCard
    .getByRole('textbox', { name: 'Ghi chú cho thẻ 1', exact: true })
    .fill('Nhớ sự đối lập tài và mệnh.')
  await firstCard.getByLabel('Nhãn cho thẻ 1', { exact: true }).fill('Mở đầu, cảm nhận')
  await firstCard.getByRole('button', { name: 'Lưu ghi chú và nhãn' }).click()
  await page.reload()
  await expect(
    firstCard.getByRole('button', { name: 'Yêu thích thẻ 1', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  await firstCard.getByText('Ghi chú và nhãn riêng', { exact: true }).click()
  await expect(firstCard.locator('details')).toHaveJSProperty('open', true)
  await expect(
    firstCard.getByRole('textbox', { name: 'Ghi chú cho thẻ 1', exact: true })
  ).toHaveValue('Nhớ sự đối lập tài và mệnh.')
  await expect(firstCard.getByLabel('Nhãn cho thẻ 1', { exact: true })).toHaveValue(
    'mở đầu, cảm nhận'
  )
  await page.getByLabel('Tìm thẻ', { exact: true }).fill('cam nhan')
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.getByLabel('Tìm thẻ', { exact: true }).fill('')
  await page.getByRole('button', { name: 'Bắt đầu tự ôn · 2 thẻ', exact: true }).click()

  const study = page.getByRole('region', { name: 'Lượt tự ôn' })
  await expect(study.getByRole('heading', { name: 'Thẻ 1 / 2' })).toBeFocused()
  await expect(study.getByRole('group', { name: 'Tự đánh giá mức nhớ' })).toHaveCount(0)
  await study.getByRole('button', { name: 'Lật mặt sau' }).click()
  await expect(study.getByText('Chữ tài chữ mệnh khéo là ghét nhau', { exact: true })).toBeVisible()
  await expect(study.getByText('Ghi chú riêng: Nhớ sự đối lập tài và mệnh.')).toBeVisible()
  await expect(
    study.getByRole('link', { name: 'Đọc nguồn dòng 2 ↗', exact: true })
  ).toHaveAttribute('href', '/full?line=2')
  await study.getByRole('button', { name: 'Nhớ 3 ngày nữa', exact: true }).click()
  await expect(study.getByRole('heading', { name: 'Thẻ 2 / 2' })).toBeFocused()
  await study.getByRole('button', { name: 'Lật mặt sau' }).click()
  await study.getByRole('button', { name: 'Chưa nhớ 10 phút nữa', exact: true }).click()
  await expect(study.getByRole('heading', { name: 'Đã hoàn thành lượt tự ôn.' })).toBeFocused()
  await expect(
    study.getByText('2 thẻ đã ôn · Các đánh giá đã được lưu vào lịch hẹn.')
  ).toBeVisible()

  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Bắt đầu tự ôn · 0 thẻ', exact: true })
  ).toBeDisabled()
  const saved = await readStudio(page)
  expect(saved.decks).toHaveLength(1)
  expect(saved.decks[0].cards).toEqual([
    expect.objectContaining({
      verseId: 1,
      reviews: 1,
      intervalDays: 3,
      dueAt: now.getTime() + 3 * 86_400_000,
      note: 'Nhớ sự đối lập tài và mệnh.',
      tags: ['mở đầu', 'cảm nhận'],
      favorite: true,
    }),
    expect.objectContaining({
      verseId: 3,
      reviews: 1,
      intervalDays: 0,
      dueAt: now.getTime() + 10 * 60_000,
    }),
  ])
  expect(Object.values(saved.days)).toEqual([{ again: 1, hard: 0, good: 1, easy: 0 }])
  expect(
    await page.evaluate(() => ({
      adventure: localStorage.getItem('kieu-adventure-v1'),
      classic: localStorage.getItem('kieu-games-v1'),
    }))
  ).toEqual(progressBefore)
  await firstCard.getByRole('link', { name: 'Đọc ngữ cảnh dòng 1 ↗', exact: true }).click()
  await expect(page).toHaveURL(/\/full\?line=1$/)
  await expect(page.locator('#line-1')).toHaveClass(/highlighted/)
  expect(errors).toEqual([])
})

test('importing saved passages twice adds only new cards and preserves the original bookmark', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/full?line=1')
  await page.getByRole('button', { name: 'Lưu đoạn dòng 1', exact: true }).click()
  await page.goto('/play/studio')
  await page.getByLabel('Tên bộ thẻ mới', { exact: true }).fill('Từ dấu trang')
  await page.getByRole('button', { name: 'Tạo bộ thẻ', exact: true }).click()
  const importButton = page.getByRole('button', { name: 'Nhập các câu đã lưu (1)', exact: true })
  await importButton.click()
  await expect(page.getByRole('status')).toContainText('Đã nhập 1 thẻ mới')
  await importButton.click()
  await expect(page.getByRole('status')).toContainText('Đã nhập 0 thẻ mới')
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.reload()
  await expect(page.getByRole('article', { name: 'Thẻ dòng 1', exact: true })).toBeVisible()
  expect((await readStudio(page)).decks[0].cards.map(card => card.verseId)).toEqual([1])
  await page.goto('/saved')
  await expect(page.locator('.passage-card')).toHaveCount(1)
  await expect(page.locator('.passage-card')).toContainText('Trăm năm')
  expect(errors).toEqual([])
})
