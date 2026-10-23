import { expect, test } from '@playwright/test'

test('every Vietnamese vowel and tone uses the bundled font in regular and italic text', async ({
  page,
}) => {
  await page.goto('/')
  // Cover precomposed and combining-mark input, including stacked diacritics.
  const vowels = 'aăâeêioôơuưyAĂÂEÊIOÔƠUƯY'
  const tones = ['', '\u0300', '\u0301', '\u0309', '\u0303', '\u0323']
  const sample = [...vowels].flatMap(vowel => tones.map(tone => vowel + tone)).join(' ') + ' Đ đ'
  await page.evaluate(async text => {
    for (const family of ['Noto Serif Variable', 'Noto Sans Variable']) {
      for (const style of ['normal', 'italic']) {
        for (const normalization of ['NFC', 'NFD'] as const) {
          const probe = document.createElement('p')
          probe.className = 'font-coverage-probe'
          probe.textContent = text.normalize(normalization)
          probe.style.cssText = `font: ${style} 24px/1.8 "${family}"; overflow-wrap: anywhere`
          document.querySelector('main')!.append(probe)
          await document.fonts.load(`${style} 24px "${family}"`, probe.textContent)
        }
      }
    }
    await document.fonts.ready
  }, sample)

  // FontFaceSet.check alone can pass even when missing glyphs fall back to a system font.
  // Chromium reports the actual typefaces used to paint each probe.
  const client = await page.context().newCDPSession(page)
  await client.send('DOM.enable')
  await client.send('CSS.enable')
  const { root } = await client.send('DOM.getDocument')
  const { nodeIds } = await client.send('DOM.querySelectorAll', {
    nodeId: root.nodeId,
    selector: '.font-coverage-probe',
  })
  expect(nodeIds).toHaveLength(8)
  for (const [index, nodeId] of nodeIds.entries()) {
    const { fonts } = await client.send('CSS.getPlatformFontsForNode', { nodeId })
    expect(fonts.length).toBeGreaterThan(0)
    for (const font of fonts) {
      expect(font.isCustomFont).toBe(true)
      expect(font.familyName).toBe(index < 4 ? 'Noto Serif' : 'Noto Sans')
      expect(font.postScriptName).toContain(index % 4 >= 2 ? 'Italic' : 'Regular')
    }
  }
})
