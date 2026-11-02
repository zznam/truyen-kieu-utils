import { expect, test, type Page } from '@playwright/test'

async function openSavedLibrary(page: Page, saved: number[]) {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Lưu câu thơ', exact: true })).toBeEnabled()
  await page.evaluate(ids => {
    localStorage.setItem(
      'kieu-library-v1',
      JSON.stringify({ saved: ids, progress: 3257, fontSize: 30 })
    )
  }, saved)
  await page.goto('/saved')
}

test('saved collection search handles pasted text, exact lines and keyboard recovery', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 })
  await openSavedLibrary(page, [1, 3256])
  const search = page.getByRole('textbox', { name: 'Tìm trong câu thơ đã lưu' })
  const cards = page.locator('.collection-grid .passage-card')
  const count = page.getByRole('status').filter({ hasText: 'đoạn thơ' })

  await expect(count).toHaveText('2 / 2 đoạn thơ')
  await search.fill('  tram nam  ')
  await expect(cards).toHaveCount(1)
  await expect(cards).toContainText('Trăm năm')
  await expect(count).toHaveText('1 / 2 đoạn thơ')
  await search.fill(' 2 ')
  await expect(cards).toHaveCount(1)
  await expect(cards).toContainText('Trăm năm')
  await search.fill('3257')
  await expect(cards).toHaveCount(1)
  await expect(cards).toContainText('DÒNG 3256–3257')
  await search.fill('325')
  await expect(cards).toHaveCount(0)
  await expect(count).toHaveText('0 / 2 đoạn thơ')
  await page.getByRole('button', { name: 'Xóa tìm kiếm', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(search).toBeFocused()
  await expect(search).toHaveValue('')
  await expect(cards).toHaveCount(2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  )
})

test('noncanonical saved passages recover without duplicates and remain removable after reload', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await openSavedLibrary(page, [2, 1, 129, 3257, 3256])
  const cards = page.locator('.collection-grid .passage-card')
  await expect(cards).toHaveCount(3)
  await expect(page.getByRole('button', { name: 'Đã lưu', exact: true })).toHaveCount(3)
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('kieu-library-v1') || '{}').saved)
    )
    .toEqual([1, 129, 3256])
  await cards.first().getByRole('button', { name: 'Đã lưu', exact: true }).click()
  await expect(cards).toHaveCount(2)
  await page.reload()
  await expect(cards).toHaveCount(2)
  await expect(cards.first()).toContainText('DÒNG 129')
  expect(errors).toEqual([])
})

test('clearing storage in another tab resets the library without resurrecting bookmarks', async ({
  page,
  context,
}) => {
  await page.goto('/full?line=1')
  await page.getByRole('button', { name: 'Lưu đoạn dòng 1', exact: true }).click()
  await page.getByLabel('Cỡ chữ').selectOption('30')
  const other = await context.newPage()
  await other.goto('/saved')
  await expect(other.locator('.passage-card')).toHaveCount(1)

  await other.evaluate(() => localStorage.clear())
  await expect(page.getByRole('button', { name: 'Lưu đoạn dòng 1', exact: true })).toBeVisible()
  await expect(page.getByLabel('Cỡ chữ')).toHaveValue('22')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('kieu-library-v1'))).toBeNull()

  await page.getByLabel('Cỡ chữ').selectOption('26')
  await page.getByLabel('Đến dòng thơ').fill('321')
  await page.getByRole('button', { name: 'Đến dòng đã chọn' }).click()
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('kieu-library-v1') || '{}')))
    .toEqual({ saved: [], progress: 321, fontSize: 26 })
  await expect(other.locator('.passage-card')).toHaveCount(0)
  await page.reload()
  await expect(page.getByLabel('Cỡ chữ')).toHaveValue('26')
  await expect(page.locator('.saved-link .count-badge')).toHaveCount(0)
  await other.close()
})

test('a stale tab preserves newer bookmarks and delayed storage events cannot roll back preferences', async ({
  page,
  context,
}) => {
  await page.goto('/full?line=1')
  await expect(page.getByRole('button', { name: 'Lưu đoạn dòng 1', exact: true })).toBeEnabled()
  const other = await context.newPage()
  await other.addInitScript(() => {
    const delayed: StorageEvent[] = []
    let holding = true
    window.addEventListener('storage', event => {
      if (holding && event.key === 'kieu-library-v1') {
        delayed.push(event)
        event.stopImmediatePropagation()
      }
    })
    Object.defineProperty(window, 'releaseLibraryStorageEvents', {
      value: () => {
        holding = false
        for (const event of delayed) {
          window.dispatchEvent(
            new StorageEvent('storage', {
              key: event.key,
              oldValue: event.oldValue,
              newValue: event.newValue,
              storageArea: event.storageArea,
              url: event.url,
            })
          )
        }
      },
    })
  })
  await other.goto('/full?line=1')
  await expect(other.getByRole('button', { name: 'Lưu đoạn dòng 1', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Lưu đoạn dòng 1', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Bỏ lưu đoạn dòng 1', exact: true })).toBeVisible()
  await expect(other.getByRole('button', { name: 'Lưu đoạn dòng 1', exact: true })).toBeVisible()

  await other.getByLabel('Cỡ chữ').selectOption('30')
  await expect(other.getByRole('button', { name: 'Bỏ lưu đoạn dòng 1', exact: true })).toBeVisible()
  await expect(page.getByLabel('Cỡ chữ')).toHaveValue('30')
  await page.getByRole('button', { name: 'Lưu đoạn dòng 3', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Bỏ lưu đoạn dòng 3', exact: true })).toBeVisible()
  await other.getByLabel('Cỡ chữ').selectOption('26')
  await expect(page.getByLabel('Cỡ chữ')).toHaveValue('26')
  await other.evaluate(() => {
    ;(
      window as unknown as { releaseLibraryStorageEvents: () => void }
    ).releaseLibraryStorageEvents()
  })

  for (const tab of [page, other]) {
    await expect(tab.getByLabel('Cỡ chữ')).toHaveValue('26')
    await expect(tab.getByRole('button', { name: 'Bỏ lưu đoạn dòng 1', exact: true })).toBeVisible()
    await expect(tab.getByRole('button', { name: 'Bỏ lưu đoạn dòng 3', exact: true })).toBeVisible()
  }
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('kieu-library-v1') || '{}')))
    .toEqual({ saved: [1, 3], progress: 1, fontSize: 26 })
  await other.close()
})

test('failed library writes warn on the first save and retain subsequent changes in memory', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    localStorage.setItem(
      'kieu-library-v1',
      JSON.stringify({ saved: [], progress: 1, fontSize: 22 })
    )
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'kieu-library-v1') throw new DOMException('Storage full', 'QuotaExceededError')
      original.call(this, key, value)
    }
  })
  await page.goto('/full?line=1')
  await page.getByRole('button', { name: 'Lưu đoạn dòng 1', exact: true }).click()
  await expect(
    page.getByText(
      'Trình duyệt không cho phép lưu dữ liệu. Dấu trang chỉ được giữ trong phiên này.'
    )
  ).toBeVisible()
  await page.getByLabel('Cỡ chữ').selectOption('30')
  await page.getByRole('button', { name: 'Lưu đoạn dòng 3', exact: true }).click()
  await page.locator('.saved-link').click()
  await expect(page.locator('.passage-card')).toHaveCount(2)
  await page
    .locator('.passage-card')
    .first()
    .getByRole('button', { name: 'Đã lưu', exact: true })
    .click()
  await expect(page.locator('.passage-card')).toHaveCount(1)
  await page.getByRole('link', { name: 'Đọc Truyện Kiều', exact: true }).click()
  await expect(page.getByLabel('Cỡ chữ')).toHaveValue('30')
  await expect(page.getByRole('button', { name: 'Lưu đoạn dòng 1', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bỏ lưu đoạn dòng 3', exact: true })).toBeVisible()
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('kieu-library-v1') || '{}'))
  ).toEqual({ saved: [], progress: 1, fontSize: 22 })
  expect(errors).toEqual([])
})

test('stale save and remove buttons preserve the requested action across tabs', async ({
  page,
  context,
}) => {
  await page.goto('/full?line=1')
  await expect(page.getByRole('button', { name: 'Lưu đoạn dòng 1', exact: true })).toBeEnabled()
  const other = await context.newPage()
  await other.addInitScript(() => {
    // Reproduce a background tab whose storage events have not arrived yet.
    window.addEventListener('storage', event => {
      if (event.key === 'kieu-library-v1') event.stopImmediatePropagation()
    })
  })
  await other.goto('/full?line=1')
  await expect(other.getByRole('button', { name: 'Lưu đoạn dòng 1', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Lưu đoạn dòng 1', exact: true }).click()
  await other.getByRole('button', { name: 'Lưu đoạn dòng 1', exact: true }).click()
  await expect(other.getByRole('button', { name: 'Bỏ lưu đoạn dòng 1', exact: true })).toBeVisible()
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('kieu-library-v1') || '{}').saved)
  ).toEqual([1])

  await page.getByRole('button', { name: 'Bỏ lưu đoạn dòng 1', exact: true }).click()
  await other.getByRole('button', { name: 'Bỏ lưu đoạn dòng 1', exact: true }).click()
  await expect(other.getByRole('button', { name: 'Lưu đoạn dòng 1', exact: true })).toBeVisible()
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('kieu-library-v1') || '{}').saved)
  ).toEqual([])
  await other.close()
})
