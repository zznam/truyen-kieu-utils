import { test, expect, type Page } from '@playwright/test'
import { emptyAdventure } from '../lib/gamification'
import { verses, words } from '../lib/kieu'

const storageKey = 'kieu-adventure-v1'
const readState = (page: Page) =>
  page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), storageKey)

test('blocked storage keeps the adventure usable in memory', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Blocked', 'SecurityError')
    }
  })
  await page.goto('/full?line=1')
  await page.getByRole('button', { name: 'Đã đọc 40 dòng', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Đã đọc trang này' })).toBeDisabled()
  await page.getByRole('link', { name: 'Xem nhiệm vụ và phần thưởng' }).click()
  await expect(
    page.getByText('Trình duyệt chưa lưu được hành trình.', { exact: false })
  ).toBeVisible()
  await expect(page.getByLabel('Hành trình của bạn').getByText('80', { exact: true })).toBeVisible()
})

test('malformed adventure data recovers and sequential tabs share claims', async ({
  page,
  context,
}) => {
  await page.goto('/play/adventure')
  await page.evaluate(key => localStorage.setItem(key, '{broken'), storageKey)
  await page.reload()
  await expect(page.getByRole('tab', { name: 'Hôm nay', exact: true })).toBeVisible()
  await page.goto('/full?line=1')
  await page.getByRole('button', { name: 'Đã đọc 40 dòng', exact: true }).click()
  const second = await context.newPage()
  await second.goto('/play/adventure')
  await second.getByRole('tab', { name: 'Nhiệm vụ', exact: true }).click()
  const quest = second
    .locator('.adventure-card')
    .filter({ has: second.getByRole('heading', { name: 'Mười hai dòng thơ', exact: true }) })
  await quest.getByRole('button', { name: 'Nhận phần thưởng', exact: true }).click()
  await page.getByRole('link', { name: 'Xem nhiệm vụ và phần thưởng' }).click()
  await page.getByRole('tab', { name: 'Nhiệm vụ', exact: true }).click()
  const mirrored = page
    .locator('.adventure-card')
    .filter({ has: page.getByRole('heading', { name: 'Mười hai dòng thơ', exact: true }) })
  await expect(mirrored.getByRole('button', { name: 'Đã nhận thưởng' })).toBeDisabled()
  expect((await readState(page)).claimedQuests).toHaveLength(1)
  await second.close()
})

test('claim a reading quest, buy a cosmetic, pin a badge and restore a backup', async ({
  page,
}) => {
  await page.goto('/full?line=1')
  await page.getByRole('button', { name: 'Đã đọc 40 dòng', exact: true }).click()
  await page.goto('/play/adventure')
  await page.getByRole('tab', { name: 'Nhiệm vụ', exact: true }).click()
  const quest = page
    .locator('.adventure-card')
    .filter({ has: page.getByRole('heading', { name: 'Mười hai dòng thơ', exact: true }) })
  await quest.getByRole('button', { name: 'Nhận phần thưởng', exact: true }).click()
  await expect(quest.getByRole('button', { name: 'Đã nhận thưởng' })).toBeDisabled()
  expect((await readState(page)).claimedQuests).toHaveLength(1)
  await page.getByRole('tab', { name: 'Đường thơ', exact: true }).click()
  await page.getByRole('button', { name: 'Nhận thưởng chặng', exact: true }).click()
  expect((await readState(page)).claimedChapters).toEqual(['opening'])
  await page.getByRole('tab', { name: 'Quà tặng', exact: true }).click()
  const gift = page
    .locator('.adventure-card')
    .filter({ has: page.getByRole('heading', { name: 'Hoa sen', exact: true }) })
  await gift.getByRole('button', { name: 'Đổi món quà', exact: true }).click()
  await gift.getByRole('button', { name: 'Sử dụng món quà' }).click()
  expect((await readState(page)).profile.avatar).toBe('🪷')
  await page.getByRole('tab', { name: 'Dấu ấn', exact: true }).click()
  const badge = page
    .locator('.adventure-card')
    .filter({ has: page.getByRole('heading', { name: 'Trang đầu', exact: true }) })
  await badge.getByRole('button', { name: 'Ghim lên lời chào' }).click()
  expect((await readState(page)).pinnedAchievement).toBe('reader')
  await page.getByRole('tab', { name: 'Góc của bạn', exact: true }).click()
  await page.getByLabel('Bạn muốn được gọi là gì?').fill('Người đọc thử')
  await page.getByRole('button', { name: 'Lưu tên gọi' }).click()
  const original = await readState(page)
  await page.getByText('Hoặc dán nội dung bản sao', { exact: true }).click()
  await page.getByLabel('Nội dung JSON').fill('{broken')
  await page.getByRole('button', { name: 'Xem trước bản sao' }).click()
  await expect(page.getByRole('button', { name: 'Thay thế bằng bản sao này' })).toHaveCount(0)
  expect(await readState(page)).toEqual(original)
  const restored = { ...original, profile: { ...original.profile, name: 'Đã khôi phục' } }
  await page
    .getByLabel('Nội dung JSON')
    .fill(JSON.stringify({ app: 'kieu-adventure', version: 1, state: restored }))
  await page.getByRole('button', { name: 'Xem trước bản sao' }).click()
  expect((await readState(page)).profile.name).toBe('Người đọc thử')
  await page.getByRole('button', { name: 'Thay thế bằng bản sao này' }).click()
  await page.reload()
  expect((await readState(page)).profile.name).toBe('Đã khôi phục')
})

test('targeted review rewards unaided recall once per local day', async ({ page }) => {
  const state = emptyAdventure()
  state.readIds = [1, 2, 3, 4, 5]
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value))
    },
    { key: storageKey, value: state }
  )
  await page.goto('/play/mastery')
  await page.getByRole('button', { name: 'Ôn 5 dòng đến hẹn' }).click()
  for (let index = 0; index < 5; index++) {
    await page
      .getByLabel('Chữ cuối còn thiếu')
      .fill(words(verses[index].text).at(-1)!.normalize('NFD'))
    await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Bạn đã nhớ đúng!' })).toBeVisible()
    await page
      .getByRole('button', {
        name: index === 4 ? 'Hoàn thành lượt ôn' : 'Dòng tiếp theo',
        exact: true,
      })
      .click()
  }
  const result = await readState(page)
  expect(result.stats.reviews).toBe(5)
  expect(result.mastery['1'].count).toBe(1)
  await page.getByRole('button', { name: 'Chọn lượt ôn tiếp' }).click()
  await expect(page.getByRole('heading', { name: '0 dòng đến hẹn ôn' })).toBeVisible()
})

test('reader credits confirmed lines once and bookmarks cannot farm rewards', async ({ page }) => {
  await page.goto('/full?line=1')
  const confirm = page.getByRole('button', { name: 'Đã đọc 40 dòng', exact: true })
  await expect(confirm).toBeEnabled()
  expect((await readState(page)).readIds ?? []).toHaveLength(0)
  await confirm.click()
  await expect(page.getByRole('button', { name: 'Đã đọc trang này' })).toBeDisabled()
  const first = await readState(page)
  expect(first.readIds).toHaveLength(40)
  expect(first.xp).toBeGreaterThan(0)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Đã đọc trang này' })).toBeDisabled()
  expect((await readState(page)).xp).toBe(first.xp)
  await page.getByRole('button', { name: 'Lưu đoạn dòng 1', exact: true }).click()
  const saved = await readState(page)
  expect(saved.savedIds).toContain(1)
  await page.getByRole('button', { name: 'Bỏ lưu đoạn dòng 1', exact: true }).click()
  await page.getByRole('button', { name: 'Lưu đoạn dòng 1', exact: true }).click()
  expect((await readState(page)).xp).toBe(saved.xp)
})

test('focus session requires completion, supports pause, and records reading', async ({ page }) => {
  await page.clock.install()
  await page.goto('/full?line=1')
  await page.getByRole('button', { name: 'Bắt đầu tập trung' }).click()
  await page.clock.runFor(10000)
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click()
  const paused = await page.getByRole('timer').textContent()
  await page.clock.runFor(10000)
  await expect(page.getByRole('timer')).toHaveText(paused!)
  expect((await readState(page)).stats?.focusMinutes ?? 0).toBe(0)
  await page.getByRole('button', { name: 'Tiếp tục tập trung' }).click()
  await page.clock.runFor(51000)
  await page.getByRole('button', { name: 'Hoàn thành phiên đọc' }).click()
  const state = await readState(page)
  expect(state.stats.focusMinutes).toBe(1)
  expect(state.readIds).toHaveLength(40)
})

test('exploration, composition and reflection feed quests without storing private text', async ({
  page,
}) => {
  await page.goto('/lay-kieu')
  await page.getByRole('button', { name: 'Tình yêu', exact: true }).click()
  const explored = await readState(page)
  expect(explored.topics).toContain('love')
  await page.getByRole('button', { name: 'Tình yêu', exact: true }).click()
  expect((await readState(page)).xp).toBe(explored.xp)
  await page.getByRole('button', { name: 'Ghép Lẩy Kiều', exact: true }).click()
  await expect.poll(async () => (await readState(page)).stats?.created).toBe(1)
  await page.goto('/divination')
  await page.getByLabel('Điều bạn đang nghĩ đến').fill('private reflection never persisted')
  await page.getByRole('button', { name: 'Đón nhận câu Kiều' }).click()
  await page.getByRole('button', { name: 'Đánh dấu đã chiêm nghiệm' }).click()
  const state = await readState(page)
  expect(state.stats.reflected).toBe(1)
  expect(JSON.stringify(state)).not.toContain('private reflection')
})

test('classic completion updates adventure while unfinished rounds do not', async ({ page }) => {
  await page.goto('/play/missing')
  await page.getByRole('button', { name: 'Bắt đầu · 5 câu' }).click()
  for (let index = 0; index < 5; index++) {
    await page.getByRole('button', { name: 'Bỏ qua câu này' }).click()
    expect((await readState(page)).stats?.sessions ?? 0).toBe(0)
    await page
      .getByRole('button', { name: index === 4 ? 'Xem kết quả' : 'Câu tiếp theo', exact: true })
      .click()
  }
  expect((await readState(page)).stats.sessions).toBe(1)
  await page.reload()
  expect((await readState(page)).stats.sessions).toBe(1)
})

test('adventure panels retain filters, drafts and backup previews across tab changes', async ({
  page,
}) => {
  await page.goto('/play/adventure')
  const profileTab = page.getByRole('tab', { name: 'Góc của bạn', exact: true })
  await profileTab.click()
  await page.getByLabel('Bạn muốn được gọi là gì?').fill('Bản nháp chưa lưu')
  await page.getByText('Hoặc dán nội dung bản sao', { exact: true }).click()
  await page.getByLabel('Nội dung JSON', { exact: true }).fill(
    JSON.stringify({
      app: 'kieu-adventure',
      version: 1,
      state: emptyAdventure(),
    })
  )
  await page.getByRole('button', { name: 'Xem trước bản sao', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Xem trước: Bạn đọc', exact: true })).toBeVisible()

  await page.getByRole('tab', { name: 'Dấu ấn', exact: true }).click()
  await page.getByRole('searchbox').fill('ĐỌC')
  await page.getByRole('combobox', { name: /^Trạng thái/ }).selectOption('pending')
  await expect(page.getByRole('heading', { name: 'Trang đầu', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Bộ sưu tập', exact: true }).click()
  await page.getByRole('tab', { name: 'Sổ luyện', exact: true }).click()
  await page.getByRole('tab', { name: 'Quà tặng', exact: true }).click()
  await page.getByRole('tab', { name: 'Đường thơ', exact: true }).click()
  await page.getByRole('tab', { name: 'Dấu ấn', exact: true }).click()
  await expect(page.getByRole('searchbox')).toHaveValue('ĐỌC')
  await expect(page.getByRole('combobox', { name: /^Trạng thái/ })).toHaveValue('pending')

  await profileTab.click()
  await expect(page.getByLabel('Bạn muốn được gọi là gì?')).toHaveValue('Bản nháp chưa lưu')
  await expect(page.getByRole('heading', { name: 'Xem trước: Bạn đọc', exact: true })).toBeVisible()
  await expect(profileTab).toBeFocused()
  await profileTab.press('Home')
  await expect(page.getByRole('tab', { name: 'Hôm nay', exact: true })).toBeFocused()
  expect((await readState(page)).profile?.name ?? '').toBe('')
})
