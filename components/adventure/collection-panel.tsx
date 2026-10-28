'use client'

import { collections } from '@/lib/gamification'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Empty, Heading, Meter } from './shared'
import type { AdventureGame, EarnedFilter } from './types'

type Props = {
  game: AdventureGame
  collectionFilter: EarnedFilter
  setCollectionFilter: (filter: EarnedFilter) => void
}

export function CollectionPanel({ game, collectionFilter, setCollectionFilter }: Props) {
  const allCollections = collections(game.state)
  const earnedCollections = allCollections.filter(item => item.unlocked).length
  return (
    <>
      <Heading
        title="Một vườn kỷ niệm nhỏ."
        extra={
          <span className="adventure-tag earned">
            {earnedCollections} / {allCollections.length} mảnh đã tìm
          </span>
        }
      >
        Những mảnh kỷ niệm mở dần qua hoạt động của bạn. Mỗi mảnh có một điều kiện rõ ràng.
      </Heading>
      <div className="adventure-toolbar">
        <label className="adventure-field">
          Trạng thái bộ sưu tập
          <select
            value={collectionFilter}
            onChange={event => setCollectionFilter(event.target.value as EarnedFilter)}
          >
            <option value="all">Toàn bộ khu vườn</option>
            <option value="earned">Đã sưu tầm</option>
            <option value="pending">Còn chờ khám phá</option>
          </select>
        </label>
      </div>
      <div className="adventure-grid">
        {allCollections
          .filter(
            item => collectionFilter === 'all' || item.unlocked === (collectionFilter === 'earned')
          )
          .map((item, index) => (
            <div
              key={item.id}
              className={`adventure-card ${item.unlocked ? 'unlocked' : 'locked'}`}
            >
              <div className="adventure-card-top">
                <span className="adventure-card-symbol" aria-hidden="true">
                  {['❀', '✧', '❋', '☽', '✿', '◇'][index % 6]}
                </span>
                <span className={`adventure-tag ${item.unlocked ? 'earned' : ''}`}>
                  {item.unlocked ? 'Đã sưu tầm' : 'Chưa mở'}
                </span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <Meter label="Điều kiện sưu tầm" value={item.value} target={item.target} />
              <Link
                href={
                  item.id.startsWith('topic-') ? '/lay-kieu' : `/full?line=${item.sourceId || 1}`
                }
                className="button"
              >
                {item.id.startsWith('topic-') ? 'Khám phá chủ đề' : 'Ghé thăm trang thơ'}{' '}
                <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        {!allCollections.some(
          item => collectionFilter === 'all' || item.unlocked === (collectionFilter === 'earned')
        ) && (
          <Empty title="Một khu vườn đang đợi bạn." href="/full" action="Đọc vài câu thơ">
            Đọc, lưu thơ và thử các trò chơi để bắt đầu bộ sưu tập.
          </Empty>
        )}
      </div>
    </>
  )
}
