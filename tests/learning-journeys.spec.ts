import { expect, test, type Page } from '@playwright/test'
import { arenaModes, arenaSettingsKey, createArenaRun, type ArenaSettings } from '../lib/arena'
import { EXPEDITIONS_STORAGE_KEY, type ExpeditionMetric } from '../lib/expeditions'
import { ADVENTURE_STORAGE_KEY } from '../lib/gamification'

function readStore(page: Page, key: string) {
  return page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey) ?? 'null'), key)
}

async function createExpedition(
  page: Page,
  name: string,
  stages: { metric: ExpeditionMetric; target: number }[]
) {
  await page.getByRole('button', { name: 'Tạo lộ trình riêng', exact: true }).click()
  await page.getByRole('textbox', { name: 'Tên mục tiêu', exact: true }).fill(name)
  for (const [index, stage] of stages.entries()) {
    if (index) await page.getByRole('button', { name: 'Thêm chặng', exact: true }).click()
    const group = page.getByRole('group', { name: `Chặng ${index + 1}`, exact: true })
    await group.getByRole('combobox', { name: 'Hoạt động', exact: true }).selectOption(stage.metric)
    await group.getByRole('spinbutton').fill(String(stage.target))
  }
  await page.getByRole('button', { name: 'Lưu lộ trình riêng', exact: true }).click()
  return page.getByRole('article', { name, exact: true })
}

test('arena second chances preserve first-answer scoring and persist the completed record', async ({
  page,
}) => {
  const settings: ArenaSettings = {
    modes: ['accents'],
    length: 3,
    from: 1,
    to: 6,
    savedOnly: false,
    savedIds: [],
    seed: 'arena-browser-journey',
    secondChance: true,
  }
  await page.goto('/play/arena')
  for (const [mode, details] of Object.entries(arenaModes)) {
    await page
      .getByRole('checkbox', { name: new RegExp(`^${details.title}`) })
      .setChecked(mode === 'accents')
  }
  await page.getByRole('spinbutton', { name: 'Từ dòng', exact: true }).fill('1')
  await page.getByRole('spinbutton', { name: 'Đến dòng', exact: true }).fill('6')
  await page.getByRole('combobox', { name: 'Số câu', exact: true }).selectOption('3')
  await page.getByRole('checkbox', { name: 'Cho thử lại sau lần sai đầu' }).check()
  await page.getByRole('combobox', { name: 'Kiểu hạt giống' }).selectOption('custom')
  await page.getByRole('textbox', { name: 'Hạt giống tự đặt' }).fill(settings.seed)
  await page.getByRole('button', { name: 'Bắt đầu luyện', exact: true }).click()

  for (const [index, question] of createArenaRun(settings).questions.entries()) {
    const choices = page.getByRole('group', { name: 'Chọn đáp án', exact: true })
    await page.getByRole('radio', { name: '75%', exact: true }).check()
    if (index === 0) {
      const wrong = question.choices.find(choice => choice.id !== question.answer)!
      await choices.getByRole('radio', { name: wrong.text, exact: true }).check()
      await page.getByRole('button', { name: 'Kiểm tra đáp án', exact: true }).click()
      await expect(
        page.getByRole('heading', { name: 'Chưa đúng. Bạn còn một lần thử.' })
      ).toBeFocused()
      await page.getByRole('button', { name: 'Thử lần thứ hai', exact: true }).click()
      await expect(page.getByRole('radio', { name: '75%', exact: true })).toBeChecked()
      await expect(page.getByRole('radio', { name: '100%', exact: true })).toBeDisabled()
      await expect(
        choices.getByRole('radio', { name: `${wrong.text} · Đã thử, chưa đúng`, exact: true })
      ).toBeDisabled()
    }
    const correct = question.choices.find(choice => choice.id === question.answer)!
    await choices.getByRole('radio', { name: correct.text, exact: true }).check()
    await page.getByRole('button', { name: 'Kiểm tra đáp án', exact: true }).click()
    await expect(
      page.getByRole('link', { name: `Đọc nguồn dòng ${question.passage[0].id}`, exact: true })
    ).toHaveAttribute('href', `/full?line=${question.passage[0].id}`)
    expect((await readStore(page, ADVENTURE_STORAGE_KEY))?.stats.sessions ?? 0).toBe(0)
    await page
      .getByRole('button', { name: index === 2 ? 'Xem kết quả luyện' : 'Câu tiếp', exact: true })
      .click()
  }
  await expect(page.getByRole('heading', { name: 'Bạn đã khép lại một lượt luyện.' })).toBeFocused()
  await expect(page.getByText('2/3 câu đúng lần đầu', { exact: true })).toBeVisible()
  await expect(page.getByText('1 câu tìm ra ở lần thử thứ hai.', { exact: true })).toBeVisible()
  const adventure = await readStore(page, ADVENTURE_STORAGE_KEY)
  expect(adventure.stats.sessions).toBe(1)
  expect(adventure.stats.correct).toBe(2)
  const record = await readStore(page, 'kieu-arena-v1')
  expect(record.best[arenaSettingsKey(settings)]).toMatchObject({ correct: 2, total: 3 })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Bắt đầu luyện', exact: true })).toBeEnabled()
  expect(await readStore(page, 'kieu-arena-v1')).toEqual(record)
  expect(await readStore(page, ADVENTURE_STORAGE_KEY)).toEqual(adventure)
})

test('an expedition measures real activity between checkpoints and preserves its certificate', async ({
  page,
}) => {
  await page.goto('/play/expeditions')
  const route = await createExpedition(page, 'Một trang và một chủ đề', [
    { metric: 'read', target: 1 },
    { metric: 'topic', target: 1 },
  ])
  await route.getByRole('button', { name: 'Khởi hành lộ trình', exact: true }).click()
  await expect(route.getByRole('button', { name: 'Xác nhận chặng 1' })).toBeDisabled()
  await route.getByRole('link', { name: 'Mở trang thơ chưa đọc' }).click()
  await page.getByRole('button', { name: 'Đã đọc 40 dòng', exact: true }).click()
  await page.goto('/play/expeditions')
  await route.getByRole('button', { name: 'Xác nhận chặng 1' }).click()
  await expect(route.getByRole('button', { name: 'Xác nhận chặng 2' })).toBeDisabled()
  await route.getByRole('link', { name: 'Chọn một chủ đề chưa khám phá' }).click()
  await page.getByRole('button', { name: 'Tình yêu', exact: true }).click()
  const adventure = await readStore(page, ADVENTURE_STORAGE_KEY)
  await page.goto('/play/expeditions')
  await route.getByRole('button', { name: 'Xác nhận chặng 2' }).click()
  await expect(page.getByLabel('Chứng nhận Một trang và một chủ đề', { exact: true })).toBeVisible()
  const state = await readStore(page, EXPEDITIONS_STORAGE_KEY)
  expect(state.routes[0].status).toBe('completed')
  expect(state.routes[0].attempts[0].checkpoints).toHaveLength(2)
  expect(await readStore(page, ADVENTURE_STORAGE_KEY)).toEqual(adventure)
  await page.reload()
  await expect(page.getByLabel('Chứng nhận Một trang và một chủ đề', { exact: true })).toBeVisible()
  expect(await readStore(page, EXPEDITIONS_STORAGE_KEY)).toEqual(state)
})

test('an exhausted expedition can be stopped with confirmation and another route started', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('/play/expeditions')
  const routeName = `Bốn chủ đề ${'triâm'.repeat(12)}`
  const route = await createExpedition(page, routeName, [
    { metric: 'topic', target: 2 },
    { metric: 'topic', target: 2 },
  ])
  await route.getByRole('button', { name: 'Khởi hành lộ trình', exact: true }).click()
  await route.getByRole('link', { name: 'Chọn một chủ đề chưa khám phá' }).click()
  for (const topic of ['Tình yêu', 'Nhân sinh', 'Thiên nhiên', 'Gia đình']) {
    await page.getByRole('button', { name: topic, exact: true }).click()
  }
  await page.goto('/play/expeditions')
  await route.getByRole('button', { name: 'Xác nhận chặng 1' }).click()
  await expect(route.getByRole('button', { name: 'Xác nhận chặng 2' })).toBeDisabled()
  const before = await readStore(page, EXPEDITIONS_STORAGE_KEY)
  const adventure = await readStore(page, ADVENTURE_STORAGE_KEY)
  const stop = route.getByRole('button', { name: 'Dừng lần đi này', exact: true })
  await stop.click()
  const dialog = page.getByRole('alertdialog', { name: `Dừng lần đi “${routeName}”?` })
  await expect(dialog.getByRole('button', { name: 'Tiếp tục lần đi' })).toBeFocused()
  await dialog.getByRole('button', { name: 'Tiếp tục lần đi' }).press('Escape')
  await expect(stop).toBeFocused()
  expect(await readStore(page, EXPEDITIONS_STORAGE_KEY)).toEqual(before)
  await stop.click()
  await dialog.getByRole('button', { name: 'Tiếp tục lần đi' }).click()
  expect(await readStore(page, EXPEDITIONS_STORAGE_KEY)).toEqual(before)
  await stop.click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  )
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(
    true
  )
  await dialog.getByRole('button', { name: 'Xác nhận dừng lần đi' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(route.getByRole('button', { name: 'Sửa mục tiêu riêng' })).toBeVisible()
  const stopped = await readStore(page, EXPEDITIONS_STORAGE_KEY)
  expect(stopped.routes[0]).toMatchObject({ status: 'draft', attempts: [] })
  expect(await readStore(page, ADVENTURE_STORAGE_KEY)).toEqual(adventure)
  await page.reload()
  await expect(route.getByRole('button', { name: 'Sửa mục tiêu riêng' })).toBeVisible()
  expect(await readStore(page, EXPEDITIONS_STORAGE_KEY)).toEqual(stopped)
  await page.getByRole('button', { name: 'Chọn lộ trình này', exact: true }).first().click()
  const nextRoute = page.getByRole('article', { name: 'Bước chân vào vườn thơ', exact: true })
  await nextRoute.getByRole('button', { name: 'Khởi hành lộ trình', exact: true }).click()
  await expect(nextRoute.getByRole('button', { name: 'Xác nhận chặng 1' })).toBeDisabled()
  expect((await readStore(page, EXPEDITIONS_STORAGE_KEY)).routes[1].status).toBe('active')
})

test('a stop confirmation preserves a newer attempt from another tab until explicitly reopened', async ({
  page,
  context,
}) => {
  await page.goto('/play/expeditions')
  const name = 'Hai trang, hai lời hẹn'
  const route = await createExpedition(page, name, [
    { metric: 'read', target: 1 },
    { metric: 'read', target: 1 },
  ])
  await route.getByRole('button', { name: 'Khởi hành lộ trình', exact: true }).click()
  await route.getByRole('button', { name: 'Dừng lần đi này', exact: true }).click()
  const dialog = page.getByRole('alertdialog', { name: `Dừng lần đi “${name}”?` })
  await expect(dialog).toBeVisible()

  const second = await context.newPage()
  await second.goto('/play/expeditions')
  const secondRoute = second.getByRole('article', { name, exact: true })
  for (const stage of [1, 2]) {
    await secondRoute.getByRole('link', { name: 'Mở trang thơ chưa đọc' }).click()
    await second.getByRole('button', { name: 'Đã đọc 40 dòng', exact: true }).click()
    await second.goto('/play/expeditions')
    await secondRoute.getByRole('button', { name: `Xác nhận chặng ${stage}` }).click()
  }
  const completed = (await readStore(second, EXPEDITIONS_STORAGE_KEY)).routes[0].attempts[0]
  await secondRoute.getByRole('button', { name: 'Đi lại từ đầu', exact: true }).click()
  await secondRoute.getByRole('link', { name: 'Mở trang thơ chưa đọc' }).click()
  await second.getByRole('button', { name: 'Đã đọc 40 dòng', exact: true }).click()
  await second.goto('/play/expeditions')
  await secondRoute.getByRole('button', { name: 'Xác nhận chặng 1' }).click()
  const latest = await readStore(second, EXPEDITIONS_STORAGE_KEY)
  expect(latest.routes[0].attempts).toHaveLength(2)
  expect(latest.routes[0].attempts[1].checkpoints).toHaveLength(1)
  const adventure = await readStore(second, ADVENTURE_STORAGE_KEY)

  await dialog.getByRole('button', { name: 'Xác nhận dừng lần đi' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByRole('status').filter({ hasText: 'Lần đi đã thay đổi từ khi bạn mở xác nhận.' })
  ).toBeVisible()
  expect(await readStore(page, EXPEDITIONS_STORAGE_KEY)).toEqual(latest)
  await route.getByRole('button', { name: 'Dừng lần đi này', exact: true }).click()
  await dialog.getByRole('button', { name: 'Xác nhận dừng lần đi' }).click()
  await expect(page.getByLabel(`Chứng nhận ${name}`, { exact: true })).toBeVisible()
  const stopped = await readStore(page, EXPEDITIONS_STORAGE_KEY)
  expect(stopped.routes[0]).toMatchObject({ status: 'completed', attempts: [completed] })
  expect(await readStore(page, ADVENTURE_STORAGE_KEY)).toEqual(adventure)
  await expect(second.getByLabel(`Chứng nhận ${name}`, { exact: true })).toBeVisible()
  await second.close()
})

test('a same-day stop and restart in another tab invalidates the original confirmation', async ({
  page,
  context,
}) => {
  await page.goto('/play/expeditions')
  const name = 'Một lời hẹn mới'
  const route = await createExpedition(page, name, [{ metric: 'read', target: 1 }])
  await route.getByRole('button', { name: 'Khởi hành lộ trình', exact: true }).click()
  const original = (await readStore(page, EXPEDITIONS_STORAGE_KEY)).routes[0].attempts[0]
  await route.getByRole('button', { name: 'Dừng lần đi này', exact: true }).click()
  const dialog = page.getByRole('alertdialog', { name: `Dừng lần đi “${name}”?` })
  await expect(dialog).toBeVisible()

  const second = await context.newPage()
  await second.goto('/play/expeditions')
  const secondRoute = second.getByRole('article', { name, exact: true })
  await secondRoute.getByRole('button', { name: 'Dừng lần đi này', exact: true }).click()
  await second
    .getByRole('alertdialog', { name: `Dừng lần đi “${name}”?` })
    .getByRole('button', { name: 'Xác nhận dừng lần đi' })
    .click()
  await secondRoute.getByRole('button', { name: 'Khởi hành lộ trình', exact: true }).click()
  const restarted = await readStore(second, EXPEDITIONS_STORAGE_KEY)
  const latest = restarted.routes[0].attempts[0]
  expect(latest.id).not.toBe(original.id)
  expect(latest).toEqual({ ...original, id: latest.id })

  await dialog.getByRole('button', { name: 'Xác nhận dừng lần đi' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByRole('status').filter({ hasText: 'Lần đi đã thay đổi từ khi bạn mở xác nhận.' })
  ).toBeVisible()
  expect(await readStore(page, EXPEDITIONS_STORAGE_KEY)).toEqual(restarted)
  await route.getByRole('button', { name: 'Dừng lần đi này', exact: true }).click()
  await dialog.getByRole('button', { name: 'Xác nhận dừng lần đi' }).click()
  await expect(route.getByRole('button', { name: 'Khởi hành lộ trình', exact: true })).toBeEnabled()
  expect((await readStore(page, EXPEDITIONS_STORAGE_KEY)).routes[0].attempts).toEqual([])
  await second.close()
})
