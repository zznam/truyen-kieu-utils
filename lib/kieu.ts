import { truyenKieuVerses } from '../app/data/truyen-kieu'

export type Verse = { id: number; text: string }
export const verses: Verse[] = truyenKieuVerses.map(verse => ({
  ...verse,
  text: verse.text
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim(),
}))
export const PAGE_SIZE = 40
export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
export const words = (text: string): string[] => text.match(/[\p{L}]+/gu) ?? []
export function searchVerses(query: string) {
  const term = normalize(query.trim())
  if (!term) return verses
  return verses.filter(verse => normalize(verse.text).includes(term) || String(verse.id) === term)
}
export function getPassage(id: number): Verse[] {
  const index = verses.findIndex(verse => verse.id === id)
  if (index < 0) return []
  // Use word count because the imported edition contains a combined line.
  if (
    words(verses[index].text).length === 8 &&
    index > 0 &&
    words(verses[index - 1].text).length === 6
  )
    return verses.slice(index - 1, index + 1)
  if (words(verses[index].text).length === 6 && words(verses[index + 1]?.text ?? '').length === 8)
    return verses.slice(index, index + 2)
  return [verses[index]]
}
export const couplets = verses.flatMap((verse, index) =>
  words(verse.text).length === 6 && words(verses[index + 1]?.text ?? '').length === 8
    ? [[verse, verses[index + 1]]]
    : []
)
export const topics = [
  { id: 'all', label: 'Tất cả', terms: [] },
  { id: 'love', label: 'Tình yêu', terms: ['tình', 'yêu', 'duyên', 'thương', 'nhớ'] },
  { id: 'life', label: 'Nhân sinh', terms: ['đời', 'người', 'tâm', 'phận', 'tài'] },
  { id: 'nature', label: 'Thiên nhiên', terms: ['hoa', 'trăng', 'mây', 'gió', 'xuân'] },
  { id: 'family', label: 'Gia đình', terms: ['cha', 'mẹ', 'hiếu', 'nhà', 'con'] },
] as const
export function topicPassages(topic: string) {
  const selected = topics.find(item => item.id === topic)
  if (!selected || selected.id === 'all') return couplets
  return couplets.filter(pair =>
    selected.terms.some(term =>
      pair.some(verse => words(verse.text.toLocaleLowerCase('vi').normalize('NFC')).includes(term))
    )
  )
}
export function dailyPassage(date: Date) {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return couplets[hash % couplets.length]
}
export function passageText(passage: Verse[]) {
  return `${passage.map(verse => verse.text).join('\n')}\n— Nguyễn Du, Truyện Kiều (dòng ${passage.map(verse => verse.id).join('–')}, bản văn trong ứng dụng)`
}
