import { test, expect } from '@playwright/test'

test('all primary routes render successfully', async ({ request }) => {
  for (const route of [
    '/',
    '/full',
    '/saved',
    '/divination',
    '/lay-kieu',
    '/about',
    '/play',
    '/play/missing',
    '/play/continuation',
    '/play/order',
    '/play/daily',
    '/play/review',
    '/play/journey',
    '/play/adventure',
    '/play/arcade',
    '/play/mastery',
    ...[
      'word-order',
      'double-blank',
      'previous-verse',
      'true-verse',
      'syllable-count',
      'changed-word',
      'initials',
      'typed-word',
      'pair-match',
      'recall',
    ].map(mode => `/play/arcade/${mode}`),
  ]) {
    const response = await request.get(route)
    expect(response.status(), route).toBe(200)
    expect(await response.text()).toContain('lang="vi"')
  }
})
test('generation returns traceable 6/8 pairs and rejects malformed counts', async ({ request }) => {
  const response = await request.get('/api/lay-kieu?count=4')
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body.data.results).toHaveLength(4)
  expect(body.data.results[0].id6).toBeGreaterThan(0)
  expect(body.data.results[0].id8).toBeGreaterThan(0)
  for (const count of ['NaN', '1.5', '-1', '17', '2abc', '', 'Infinity']) {
    expect((await request.get(`/api/lay-kieu?count=${count}`)).status(), count).toBe(400)
  }
})
test('AI rejects malformed input before attempting upstream requests', async ({ request }) => {
  for (const data of [
    {},
    { text: 123 },
    { text: ' ' },
    { text: 'a'.repeat(4001) },
    { text: 'Trăm năm', question: 'a'.repeat(501) },
  ]) {
    expect((await request.post('/api/analyze-lay-kieu', { data })).status()).toBe(400)
  }
  expect(
    (
      await request.post('/api/analyze-lay-kieu', {
        data: '{bad',
        headers: { 'Content-Type': 'application/json' },
      })
    ).status()
  ).toBe(400)
})
test('unconfigured AI returns a usable message without disclosing configuration', async ({
  request,
}) => {
  test.skip(
    process.env.TEST_AI_CONFIGURED === '1',
    'Only run against an unconfigured local AI service'
  )
  const response = await request.post('/api/analyze-lay-kieu', {
    data: { text: 'Trăm năm trong cõi người ta' },
  })
  expect(response.status()).toBe(503)
  const data = await response.json()
  expect(data.success).toBe(false)
  expect(data.error).toContain('đọc, lưu và chia sẻ')
  expect(data.error).not.toMatch(/API.key|GEMINI_|https:/i)
})
test('missing pages return 404 with a recovery link', async ({ request }) => {
  const response = await request.get('/missing-page-for-test')
  expect(response.status()).toBe(404)
  expect(await response.text()).toContain('Về trang khám phá')
})

test('unknown game mode returns 404', async ({ request }) => {
  expect((await request.get('/play/unknown-game')).status()).toBe(404)
  expect((await request.get('/play/arcade/unknown-game')).status()).toBe(404)
})
