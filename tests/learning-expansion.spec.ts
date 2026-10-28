import { expect, test } from '@playwright/test'

const routes = ['/play/studio', '/play/expeditions', '/play/arena']

test('the play page leads to all three new learning areas', async ({ page }) => {
  await page.goto('/play')
  const section = page.getByRole('region', { name: 'Một lối học của riêng bạn.' })
  await expect(section.getByRole('link')).toHaveCount(3)
  for (const route of routes) {
    await section.locator(`a[href="${route}"]`).click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`${route}$`))
    await page.goto('/play')
  }
})

for (const width of [320, 390, 768, 1280]) {
  test(`new learning areas fit ${width}px in both themes`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/play', ...routes]) {
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      for (const dark of [false, true]) {
        await page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark)
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          `${route}, dark=${dark}`
        ).toBe(true)
      }
    }
    expect(errors).toEqual([])
  })
}

test('new areas remain usable with malformed and unavailable browser storage', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    for (const key of ['kieu-studio-v1', 'kieu-expeditions-v1', 'kieu-arena-v1'])
      localStorage.setItem(key, '{not valid JSON')
  })
  for (const route of routes) {
    await page.goto(route)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('button').filter({ visible: true }).first()).toBeEnabled()
  }
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException('Storage disabled', 'SecurityError')
    }
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage disabled', 'SecurityError')
    }
  })
  for (const route of routes) {
    await page.goto(route)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }
  expect(errors).toEqual([])
})
