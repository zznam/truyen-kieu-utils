import { arcadeModes } from '@/lib/arcade'
import { verses } from '@/lib/kieu'

export const modeNames: Record<string, string> = {
  missing: 'Nhớ một chữ',
  next: 'Nối câu thơ',
  order: 'Xếp lời thơ',
  daily: 'Thử thách mỗi ngày',
  arena: 'Đấu trường câu chữ',
  gap: 'Nhớ một chữ',
  continuation: 'Nối câu thơ',
  sequence: 'Xếp lời thơ',
  ...Object.fromEntries(
    Object.entries(arcadeModes).map(([id, item]) => [`arcade-${id}`, item.title])
  ),
}
export const accentNames: Record<string, string> = {
  indigo: 'Mực chàm',
  forest: 'Lá xanh',
  green: 'Lá xanh',
  clay: 'Đất nung',
  gold: 'Nắng mật',
  rose: 'Cánh hồng',
  plum: 'Hoa mận',
  amber: 'Hổ phách',
  teal: 'Ngọc biếc',
  emerald: 'Ngọc biếc',
}
export const chapterActions: Record<string, { href: string; label: string }> = {
  opening: { href: '/full?line=1', label: 'Mở trang thơ' },
  keepsake: { href: '/full?line=1', label: 'Tìm câu để lưu' },
  landscapes: { href: '/lay-kieu', label: 'Khám phá chủ đề' },
  practice: { href: '/play/arcade', label: 'Chọn trò chơi' },
  knowledge: { href: '/play/arcade', label: 'Luyện trí nhớ' },
  mastery: { href: '/play/mastery', label: 'Ôn câu đã học' },
}
export const verseText = new Map(verses.map(verse => [String(verse.id), verse.text]))
