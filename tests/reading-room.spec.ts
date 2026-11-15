import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const key = 'kieu-reading-room-v1'
async function openNotebook(page: Page) {
  await page.getByRole('tab', { name: 'Sổ đọc', exact: true }).click()
}
async function addExcerpt(page: Page, title: string) {
  await page.getByLabel('Tên cho đoạn đọc').fill(title)
  await page.getByRole('button', { name: 'Thêm vào sổ đọc', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Đã có trong sổ', exact: true })).toBeDisabled()
}

test('source passages open the reading room with a reloadable excerpt link', async ({ page }) => {
  await page.goto('/full?line=129')
  await page.locator('#line-129 .verse-text-button').click()
  await page.getByRole('dialog').getByRole('link', { name: 'Phòng đọc', exact: true }).click()
  await expect(page).toHaveURL(/reading-room\?from=129&to=129/)
  await expect(page.locator('.room-line')).toHaveCount(1)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Đọc dòng 129', exact: true })).toBeVisible()
  await page
    .context()
    .grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(page.url()).origin })
  await page.getByRole('button', { name: 'Sao chép liên kết đoạn', exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('/reading-room?from=129&to=129&at=129')
  await page.getByRole('button', { name: 'Sao chép đoạn có nguồn', exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('Nguyễn Du, Truyện Kiều')
  await page.getByLabel('Từ dòng', { exact: true }).fill('1')
  await page.getByLabel('Đến dòng', { exact: true }).fill('41')
  await page.getByRole('button', { name: 'Mở đoạn đọc', exact: true }).click()
  await expect(page.locator('.reading-room').getByRole('alert')).toContainText('tối đa 40 dòng')
  await expect(page.locator('.room-line')).toHaveCount(1)
})

test('context, keyboard spotlight, memory hints and focus view stay usable', async ({ page }) => {
  await page.goto('/reading-room?from=1&to=2')
  await page.getByLabel('Ngữ cảnh xung quanh').selectOption('2')
  await expect(page.getByLabel('Ngữ cảnh sau')).toContainText('Trải qua một cuộc bể dâu')
  await expect(page.getByLabel('Ngữ cảnh trước')).toHaveCount(0)
  await page.getByLabel('Gợi ý ghi nhớ').selectOption('endings')
  await expect(page.locator('.room-line').first()).toContainText('Trăm năm trong cõi ____ ____')
  await page.getByRole('button', { name: 'Hiện dòng 1', exact: true }).click()
  await expect(page.locator('.room-line').first()).toContainText('Trăm năm trong cõi người ta')
  await page.getByLabel('Gợi ý ghi nhớ').selectOption('initials')
  await expect(page.locator('.room-line').first()).toContainText('T… n… t… c… n… t…')
  await page.getByLabel('Dùng phím lên xuống để đọc từng dòng').focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('button', { name: 'Đọc dòng 2', exact: true })).toHaveAttribute(
    'aria-current',
    'step'
  )
  await page.getByRole('button', { name: 'Chế độ tập trung', exact: true }).click()
  await expect(page.getByLabel('Từ dòng', { exact: true })).toBeHidden()
  await expect(page.locator('.room-lines')).toBeVisible()
  await page.getByRole('button', { name: 'Rời chế độ tập trung', exact: true }).click()
  await page.getByLabel('Cỡ chữ phòng đọc').selectOption('30')
  await page.reload()
  await expect(page.getByLabel('Cỡ chữ phòng đọc')).toHaveValue('30')
})

test('written recall identifies a missing word and keeps the draft across tabs', async ({
  page,
}) => {
  await page.goto('/reading-room?from=1&to=1')
  await page.getByLabel('Đoạn thơ bạn nhớ').fill('Trăm trong cõi người ta')
  await page.getByRole('button', { name: 'Đối chiếu bài nhớ', exact: true }).click()
  await expect(page.locator('.room-feedback')).toContainText('5/6 từ đúng')
  await expect(page.locator('.room-feedback')).toContainText('Thiếu: năm')
  await openNotebook(page)
  await page.getByRole('tab', { name: 'Đọc & nhớ', exact: true }).click()
  await expect(page.getByLabel('Đoạn thơ bạn nhớ')).toHaveValue('Trăm trong cõi người ta')
  await page.getByLabel('Đoạn thơ bạn nhớ').fill('TRĂM NĂM trong cõi người ta!')
  await page.getByRole('button', { name: 'Đối chiếu bài nhớ', exact: true }).click()
  await expect(page.locator('.room-feedback')).toContainText('Bạn đã nhớ đúng từng từ!')
})

test('comparison and word lookup distinguish accents and preserve tab drafts', async ({ page }) => {
  await page.goto('/reading-room?from=1&to=2')
  await page.getByRole('tab', { name: 'Đọc & nhớ', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Đối chiếu & tra từ' })).toBeFocused()
  await page.getByLabel('Từ dòng đối chiếu').fill('29')
  await page.getByLabel('Đến dòng đối chiếu').fill('30')
  await page.getByRole('button', { name: 'Đặt cạnh nhau', exact: true }).click()
  await expect(page.getByLabel('Đoạn đối chiếu', { exact: true })).toContainText('Pha nghề thi họa')
  await page.getByLabel('Từ hoặc cụm từ').fill('họa')
  await expect(page.locator('.room-concordance')).toContainText('Dòng 30')
  await page.getByLabel('Từ hoặc cụm từ').fill('hoa')
  await expect(page.locator('.room-concordance')).not.toContainText('Dòng 30')
  await page.getByLabel('Cách tìm').selectOption('loose')
  await expect(page.locator('.room-concordance')).toContainText('Dòng 30')
  await openNotebook(page)
  await page.getByRole('tab', { name: 'Đối chiếu & tra từ' }).click()
  await expect(page.getByLabel('Từ dòng đối chiếu')).toHaveValue('29')
  await expect(page.getByLabel('Từ hoặc cụm từ')).toHaveValue('hoa')
})

test('reading queue resumes, reorders, filters, exports and removes only confirmed entries', async ({
  page,
}) => {
  await page.goto('/reading-room?from=1&to=8')
  await addExcerpt(page, 'Mở đầu')
  await page.getByRole('button', { name: 'Dòng tiếp', exact: true }).click()
  await openNotebook(page)
  const entries = page.locator('.room-notebook-entry')
  await entries.first().getByText('Ghi cảm nhận / đổi tên', { exact: true }).click()
  await entries.first().getByLabel('Cảm nhận riêng').fill('Một cảm nhận riêng về chữ tài.')
  await entries.first().getByRole('button', { name: 'Lưu ghi chép', exact: true }).click()
  await page.reload()
  await openNotebook(page)
  await expect(entries.first()).toContainText('Vị trí: 2')
  await entries.first().getByRole('button', { name: 'Tiếp tục đoạn này' }).click()
  await expect(page.getByRole('button', { name: 'Đọc dòng 2', exact: true })).toHaveAttribute(
    'aria-current',
    'step'
  )
  await page.getByLabel('Từ dòng', { exact: true }).fill('9')
  await page.getByLabel('Đến dòng', { exact: true }).fill('16')
  await page.getByRole('button', { name: 'Mở đoạn đọc', exact: true }).click()
  await addExcerpt(page, 'Đoạn kế')
  await openNotebook(page)
  await page.getByRole('button', { name: 'Đưa Đoạn kế lên', exact: true }).click()
  await expect(entries.first()).toContainText('Đoạn kế')
  await entries.first().getByRole('button', { name: 'Đánh dấu đã đọc' }).click()
  await page.getByLabel('Trạng thái đọc').selectOption('done')
  await expect(entries).toHaveCount(1)
  await page.getByLabel('Trạng thái đọc').selectOption('all')
  await page.getByLabel('Tìm ghi chép hoặc số dòng').fill('cam nhan')
  await expect(entries).toHaveCount(1)
  await expect(entries.first()).toContainText('Mở đầu')
  await page.getByLabel('Tìm ghi chép hoặc số dòng').fill('5')
  await expect(entries).toHaveCount(1)
  await expect(entries.first()).toContainText('Mở đầu')
  await page.getByLabel('Tìm ghi chép hoặc số dòng').fill('')
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Xuất sổ đọc có nguồn' }).click()
  const download = await downloadEvent
  const text = await readFile((await download.path())!, 'utf8')
  expect(text).toContain('Nguyễn Du, Truyện Kiều')
  expect(text).toContain('Một cảm nhận riêng về chữ tài.')
  await entries.first().getByRole('button', { name: 'Xóa đoạn', exact: true }).click()
  await page.getByRole('button', { name: 'Giữ lại', exact: true }).click()
  await expect(entries).toHaveCount(2)
  await entries.first().getByRole('button', { name: 'Xóa đoạn', exact: true }).click()
  await page.getByRole('button', { name: 'Xóa khỏi sổ', exact: true }).click()
  await expect(entries).toHaveCount(1)
})

test('backup preview preserves local notes and rejects malformed input atomically', async ({
  page,
}) => {
  await page.goto('/reading-room')
  await addExcerpt(page, 'Local')
  await openNotebook(page)
  const upload = page.getByLabel('Nhập bản sao lưu (JSON, tối đa 500 KB)')
  await upload.setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":2,"entries":[]}'),
  })
  await expect(
    page.getByRole('status').filter({ hasText: 'Bản sao lưu không hợp lệ' })
  ).toBeVisible()
  await expect(page.locator('.room-notebook-entry')).toHaveCount(1)
  const data = {
    version: 1,
    entries: [
      { start: 1, end: 8, title: 'Stale', note: 'Old note', cursor: 8, status: 'done' },
      { start: 9, end: 10, title: 'Imported', note: 'New note', cursor: 9, status: 'queued' },
    ],
  }
  await upload.setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  })
  await expect(page.locator('.room-import-preview')).toContainText(
    'thêm 1 đoạn; giữ nguyên 1 đoạn trùng'
  )
  await expect(page.locator('.room-notebook-entry')).toHaveCount(1)
  await page.getByRole('button', { name: 'Nhập các đoạn mới', exact: true }).click()
  await expect(page.locator('.room-notebook-entry')).toHaveCount(2)
  await expect(page.locator('.room-notebook-entry').first()).toContainText('Local')
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Sao lưu sổ đọc', exact: true }).click()
  const download = await downloadEvent
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8'))
  expect(backup.entries[0].note).toBe('')
  expect(backup.entries[1].note).toBe('New note')
})

test('cross-tab edits cannot silently overwrite newer notes or restore deleted entries', async ({
  page,
  context,
}) => {
  await page.goto('/reading-room')
  await addExcerpt(page, 'Mở đầu')
  await openNotebook(page)
  await page.getByText('Ghi cảm nhận / đổi tên', { exact: true }).click()
  await page.getByLabel('Cảm nhận riêng').fill('Draft in first tab')
  const other = await context.newPage()
  await other.goto('/reading-room')
  await openNotebook(other)
  await other.getByText('Ghi cảm nhận / đổi tên', { exact: true }).click()
  await other.getByLabel('Cảm nhận riêng').fill('Newer note')
  await other.getByRole('button', { name: 'Lưu ghi chép', exact: true }).click()
  await page.getByRole('button', { name: 'Lưu ghi chép', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Ghi chép đã đổi ở thẻ khác' })
  ).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        storageKey => JSON.parse(localStorage.getItem(storageKey)!).entries[0].note,
        key
      )
    )
    .toBe('Newer note')
  await page.getByRole('button', { name: 'Nạp ghi chép mới' }).click()
  await expect(page.getByLabel('Cảm nhận riêng')).toHaveValue('Newer note')
  await page.getByRole('button', { name: 'Xóa đoạn', exact: true }).click()
  await other.getByLabel('Cảm nhận riêng').fill('Changed after confirmation opened')
  await other.getByRole('button', { name: 'Lưu ghi chép', exact: true }).click()
  await page.getByRole('button', { name: 'Xóa khỏi sổ', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Đoạn đã thay đổi ở thẻ khác' })
  ).toBeVisible()
  await expect(page.locator('.room-notebook-entry')).toHaveCount(1)
  await other.evaluate(storageKey => localStorage.removeItem(storageKey), key)
  await expect(page.locator('.room-notebook-entry')).toHaveCount(0)
  await other.close()
})

test('unavailable storage still allows a usable in-memory notebook', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('blocked')
    }
    Storage.prototype.getItem = () => {
      throw new Error('blocked')
    }
  })
  await page.goto('/reading-room')
  await addExcerpt(page, 'Trong phiên')
  await expect(page.locator('.room-notice')).toContainText('trong phiên này')
  await openNotebook(page)
  await expect(page.locator('.room-notebook-entry')).toContainText('Trong phiên')
})

for (const width of [320, 768, 1280]) {
  test(`reading room fits ${width}px in both themes with large text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/reading-room')
    await page.getByLabel('Cỡ chữ phòng đọc').selectOption('30')
    for (const dark of [false, true]) {
      if (dark) await page.getByRole('button', { name: 'Bật giao diện tối' }).click()
      for (const tab of ['Đọc & nhớ', 'Đối chiếu & tra từ', 'Sổ đọc']) {
        await page.getByRole('tab', { name: tab, exact: true }).click()
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
        ).toBe(true)
      }
    }
  })
}

async function installSpeechHarness(page: Page) {
  await page.addInitScript(() => {
    const spoken: Utterance[] = []
    const started = new Set<Utterance>()
    let queue: Utterance[] = []
    let paused = false
    let cancellations = 0
    let pauses = 0
    let resumes = 0
    class Utterance {
      text: string
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(text: string) {
        this.text = text
      }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: Utterance,
      configurable: true,
    })
    function startCurrent() {
      if (!paused && queue[0]) started.add(queue[0])
    }
    const engine = Object.assign(new EventTarget(), {
      getVoices: () => [
        {
          voiceURI: 'vietnamese',
          name: 'Tiếng Việt thử nghiệm',
          lang: 'vi-VN',
          localService: true,
        },
      ],
      speak: (utterance: Utterance) => {
        spoken.push(utterance)
        queue.push(utterance)
        startCurrent()
      },
      cancel: () => {
        cancellations++
        queue = []
      },
      pause: () => {
        pauses++
        paused = true
      },
      resume: () => {
        resumes++
        paused = false
        startCurrent()
      },
    })
    Object.defineProperty(engine, 'paused', { get: () => paused })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: engine,
    })
    Object.defineProperty(window, 'speechHarness', {
      value: {
        spoken,
        end: (index: number) => {
          queue = queue.filter(utterance => utterance !== spoken[index])
          spoken[index].onend?.()
        },
        stats: () => ({ cancellations, pauses, resumes }),
        playback: () => ({ paused, queued: queue.length, started: started.size }),
      },
    })
  })
}

test('read-aloud follows lines, pauses and ignores canceled callbacks after navigation', async ({
  page,
}) => {
  await installSpeechHarness(page)
  await page.goto('/reading-room?from=1&to=2')
  await page.getByRole('button', { name: 'Nghe từ dòng hiện tại' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Đang đọc thành tiếng' })).toBeVisible()
  await page.getByRole('button', { name: 'Tạm dừng nghe' }).click()
  await page.getByRole('button', { name: 'Tiếp tục nghe' }).click()
  await page.evaluate(() => (window as unknown as SpeechWindow).speechHarness.end(0))
  await expect(page.getByRole('button', { name: 'Đọc dòng 2', exact: true })).toHaveAttribute(
    'aria-current',
    'step'
  )
  await page.getByRole('button', { name: 'Dừng nghe', exact: true }).click()
  await page.evaluate(() => (window as unknown as SpeechWindow).speechHarness.end(1))
  const stats = await page.evaluate(() => (window as unknown as SpeechWindow).speechHarness.stats())
  expect(stats).toEqual({ cancellations: 1, pauses: 1, resumes: 1 })
  await expect(page.getByRole('status').filter({ hasText: 'Sẵn sàng nghe' })).toBeVisible()
  await page.getByRole('button', { name: 'Nghe từ dòng hiện tại' }).click()
  await openNotebook(page)
  await page.evaluate(() => (window as unknown as SpeechWindow).speechHarness.end(2))
  expect(
    await page.evaluate(() => (window as unknown as SpeechWindow).speechHarness.spoken.length)
  ).toBe(3)
  await page.getByRole('tab', { name: 'Đọc & nhớ', exact: true }).click()
  await page.getByRole('button', { name: 'Nghe từ dòng hiện tại' }).click()
  await page.getByRole('link', { name: '← Về bản văn đầy đủ' }).click()
  await expect(page).toHaveURL(/\/full\?line=2/)
  await page.evaluate(() => (window as unknown as SpeechWindow).speechHarness.end(3))
  expect(
    (await page.evaluate(() => (window as unknown as SpeechWindow).speechHarness.stats()))
      .cancellations
  ).toBe(3)
})

test('a new play resumes paused speech after cancellation while stop and unmount stay silent', async ({
  page,
}) => {
  await installSpeechHarness(page)
  await page.goto('/reading-room?from=1&to=2')
  const playback = () =>
    page.evaluate(() => (window as unknown as SpeechWindow).speechHarness.playback())
  await page.getByRole('button', { name: 'Nghe từ dòng hiện tại' }).click()
  await expect.poll(playback).toEqual({ paused: false, queued: 1, started: 1 })
  await page.getByRole('button', { name: 'Tạm dừng nghe', exact: true }).click()
  await page.getByRole('button', { name: 'Dừng nghe', exact: true }).click()
  await expect.poll(playback).toEqual({ paused: true, queued: 0, started: 1 })
  expect(
    (await page.evaluate(() => (window as unknown as SpeechWindow).speechHarness.stats())).resumes
  ).toBe(0)

  await page.getByRole('button', { name: 'Nghe từ dòng hiện tại' }).click()
  await expect.poll(playback).toEqual({ paused: false, queued: 1, started: 2 })
  await page.getByRole('button', { name: 'Tạm dừng nghe', exact: true }).click()
  await openNotebook(page)
  await expect.poll(playback).toEqual({ paused: true, queued: 0, started: 2 })
  await page.getByRole('tab', { name: 'Đọc & nhớ', exact: true }).click()
  await page.getByRole('button', { name: 'Nghe từ dòng hiện tại' }).click()
  await expect.poll(playback).toEqual({ paused: false, queued: 1, started: 3 })
  await page.getByRole('button', { name: 'Tạm dừng nghe', exact: true }).click()
  await page.getByRole('link', { name: '← Về bản văn đầy đủ' }).click()
  await expect(page).toHaveURL(/\/full\?line=1/)
  await expect.poll(playback).toEqual({ paused: true, queued: 0, started: 3 })
  expect(
    (await page.evaluate(() => (window as unknown as SpeechWindow).speechHarness.stats())).resumes
  ).toBe(2)
})

type SpeechWindow = {
  speechHarness: {
    spoken: unknown[]
    end: (index: number) => void
    stats: () => { cancellations: number; pauses: number; resumes: number }
    playback: () => { paused: boolean; queued: number; started: number }
  }
}
