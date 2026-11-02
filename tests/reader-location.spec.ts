import { expect, test } from '@playwright/test'

test('reader search and its result page survive reload and copied links', async ({ page }) => {
  await page.goto('/full')
  const search = page.getByRole('textbox', { name: 'Tìm trong Truyện Kiều' })
  await search.fill('nguoi')
  await expect(page).toHaveURL(/q=nguoi/)
  await page.getByRole('button', { name: 'Trang sau' }).click()
  await expect(page).toHaveURL(/page=2/)
  const firstResult = await page.locator('.verse-row').first().getAttribute('id')
  const url = page.url()
  await page.reload()
  await expect(search).toHaveValue('nguoi')
  await expect(page.locator('.verse-row').first()).toHaveAttribute('id', firstResult!)
  const copy = await page.context().newPage()
  await copy.goto(url)
  await expect(copy.locator('.verse-row').first()).toHaveAttribute('id', firstResult!)
  await copy.close()
  await search.fill('tram nam')
  await expect(page).not.toHaveURL(/page=/)
  await expect(page.locator('#line-1 mark')).toHaveText('Trăm năm')
})

test('clearing a linked search stays cleared after reload and keeps keyboard focus', async ({
  page,
}) => {
  await page.goto('/full?q=tram%20nam')
  const search = page.getByRole('textbox', { name: 'Tìm trong Truyện Kiều' })
  await expect(search).toHaveValue('tram nam')
  await page.getByRole('button', { name: 'Xóa tìm kiếm', exact: true }).click()
  await expect(search).toBeFocused()
  await expect(page).not.toHaveURL(/q=/)
  await expect(page.locator('.verse-row')).toHaveCount(40)
  await page.reload()
  await expect(search).toHaveValue('')
  await expect(page.locator('#line-1')).toBeVisible()
})

test('search clears stale line highlights and line jumps clear search pagination', async ({
  page,
}) => {
  await page.goto('/full?line=321')
  await expect(page.locator('#line-321')).toHaveClass(/highlighted/)
  await page.getByRole('textbox', { name: 'Tìm trong Truyện Kiều' }).fill('nguoi')
  await expect(page).not.toHaveURL(/line=/)
  await expect(page.locator('.verse-row.highlighted')).toHaveCount(0)
  await page.getByRole('button', { name: 'Trang sau' }).click()
  await page.getByLabel('Đến dòng thơ').fill('3257')
  await page.getByRole('button', { name: 'Đến dòng đã chọn' }).click()
  await expect(page).toHaveURL(/\/full\?line=3257$/)
  await expect(page.locator('#line-3257 .verse-text-button')).toBeFocused()
  await page.reload()
  await expect(page.locator('#line-3257')).toBeVisible()
})

test('invalid search page numbers recover to an available result page', async ({ page }) => {
  for (const value of ['NaN', '-2', '1.5', '999999']) {
    await page.goto(`/full?q=tram%20nam&page=${value}`)
    await expect(page.locator('.verse-row').first()).toBeVisible()
    await expect(page.locator('.reader-meta')).not.toContainText('NaN')
  }
})

test('reading context closes the passage dialog even when its source URL is already open', async ({
  page,
}) => {
  await page.goto('/full?line=1')
  await expect(page.locator('#line-1')).toHaveClass(/highlighted/)
  const verse = page.locator('#line-1 .verse-text-button')
  await verse.click()
  const dialog = page.getByRole('dialog', { name: 'Một đoạn Kiều' })
  await dialog.getByRole('link', { name: 'Đọc ngữ cảnh dòng 1', exact: true }).click()
  await expect(page).toHaveURL(/\/full\?line=1$/)
  await expect(dialog).toBeHidden()
  await expect(verse).toBeFocused()
})

test('browser history restores the search page after following a passage source', async ({
  page,
}) => {
  await page.goto('/full?q=nguoi&page=2')
  await expect(page.getByRole('textbox', { name: 'Tìm trong Truyện Kiều' })).toHaveValue('nguoi')
  await expect(page.locator('.verse-list')).toHaveAttribute('aria-busy', 'false')
  const firstResult = page.locator('.verse-row').first()
  const resultId = await firstResult.getAttribute('id')
  await firstResult.locator('.verse-text-button').click()
  const dialog = page.getByRole('dialog', { name: 'Một đoạn Kiều' })
  const source = dialog.getByRole('link', { name: /^Đọc ngữ cảnh dòng/ })
  const destination = await source.getAttribute('href')
  await source.click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`${destination!.replace('?', '\\?')}$`))
  await expect(page.getByRole('textbox', { name: 'Tìm trong Truyện Kiều' })).toHaveValue('')
  await page.goBack()
  await expect(page).toHaveURL(/q=nguoi&page=2$/)
  await expect(page.getByRole('textbox', { name: 'Tìm trong Truyện Kiều' })).toHaveValue('nguoi')
  await expect(page.locator('.verse-row').first()).toHaveAttribute('id', resultId!)
  await expect(dialog).toBeHidden()
  await page.goForward()
  await expect(page).toHaveURL(new RegExp(`${destination!.replace('?', '\\?')}$`))
  await expect(page.getByRole('textbox', { name: 'Tìm trong Truyện Kiều' })).toHaveValue('')
})
