import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const workshopKey = 'kieu-workshop-v1'
const workshopPath = '/lay-kieu/workshop'

async function openComposition(page: Page) {
  await page.getByRole('tab', { name: 'Bài ghép', exact: true }).click()
}

async function openDrafts(page: Page) {
  await page.getByRole('tab', { name: 'Bản nháp', exact: true }).click()
}

async function sourcePairs(page: Page): Promise<string[][]> {
  return page
    .locator('.workshop-stanza')
    .evaluateAll(stanzas =>
      stanzas.map(stanza =>
        Array.from(stanza.querySelectorAll('.source-links a'), link => link.getAttribute('href')!)
      )
    )
}

function backupDraft(id: string, title: string, note = '') {
  return {
    id,
    title,
    note,
    revision: 0,
    stanzas: [{ id: `pair-${id}`, sixId: 1, eightId: 2, locked: false }],
  }
}

async function seedDrafts(page: Page, drafts: ReturnType<typeof backupDraft>[]) {
  await page.goto('/')
  await page.evaluate(
    ({ key, drafts }) => {
      localStorage.setItem(key, JSON.stringify({ version: 1, drafts }))
    },
    { key: workshopKey, drafts }
  )
  await page.goto(workshopPath)
  await openDrafts(page)
}

test('manual pairing searches original lines and exposes the exact rhyme and source links', async ({
  page,
}) => {
  await page.goto(workshopPath)
  await page.getByLabel('Tìm câu sáu chữ').fill('tram nam')
  const anchor = page.getByRole('button', { name: 'Chọn câu sáu dòng 1', exact: true })
  await expect(anchor).toContainText('Trăm năm trong cõi người ta')
  await anchor.click()
  await page.getByLabel('Tìm câu tám chữ').fill('2')
  await page.getByRole('button', { name: 'Ghép câu tám dòng 2', exact: true }).click()
  await openComposition(page)
  const stanza = page.locator('.workshop-stanza').first()
  await expect(stanza).toContainText('Chữ tài chữ mệnh khéo là ghét nhau')
  await expect(stanza).toContainText('“ta” ↔ “là”')
  await expect(
    stanza.getByRole('link', { name: 'Gốc dòng 1 (mở thẻ mới)', exact: true })
  ).toHaveAttribute('href', '/full?line=1')
  expect(await sourcePairs(page)).toEqual([['/full?line=1', '/full?line=2']])
  await page.getByRole('button', { name: 'Xem bản đọc', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Khóa cặp 1', exact: true })).toBeHidden()
  await expect(
    stanza.getByRole('link', { name: 'Gốc dòng 2 (mở thẻ mới)', exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Trở lại chỉnh sửa', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Khóa cặp 1', exact: true })).toBeVisible()
  const sourceWindow = page.waitForEvent('popup')
  await stanza.getByRole('link', { name: 'Gốc dòng 1 (mở thẻ mới)', exact: true }).click()
  const source = await sourceWindow
  await expect(source).toHaveURL(/\/full\?line=1$/)
  await source.close()
  await expect(page).toHaveURL(new RegExp(`${workshopPath}$`))
  expect(await sourcePairs(page)).toEqual([['/full?line=1', '/full?line=2']])
})

test('seeded generation preserves locks and supports targeted changes, order and undo/redo', async ({
  page,
}) => {
  await page.goto(workshopPath)
  await page.getByLabel('Số cặp câu').selectOption('4')
  await page.getByLabel('Hạt giống').fill('browser-repeatable-poem')
  await page.getByRole('button', { name: 'Ghép theo hạt giống', exact: true }).click()
  await openComposition(page)
  await expect(page.locator('.workshop-stanza')).toHaveCount(4)
  const original = await sourcePairs(page)
  expect(new Set(original.flat()).size).toBe(8)
  await page.getByRole('tab', { name: 'Ghép câu', exact: true }).click()
  await page.getByRole('button', { name: 'Ghép theo hạt giống', exact: true }).click()
  await openComposition(page)
  expect(await sourcePairs(page)).toEqual(original)

  await page.getByRole('button', { name: 'Khóa cặp 2', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Đổi cặp 2', exact: true })).toBeDisabled()
  await page.getByRole('tab', { name: 'Ghép câu', exact: true }).click()
  await page.getByLabel('Hạt giống').fill('another-browser-poem')
  await page.getByRole('button', { name: 'Ghép theo hạt giống', exact: true }).click()
  await openComposition(page)
  const regenerated = await sourcePairs(page)
  expect(regenerated[1]).toEqual(original[1])
  expect(new Set(regenerated.flat()).size).toBe(8)
  await page.getByRole('button', { name: 'Đổi cặp 1', exact: true }).click()
  const revised = await sourcePairs(page)
  expect(revised[0]).not.toEqual(regenerated[0])
  expect(revised.slice(1)).toEqual(regenerated.slice(1))
  await page.getByRole('button', { name: 'Đưa cặp 3 lên', exact: true }).click()
  const reordered = [revised[0], revised[2], revised[1], revised[3]]
  expect(await sourcePairs(page)).toEqual(reordered)
  await page.getByRole('button', { name: 'Bỏ cặp 4', exact: true }).click()
  expect(await sourcePairs(page)).toEqual(reordered.slice(0, 3))
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click()
  expect(await sourcePairs(page)).toEqual(reordered)
  await page.getByRole('button', { name: 'Làm lại', exact: true }).click()
  expect(await sourcePairs(page)).toEqual(reordered.slice(0, 3))

  await page.getByRole('tab', { name: 'Ghép câu', exact: true }).click()
  await page.getByLabel('Số cặp câu').selectOption('1')
  await page.getByRole('button', { name: 'Ghép theo hạt giống', exact: true }).click()
  await expect(page.locator('.workshop-message')).toContainText('bỏ cặp đã khóa')
  await openComposition(page)
  expect(await sourcePairs(page)).toEqual(reordered.slice(0, 3))
})

test('saved-source and topic filters constrain both manual and generated pairs without partial replacement', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Lưu câu thơ', exact: true })).toBeEnabled()
  await page.evaluate(() =>
    localStorage.setItem(
      'kieu-library-v1',
      JSON.stringify({ saved: [1], progress: 1, fontSize: 22 })
    )
  )
  await page.goto(workshopPath)
  await page.getByLabel('Chỉ dùng câu đã lưu').check()
  await expect(page.getByRole('button', { name: /^Chọn câu sáu dòng/ })).toHaveCount(1)
  await page.getByRole('button', { name: 'Chọn câu sáu dòng 1', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Ghép câu tám dòng/ })).toHaveCount(1)
  await page.getByLabel('Số cặp câu').selectOption('1')
  await page.getByRole('button', { name: 'Ghép theo hạt giống', exact: true }).click()
  await openComposition(page)
  expect(await sourcePairs(page)).toEqual([['/full?line=1', '/full?line=2']])
  await page.getByRole('tab', { name: 'Ghép câu', exact: true }).click()
  await page.getByLabel('Số cặp câu').selectOption('2')
  await page.getByRole('button', { name: 'Ghép theo hạt giống', exact: true }).click()
  await expect(page.locator('.workshop-message')).toContainText('Không đủ câu phù hợp')
  await openComposition(page)
  expect(await sourcePairs(page)).toEqual([['/full?line=1', '/full?line=2']])
  await page.getByRole('tab', { name: 'Ghép câu', exact: true }).click()
  await page.getByLabel('Chủ đề nguồn').selectOption('nature')
  await expect(page.getByRole('button', { name: /^Chọn câu sáu dòng/ })).toHaveCount(0)
})

test('drafts save normalized titles, reopen notes, duplicate and require delete confirmation', async ({
  page,
}) => {
  await page.goto(`${workshopPath}?pairs=1-2`)
  await expect(page.locator('.workshop-stanza')).toHaveCount(1)
  await page.getByLabel('Tên bài ghép').fill('  Mở đầu riêng  ')
  await page.getByLabel('Cảm nhận riêng').fill('Bản ghi đầu tiên')
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
  await expect(page.locator('.workshop-message')).toHaveText('Đã lưu bản nháp.')
  await expect(page.getByLabel('Tên bài ghép')).toHaveValue('Mở đầu riêng')
  await page.getByLabel('Cảm nhận riêng').fill('Đã sửa cảm nhận sau lần lưu')
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
  await expect(page.locator('.workshop-message')).toHaveText('Đã lưu bản nháp.')
  // Navigate to the plain route so the share link does not reopen an unsaved copy on reload.
  await page.goto(workshopPath)
  await openDrafts(page)
  const drafts = page.locator('.workshop-saved-draft')
  await expect(drafts).toHaveCount(1)
  await expect(drafts.first()).toContainText('Phiên bản 2')
  await drafts.first().getByRole('button', { name: 'Mở bản nháp', exact: true }).click()
  await expect(page.getByLabel('Cảm nhận riêng')).toHaveValue('Đã sửa cảm nhận sau lần lưu')
  await page.getByLabel('Tên bài ghép').fill('Bản sao để thử')
  await page.getByRole('button', { name: 'Lưu thành bản sao', exact: true }).click()
  await openDrafts(page)
  await expect(drafts).toHaveCount(2)
  await page.getByLabel('Tìm bản nháp').fill('mo dau rieng')
  await expect(drafts).toHaveCount(1)
  await page.getByLabel('Tìm bản nháp').fill('')
  await drafts.last().getByRole('button', { name: 'Xóa bản nháp', exact: true }).click()
  await page.getByRole('button', { name: 'Giữ bản nháp', exact: true }).click()
  await expect(drafts).toHaveCount(2)
  await drafts.last().getByRole('button', { name: 'Xóa bản nháp', exact: true }).click()
  await page.getByRole('button', { name: 'Xóa bản đã chọn', exact: true }).click()
  await expect(drafts).toHaveCount(1)
  await expect(drafts.first()).toContainText('Mở đầu riêng')
})

test('share URLs exclude private title and note while downloaded exports retain attribution', async ({
  page,
}) => {
  await page.goto(`${workshopPath}?pairs=1-2`)
  await page.getByLabel('Tên bài ghép').fill('Tiêu đề bí mật')
  await page.getByLabel('Cảm nhận riêng').fill('Cảm nhận tuyệt đối riêng tư')
  await page
    .context()
    .grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(page.url()).origin })
  await page.getByRole('button', { name: 'Sao chép liên kết bài ghép', exact: true }).click()
  const shared = await page.evaluate(() => navigator.clipboard.readText())
  const sharedUrl = new URL(shared)
  expect([...sharedUrl.searchParams.keys()]).toEqual(['pairs'])
  expect(sharedUrl.searchParams.get('pairs')).toBe('1-2')
  expect(decodeURIComponent(shared)).not.toMatch(/bí mật|riêng tư/)
  const recipient = await page.context().newPage()
  await recipient.goto(shared)
  await expect(recipient.getByLabel('Cảm nhận riêng')).toHaveValue('')
  await expect(recipient.getByLabel('Tên bài ghép')).not.toHaveValue('Tiêu đề bí mật')
  expect(await sourcePairs(recipient)).toEqual([['/full?line=1', '/full?line=2']])
  await recipient.close()
  for (const label of ['Tải bản văn', 'Tải Markdown']) {
    const downloadEvent = page.waitForEvent('download')
    await page.getByRole('button', { name: label, exact: true }).click()
    const download = await downloadEvent
    const text = await readFile((await download.path())!, 'utf8')
    expect(text).toContain('Nguyễn Du, Truyện Kiều')
    expect(text).toContain('bản văn trong ứng dụng')
    expect(text).toContain('thứ tự không phải nguyên tác')
    expect(text).toContain('Cảm nhận tuyệt đối riêng tư')
  }
})

test('backup preview rejects invalid data and retains local content on ID conflicts', async ({
  page,
}) => {
  await seedDrafts(page, [backupDraft('local', 'Bản hiện tại', 'Giữ cảm nhận này')])
  const drafts = page.locator('.workshop-saved-draft')
  const upload = page.getByLabel('Nhập bản sao lưu xưởng (JSON)', { exact: true })
  await upload.setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        drafts: [
          {
            ...backupDraft('bad', 'Sai cặp'),
            stanzas: [{ id: 'bad-pair', sixId: 2, eightId: 1, locked: false }],
          },
        ],
      })
    ),
  })
  await expect(
    page.getByRole('status').filter({ hasText: 'Bản sao lưu không hợp lệ' })
  ).toBeVisible()
  await expect(drafts).toHaveCount(1)
  await upload.setInputFiles({
    name: 'large.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(250_001, ' '),
  })
  await expect(
    page.getByRole('status').filter({ hasText: 'Tệp vượt giới hạn 250 KB' })
  ).toBeVisible()
  const payload = Buffer.from(
    JSON.stringify({
      version: 1,
      drafts: [
        backupDraft('local', 'Old title', 'Old note'),
        backupDraft('incoming', 'Bản nhập', 'Cảm nhận mới'),
      ],
    })
  )
  await upload.setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: payload })
  await expect(page.locator('.workshop-import-preview')).toContainText(
    'thêm 1 bản mới, giữ nguyên 1 bản trùng mã'
  )
  await expect(drafts).toHaveCount(1)
  await page.getByRole('button', { name: 'Hủy nhập', exact: true }).click()
  await expect(drafts).toHaveCount(1)
  await upload.setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: payload })
  await page.getByRole('button', { name: 'Nhập bản mới', exact: true }).click()
  await expect(drafts).toHaveCount(2)
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Sao lưu bản nháp', exact: true }).click()
  const download = await downloadEvent
  const restored = JSON.parse(await readFile((await download.path())!, 'utf8'))
  expect(restored.drafts[0]).toMatchObject({
    id: 'local',
    title: 'Bản hiện tại',
    note: 'Giữ cảm nhận này',
  })
  expect(restored.drafts[1]).toMatchObject({ id: 'incoming', note: 'Cảm nhận mới' })
})

test('stale edits preserve newer content even when an imported replacement reuses a revision', async ({
  page,
  context,
}) => {
  await seedDrafts(page, [backupDraft('shared', 'Bản chung', 'Ban đầu')])
  await page.getByRole('button', { name: 'Mở bản nháp', exact: true }).click()
  await page.getByLabel('Cảm nhận riêng').fill('Thay đổi chưa lưu ở thẻ một')
  const other = await context.newPage()
  await other.goto(workshopPath)
  await openDrafts(other)
  await other.getByRole('button', { name: 'Mở bản nháp', exact: true }).click()
  await other.getByLabel('Cảm nhận riêng').fill('Ghi chép mới từ thẻ hai')
  await other.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
  await expect(page.locator('.workshop-message')).toContainText(
    'đã thay đổi hoặc bị xóa ở thẻ khác'
  )
  await expect(page.getByLabel('Cảm nhận riêng')).toHaveValue('Thay đổi chưa lưu ở thẻ một')
  await page.getByRole('button', { name: 'Lưu thành bản sao', exact: true }).click()
  await openDrafts(page)
  await expect(page.locator('.workshop-saved-draft')).toHaveCount(2)

  await page
    .locator('.workshop-saved-draft')
    .first()
    .getByRole('button', { name: 'Mở bản nháp', exact: true })
    .click()
  await expect(page.getByLabel('Cảm nhận riêng')).toHaveValue('Ghi chép mới từ thẻ hai')
  await page.getByLabel('Cảm nhận riêng').fill('Thay đổi trên phiên bản một')
  await other.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key)!)
    state.drafts[0].note = 'Bản nhập lại cùng mã và phiên bản'
    localStorage.setItem(key, JSON.stringify(state))
  }, workshopKey)
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
  await expect(page.locator('.workshop-message')).toContainText(
    'đã thay đổi hoặc bị xóa ở thẻ khác'
  )
  await expect
    .poll(() =>
      other.evaluate(key => JSON.parse(localStorage.getItem(key)!).drafts[0].note, workshopKey)
    )
    .toBe('Bản nhập lại cùng mã và phiên bản')
  await openDrafts(page)
  await page
    .locator('.workshop-saved-draft')
    .first()
    .getByRole('button', { name: 'Xóa bản nháp', exact: true })
    .click()
  await other.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key)!)
    state.drafts[0].note = 'Bản thay thế sau khi mở xác nhận xóa'
    localStorage.setItem(key, JSON.stringify(state))
  }, workshopKey)
  await page.getByRole('button', { name: 'Xóa bản đã chọn', exact: true }).click()
  await expect(page.locator('.workshop-message')).toContainText('Hãy kiểm tra lại trước khi xóa')
  await expect(page.locator('.workshop-saved-draft')).toHaveCount(2)
  await other.close()
})

test('dirty drafts and source filters survive tab switches, and replacement requires confirmation', async ({
  page,
}) => {
  await page.goto(`${workshopPath}?pairs=1-2`)
  await page.getByLabel('Cảm nhận riêng').fill('Còn đang viết')
  await page.getByRole('tab', { name: 'Ghép câu', exact: true }).click()
  await page.getByLabel('Tìm câu sáu chữ').fill('tram nam')
  await page.getByRole('tab', { name: 'Ghép câu', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Bài ghép', exact: true })).toBeFocused()
  await expect(page.getByLabel('Cảm nhận riêng')).toHaveValue('Còn đang viết')
  await page.getByRole('button', { name: 'Tạo bản mới', exact: true }).click()
  await page.getByRole('button', { name: 'Giữ bản đang sửa', exact: true }).click()
  await expect(page.getByLabel('Cảm nhận riêng')).toHaveValue('Còn đang viết')
  await page.getByRole('tab', { name: 'Ghép câu', exact: true }).click()
  await expect(page.getByLabel('Tìm câu sáu chữ')).toHaveValue('tram nam')
  await page.getByRole('button', { name: 'Tạo bản mới', exact: true }).click()
  await page.getByRole('button', { name: 'Bỏ thay đổi và mở', exact: true }).click()
  await expect(page.locator('.workshop-stanza')).toHaveCount(0)
  await expect(page.getByLabel('Cảm nhận riêng')).toHaveValue('')
})

test('blocked storage keeps saved drafts usable in memory and explains the limitation', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('blocked')
    }
    Storage.prototype.setItem = () => {
      throw new Error('blocked')
    }
  })
  await page.goto(`${workshopPath}?pairs=1-2`)
  await page.getByLabel('Tên bài ghép').fill('Bản trong phiên')
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
  await expect(
    page.locator('.workshop-notice').filter({ hasText: 'giữ trong phiên này' })
  ).toBeVisible()
  await openDrafts(page)
  await expect(page.locator('.workshop-saved-draft')).toContainText('Bản trong phiên')
  await page.getByRole('button', { name: 'Mở bản nháp', exact: true }).click()
  expect(await sourcePairs(page)).toEqual([['/full?line=1', '/full?line=2']])
})

for (const width of [320, 768, 1280]) {
  test(`workshop fits ${width}px with a full poem, long title and both themes`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(workshopPath)
    await page.getByLabel('Tên bài ghép').fill('Đ'.repeat(80))
    await page.getByLabel('Số cặp câu').selectOption('16')
    await page.getByRole('button', { name: 'Ghép theo hạt giống', exact: true }).click()
    await openComposition(page)
    await expect(page.locator('.workshop-stanza')).toHaveCount(16)
    await page.getByLabel('Cảm nhận riêng').fill('Ỳ'.repeat(2000))
    await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
    for (const dark of [false, true]) {
      if (dark) await page.getByRole('button', { name: 'Bật giao diện tối', exact: true }).click()
      for (const name of ['Ghép câu', 'Bài ghép', 'Bản nháp']) {
        await page.getByRole('tab', { name, exact: true }).click()
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
        ).toBe(true)
      }
    }
  })
}
