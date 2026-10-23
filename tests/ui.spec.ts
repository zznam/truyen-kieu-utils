import { test as base, expect, type Page } from '@playwright/test'

// Fail each journey on runtime exceptions and hydration/rendering errors as well as assertions.
const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text())
      })
      await use(errors)
      expect(errors, 'The browser should not report application errors').toEqual([])
    },
    { auto: true },
  ],
})

async function expectFitsViewport(page: Page) {
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth
    const controls = [...document.querySelectorAll('main button, main input, main select')]
      .filter(element => {
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0 && (rect.left < -1 || rect.right > width + 1)
      })
      .map(element => element.getAttribute('aria-label') || element.textContent?.trim())
    return {
      width,
      pageWidth: document.documentElement.scrollWidth,
      controls,
    }
  })
  expect(overflow.pageWidth, 'The page should not scroll horizontally').toBeLessThanOrEqual(
    overflow.width + 1
  )
  expect(overflow.controls, 'Interactive controls should remain within the viewport').toEqual([])
}

const routes = ['/', '/full', '/saved', '/divination', '/lay-kieu', '/about']
for (const width of [320, 390, 768, 1280]) {
  test(`primary pages and largest reader text fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const route of routes) {
      await test.step(route, async () => {
        await page.goto(route)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        await expectFitsViewport(page)
        if (route === '/full') {
          await page.getByLabel('Cỡ chữ').selectOption('30')
          await expect(page.locator('.verse-text').first()).toHaveCSS('font-size', '30px')
          await expectFitsViewport(page)
        }
        await page.getByRole('button', { name: 'Bật giao diện tối' }).click()
        await expect(page.locator('html')).toHaveClass(/dark/)
        await expectFitsViewport(page)
        await page.getByRole('button', { name: 'Bật giao diện sáng' }).click()
      })
    }
  })
}

base('Vietnamese reading fonts load locally and remain available offline', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    // Production route prefetches may fail when this test deliberately disconnects.
    // Keep all other console failures and every JavaScript exception actionable.
    if (
      message.type() === 'error' &&
      message.text() !== 'Failed to load resource: net::ERR_INTERNET_DISCONNECTED'
    )
      errors.push(message.text())
  })
  const fontUrls: string[] = []
  page.on('response', response => {
    if (response.request().resourceType() === 'font') fontUrls.push(response.url())
  })
  await page.goto('/full')
  const sample = 'Ắ ằ ẵ ặ Ấ ầ ẫ ậ Ế ề ễ ệ Ố ồ ỗ ộ Ớ ờ ỡ ợ Ứ ừ ữ ự Ỹ ỳ ỷ ỵ Đ đ'
  const fonts = await page.evaluate(async text => {
    await document.fonts.ready
    const serif = getComputedStyle(document.querySelector('.verse-text')!).fontFamily
    const sans = getComputedStyle(document.querySelector('input')!).fontFamily
    const serifFamily = serif.split(',')[0].trim()
    const sansFamily = sans.split(',')[0].trim()
    const reading = await document.fonts.load(`22px ${serifFamily}`, text)
    const controls = await document.fonts.load(`16px ${sansFamily}`, text)
    const italic = await document.fonts.load(`italic 22px ${serifFamily}`, text)
    return {
      serif,
      sans,
      reading: reading.length,
      controls: controls.length,
      italic: italic.length,
    }
  }, sample)
  expect(fonts.serif).toContain('Noto Serif')
  expect(fonts.sans).toContain('Noto Sans')
  expect(fonts.reading).toBeGreaterThan(0)
  expect(fonts.controls).toBeGreaterThan(0)
  expect(fonts.italic).toBeGreaterThan(0)
  expect(fontUrls.length).toBeGreaterThan(0)
  expect(fontUrls.every(url => new URL(url).origin === new URL(page.url()).origin)).toBe(true)
  await page.context().setOffline(true)
  await page.getByLabel('Cỡ chữ').selectOption('30')
  await expect(page.locator('.verse-text').first()).toHaveCSS('font-size', '30px')
  await page.context().setOffline(false)
  expect(errors).toEqual([])
})

test('long unbroken search recovers and Vietnamese search works without accents', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 })
  await page.goto('/full')
  const search = page.getByRole('textbox', { name: 'Tìm trong Truyện Kiều' })
  await search.fill('khôngtìmthấy'.repeat(40))
  await expect(page.getByRole('heading', { name: 'Chưa tìm thấy câu thơ' })).toBeVisible()
  await expectFitsViewport(page)
  await page.getByRole('button', { name: 'Xóa tìm kiếm', exact: true }).click()
  await expect(search).toBeFocused()
  await search.fill('tram nam')
  await expect(page.locator('#line-1')).toContainText('Trăm năm')
  await expect(page.locator('#line-1 mark')).toHaveText('Trăm năm')
  await search.fill('trăm'.normalize('NFD'))
  await expect(page.locator('#line-1 mark')).toHaveText('Trăm')
  await search.fill('')
  await expect(page.locator('.verse-row')).toHaveCount(40)
})

test('keyboard pagination and repeated line jumps focus the new reading location', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/full')
  const next = page.getByRole('button', { name: 'Trang sau' })
  await next.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#line-41')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Nội dung Truyện Kiều' })).toBeFocused()
  const jump = page.getByLabel('Đến dòng thơ')
  for (let index = 0; index < 2; index++) {
    await jump.fill('3257')
    await jump.press('Enter')
    await expect(page.locator('#line-3257 .verse-text-button')).toBeFocused()
    await expect(next).toBeDisabled()
    await expectFitsViewport(page)
  }
  const search = page.getByRole('textbox', { name: 'Tìm trong Truyện Kiều' })
  await search.fill('khôngtìmthấy')
  await page.getByRole('button', { name: 'Đọc toàn bộ tác phẩm' }).click()
  await expect(search).toBeFocused()
  await expect(page.locator('#line-1')).toBeVisible()
})

test('saved passages, reading position and font preference survive reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/full')
  await page.getByLabel('Cỡ chữ').selectOption('30')
  await page.getByRole('button', { name: 'Lưu đoạn dòng 1', exact: true }).click()
  await page.getByLabel('Đến dòng thơ').fill('321')
  await page.getByRole('button', { name: 'Đến dòng đã chọn' }).click()
  await expect(page.locator('#line-321')).toHaveClass(/highlighted/)
  await page.reload()
  await expect(page.getByLabel('Cỡ chữ')).toHaveValue('30')
  await expect(page.locator('#line-321')).toBeVisible()
  await page.goto('/saved')
  await expect(page.locator('.passage-card')).toHaveCount(1)
  await expect(page.locator('.passage-card')).toContainText('Trăm năm')
  await page.getByLabel('Tìm trong câu thơ đã lưu').fill('khôngtồn tại'.repeat(30))
  await expect(page.getByRole('heading', { name: 'Chưa có câu thơ phù hợp' })).toBeVisible()
  await expectFitsViewport(page)
  await page.getByRole('button', { name: 'Xóa tìm kiếm' }).click()
  await page.getByRole('button', { name: 'Đã lưu', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Câu thơ đầu tiên đang đợi bạn.' })).toBeVisible()
  await page.reload()
  await expect(page.locator('.passage-card')).toHaveCount(0)
})

test('verse dialog traps keyboard focus, fits a short screen and returns focus on Escape', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/full')
  const verse = page.locator('#line-1 .verse-text-button')
  await verse.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Một đoạn Kiều' })
  await expect(dialog).toBeVisible()
  const rect = await dialog.boundingBox()
  expect(rect).not.toBeNull()
  expect(rect!.x).toBeGreaterThanOrEqual(0)
  expect(rect!.y).toBeGreaterThanOrEqual(0)
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(321)
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(569)
  for (let index = 0; index < 9; index++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(verse).toBeFocused()
})

test('mobile navigation supports keyboard dismissal and route changes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const toggle = page.getByRole('button', { name: 'Mở menu' })
  await toggle.click()
  const navigation = page.getByRole('navigation', { name: 'Điều hướng di động' })
  await expect(navigation).toBeVisible()
  await navigation.getByRole('link', { name: 'Đọc Truyện Kiều' }).focus()
  await page.keyboard.press('Escape')
  await expect(navigation).toBeHidden()
  await expect(toggle).toBeFocused()
  await toggle.click()
  await page.getByRole('heading', { level: 1 }).click()
  await expect(navigation).toBeHidden()
  await toggle.click()
  await page.setViewportSize({ width: 1280, height: 844 })
  await expect(navigation).toBeHidden()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  await navigation.getByRole('link', { name: 'Lẩy Kiều' }).click()
  await expect(page).toHaveURL(/\/lay-kieu$/)
  await expect(navigation).toBeHidden()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Để Kiều nói hộ lòng bạn.')
})

test('topics and maximum generated poem remain usable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 })
  await page.goto('/lay-kieu')
  const topics = page.getByRole('group', { name: 'Chủ đề câu thơ' })
  for (const name of ['Tình yêu', 'Nhân sinh', 'Thiên nhiên', 'Gia đình', 'Tất cả']) {
    await topics.getByRole('button', { name, exact: true }).click()
    await expect(topics.getByRole('button', { name, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await expect(page.locator('.collection-grid .passage-card')).toHaveCount(6)
    await expectFitsViewport(page)
  }
  await page.getByLabel('Số cặp câu').selectOption('16')
  await page.getByRole('button', { name: 'Ghép Lẩy Kiều' }).click()
  await expect(page.locator('.composed-pair')).toHaveCount(16)
  await expect(page.locator('.composed-pair a')).toHaveCount(32)
  await expectFitsViewport(page)
  await page.locator('.composed-pair a').first().click()
  await expect(page).toHaveURL(/\/full\?line=\d+$/)
  await expect(page.locator('.verse-row.highlighted')).toBeVisible()
})

test('repeated divination keeps bounded history and long private input fits', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 })
  await page.goto('/divination')
  await page.getByLabel('Điều bạn đang nghĩ đến').fill('Điều ước '.repeat(55))
  await page.getByRole('button', { name: 'Đón nhận câu Kiều' }).click()
  await expect(page.locator('.ritual-result .passage-card')).toBeVisible()
  for (let index = 0; index < 7; index++) {
    const previous = await page.locator('.ritual-result blockquote').textContent()
    await page.getByRole('button', { name: 'Gieo một duyên mới' }).click()
    await expect(page.locator('.ritual-result blockquote')).not.toHaveText(previous!)
  }
  await expect(page.locator('.history-section .passage-card')).toHaveCount(5)
  await expectFitsViewport(page)
})
