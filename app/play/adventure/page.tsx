'use client'

import { AchievementsPanel } from '@/components/adventure/achievements-panel'
import { CampaignPanel } from '@/components/adventure/campaign-panel'
import { CollectionPanel } from '@/components/adventure/collection-panel'
import { NotebookPanel } from '@/components/adventure/notebook-panel'
import { OverviewPanel } from '@/components/adventure/overview-panel'
import { ProfilePanel } from '@/components/adventure/profile-panel'
import { QuestsPanel } from '@/components/adventure/quests-panel'
import { ShopPanel } from '@/components/adventure/shop-panel'
import type { EarnedFilter } from '@/components/adventure/types'
import { useAdventureProfile } from '@/components/adventure/use-profile'
import { useGamification } from '@/components/gamification-provider'
import { achievements, currentStreak, levelInfo } from '@/lib/gamification'
import {
  ArrowLeft,
  Award,
  BookOpen,
  Compass,
  Flag,
  Flower2,
  ShoppingBag,
  Target,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { useRef, useState, type KeyboardEvent } from 'react'
import './adventure.css'

const panels = [
  { id: 'overview', label: 'Hôm nay', icon: Compass },
  { id: 'quests', label: 'Nhiệm vụ', icon: Target },
  { id: 'campaign', label: 'Đường thơ', icon: Flag },
  { id: 'achievements', label: 'Dấu ấn', icon: Award },
  { id: 'collection', label: 'Bộ sưu tập', icon: Flower2 },
  { id: 'notebook', label: 'Sổ luyện', icon: BookOpen },
  { id: 'shop', label: 'Quà tặng', icon: ShoppingBag },
  { id: 'profile', label: 'Góc của bạn', icon: UserRound },
] as const
type PanelId = (typeof panels)[number]['id']

export default function AdventurePage() {
  const game = useGamification()
  const { state, today, ready, storageAvailable } = game
  const [panel, setPanel] = useState<PanelId>('overview')
  const [notice, setNotice] = useState('')
  const [achievementFilter, setAchievementFilter] = useState<EarnedFilter>('all')
  const [achievementQuery, setAchievementQuery] = useState('')
  const [collectionFilter, setCollectionFilter] = useState<EarnedFilter>('all')
  const [questPeriod, setQuestPeriod] = useState<'all' | 'daily' | 'weekly'>('all')
  const [shopFilter, setShopFilter] = useState('all')
  const [masteryOrder, setMasteryOrder] = useState('recent')
  const profile = useAdventureProfile(game, setNotice)
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([])
  const level = levelInfo(state.xp)
  const allAchievements = achievements(state)
  const earnedAchievements = allAchievements.filter(item => item.unlocked).length

  function selectPanel(next: PanelId) {
    setPanel(next)
    setNotice('')
    requestAnimationFrame(() =>
      tabButtons.current[panels.findIndex(item => item.id === next)]?.focus()
    )
  }

  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % panels.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + panels.length) % panels.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = panels.length - 1
    else return
    event.preventDefault()
    selectPanel(panels[next].id)
    tabButtons.current[next]?.focus()
  }

  function act(action: () => unknown, message: string) {
    const result = action()
    setNotice(result === false ? 'Chưa thể thực hiện. Hãy kiểm tra điều kiện và thử lại.' : message)
  }
  const panelIndex = panels.findIndex(item => item.id === panel)

  return (
    <div className="shell page-content adventure-page" data-accent={state.profile.accent}>
      <Link className="text-link" href="/play">
        <ArrowLeft size={16} /> Chơi cùng Kiều
      </Link>
      <header className="adventure-heading">
        <div>
          <div className="eyebrow">GÓP TỪNG CHỮ · GIỮ TỪNG NGÀY</div>
          <h1>Hành trình cùng Kiều.</h1>
          <p>
            Đọc một trang, nhớ một câu, để dành một dấu ấn. Một góc nhỏ ghi lại những lần bạn trở về
            với thơ.
          </p>
          <p className="adventure-ledger-note">
            Điểm hành trình bắt đầu từ các hoạt động mới, được ghi riêng với XP trò chơi trước đây.
          </p>
        </div>
        <div className="adventure-stamp" aria-hidden="true">
          Kiều
        </div>
      </header>
      {!storageAvailable && (
        <p className="adventure-notice" role="status">
          Trình duyệt chưa lưu được hành trình. Bạn vẫn có thể chơi trong phiên này; xuất bản sao
          trước khi đóng trang.
        </p>
      )}
      {!ready ? (
        <p role="status">Đang mở sổ hành trình…</p>
      ) : (
        <>
          <div className="adventure-stats" aria-label="Hành trình của bạn">
            <div>
              <span>
                Cấp {level.level} · {level.title}
              </span>
              <strong>{state.xp.toLocaleString('vi-VN')}</strong>
              <span>điểm trải nghiệm</span>
            </div>
            <div>
              <span>Hạt ngọc</span>
              <strong>{state.coins.toLocaleString('vi-VN')}</strong>
              <span>dành cho quà kỷ niệm</span>
            </div>
            <div>
              <span>Chuỗi trở lại</span>
              <strong>{currentStreak(state, today)}</strong>
              <span>ngày liền nhau</span>
            </div>
            <div>
              <span>Dấu ấn đã mở</span>
              <strong>
                {earnedAchievements}
                <small> / {allAchievements.length}</small>
              </strong>
              <span>mỗi dấu ấn, một bước nhỏ</span>
            </div>
          </div>
          <nav className="adventure-tabs" role="tablist" aria-label="Các trang hành trình">
            {panels.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={panel === item.id}
                aria-controls={`panel-${item.id}`}
                tabIndex={panel === item.id ? 0 : -1}
                onClick={() => selectPanel(item.id)}
                onKeyDown={event => tabKey(event, index)}
                ref={element => {
                  tabButtons.current[index] = element
                }}
              >
                <item.icon size={17} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <p className="adventure-status" role="status" aria-live="polite">
            {notice}
          </p>
          <section
            className="adventure-panel"
            role="tabpanel"
            id={`panel-${panel}`}
            aria-labelledby={`tab-${panel}`}
            tabIndex={0}
            key={panelIndex}
          >
            {panel === 'overview' && (
              <OverviewPanel game={game} act={act} selectPanel={selectPanel} />
            )}

            {panel === 'quests' && (
              <QuestsPanel
                game={game}
                act={act}
                questPeriod={questPeriod}
                setQuestPeriod={setQuestPeriod}
              />
            )}

            {panel === 'campaign' && <CampaignPanel game={game} act={act} />}

            {panel === 'achievements' && (
              <AchievementsPanel
                game={game}
                act={act}
                achievementQuery={achievementQuery}
                setAchievementQuery={setAchievementQuery}
                achievementFilter={achievementFilter}
                setAchievementFilter={setAchievementFilter}
              />
            )}

            {panel === 'collection' && (
              <CollectionPanel
                game={game}
                collectionFilter={collectionFilter}
                setCollectionFilter={setCollectionFilter}
              />
            )}

            {panel === 'notebook' && (
              <NotebookPanel
                game={game}
                masteryOrder={masteryOrder}
                setMasteryOrder={setMasteryOrder}
              />
            )}

            {panel === 'shop' && (
              <ShopPanel
                game={game}
                act={act}
                shopFilter={shopFilter}
                setShopFilter={setShopFilter}
              />
            )}

            {panel === 'profile' && (
              <ProfilePanel game={game} act={act} profile={profile} setNotice={setNotice} />
            )}
          </section>
        </>
      )}
    </div>
  )
}
