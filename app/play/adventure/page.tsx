'use client'

import Link from 'next/link'
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  Compass,
  Download,
  Flag,
  Flower2,
  Gift,
  Leaf,
  Lock,
  Pin,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  Target,
  Trophy,
  Upload,
  UserRound,
} from 'lucide-react'
import { useGamification } from '@/components/gamification-provider'
import {
  achievements,
  chapters,
  collections,
  currentStreak,
  earnedProfileTitles,
  importAdventure,
  levelInfo,
  longestStreak,
  quests,
  recentActivity,
  shiftDay,
  weekKey,
  PROFILE_AVATARS,
  SHOP_ITEMS,
} from '@/lib/gamification'
import { arcadeModes } from '@/lib/arcade'
import { verses } from '@/lib/kieu'
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
type EarnedFilter = 'all' | 'earned' | 'pending'

const modeNames: Record<string, string> = {
  missing: 'Nhớ một chữ',
  next: 'Nối câu thơ',
  order: 'Xếp lời thơ',
  daily: 'Thử thách mỗi ngày',
  gap: 'Nhớ một chữ',
  continuation: 'Nối câu thơ',
  sequence: 'Xếp lời thơ',
  ...Object.fromEntries(
    Object.entries(arcadeModes).map(([id, item]) => [`arcade-${id}`, item.title])
  ),
}
const accentNames: Record<string, string> = {
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
const chapterActions: Record<string, { href: string; label: string }> = {
  opening: { href: '/full?line=1', label: 'Mở trang thơ' },
  keepsake: { href: '/full?line=1', label: 'Tìm câu để lưu' },
  landscapes: { href: '/lay-kieu', label: 'Khám phá chủ đề' },
  practice: { href: '/play/arcade', label: 'Chọn trò chơi' },
  knowledge: { href: '/play/arcade', label: 'Luyện trí nhớ' },
  mastery: { href: '/play/mastery', label: 'Ôn câu đã học' },
}
const verseText = new Map(verses.map(verse => [String(verse.id), verse.text]))

function Meter({ label, value, target }: { label: string; value: number; target: number }) {
  return (
    <div className="adventure-meter">
      <div className="adventure-meter-label">
        <span>{label}</span>
        <span>
          {Math.min(value, target)} / {target}
        </span>
      </div>
      <progress aria-label={label} value={Math.min(value, target)} max={Math.max(1, target)} />
    </div>
  )
}
function Heading({
  title,
  children,
  extra,
}: {
  title: string
  children: ReactNode
  extra?: ReactNode
}) {
  return (
    <div className="adventure-section-heading">
      <div>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
      {extra}
    </div>
  )
}
function Empty({
  title,
  children,
  href,
  action,
}: {
  title: string
  children: ReactNode
  href?: string
  action?: string
}) {
  return (
    <div className="adventure-empty">
      <h3>{title}</h3>
      <p>{children}</p>
      {href && (
        <Link className="button" href={href}>
          {action || 'Bắt đầu'} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  )
}
function matches(value: string, query: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLocaleLowerCase('vi')
    .includes(
      query
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .toLocaleLowerCase('vi')
    )
}

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
  const [profileDraft, setProfileDraft] = useState<string | null>(null)
  const [backupText, setBackupText] = useState('')
  const [backupPreview, setBackupPreview] = useState<{
    raw: string
    name: string
    xp: number
    coins: number
  } | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetPhrase, setResetPhrase] = useState('')
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([])
  const fileInput = useRef<HTMLInputElement | null>(null)
  const level = levelInfo(state.xp)
  const allQuests = quests(state, today)
  const allAchievements = achievements(state)
  const allCollections = collections(state)
  const day = state.activity.find(item => item.date === today)
  const calendar = recentActivity(state, today, 28)
  const pinned = allAchievements.find(item => item.id === state.pinnedAchievement && item.unlocked)
  const accuracy = state.stats.total
    ? Math.round((state.stats.correct / state.stats.total) * 100)
    : null
  const earnedAchievements = allAchievements.filter(item => item.unlocked).length
  const earnedCollections = allCollections.filter(item => item.unlocked).length
  const weekStart = weekKey(today)
  const thisWeek = state.activity.filter(item => item.date >= weekStart && item.date <= today)
  const previousWeek = state.activity.filter(
    item => item.date >= shiftDay(weekStart, -7) && item.date < weekStart
  )
  const weekXP = thisWeek.reduce((total, item) => total + item.xp, 0)
  const previousXP = previousWeek.reduce((total, item) => total + item.xp, 0)
  const weekCorrect = thisWeek.reduce((total, item) => total + item.correct, 0)
  const weekTotal = thisWeek.reduce((total, item) => total + item.total, 0)
  const nextChapter = chapters(state).find(item => item.unlocked && !item.claimed)

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
  function exportBackup() {
    const blob = new Blob([game.exportProgress()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `kieu-hanh-trinh-${today}.json`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice('Đã tạo bản sao hành trình. Hãy giữ tệp ở nơi bạn dễ tìm lại.')
  }
  function previewBackup(raw: string) {
    setBackupPreview(null)
    if (raw.length > 2_000_000) {
      setNotice('Tệp quá lớn. Hãy chọn bản sao hành trình nhỏ hơn 2 MB.')
      return
    }
    const candidate = importAdventure(raw)
    if (candidate) {
      setBackupPreview({
        raw,
        name: candidate.profile.name || 'Bạn đọc',
        xp: candidate.xp,
        coins: candidate.coins,
      })
      setNotice('Đã đọc bản sao. Xem thông tin bên dưới trước khi thay thế hành trình hiện tại.')
    } else {
      setNotice('Không đọc được bản sao. Hãy chọn tệp JSON đã xuất từ Hành trình Kiều.')
    }
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
              <>
                <div className="adventure-hero">
                  <div>
                    <div className="eyebrow">
                      {state.profile.avatar} {state.profile.title}
                    </div>
                    <h2>
                      Chào {state.profile.name || 'bạn đọc'},<br />
                      hôm nay mình đọc gì?
                    </h2>
                    <p>
                      {pinned
                        ? `Dấu ấn bạn chọn: ${pinned.title}.`
                        : 'Không cần vội. Một vài phút cùng thơ cũng là một bước tiến.'}
                    </p>
                    <div className="adventure-actions adventure-spacer">
                      <Link className="button primary" href="/play/arcade">
                        Khám phá trò mới <ArrowRight size={16} />
                      </Link>
                      <Link className="button" href="/full">
                        Mở trang thơ <BookOpen size={16} />
                      </Link>
                    </div>
                  </div>
                  <div className="adventure-hero-side">
                    <Meter
                      label={`Tiến tới cấp ${level.level + 1}`}
                      value={level.current}
                      target={level.required}
                    />
                    <Meter
                      label="Mục tiêu XP hôm nay"
                      value={day?.xp || 0}
                      target={state.dailyGoal}
                    />
                    <label className="adventure-field">
                      Nhịp học của bạn
                      <select
                        value={state.dailyGoal}
                        onChange={event =>
                          act(
                            () => game.setGoal(Number(event.target.value)),
                            'Đã đổi mục tiêu hằng ngày. Bạn có thể điều chỉnh bất cứ lúc nào.'
                          )
                        }
                      >
                        <option value={20}>Thong thả · 20 XP / ngày</option>
                        <option value={50}>Đều đặn · 50 XP / ngày</option>
                        <option value={100}>Hăng say · 100 XP / ngày</option>
                        <option value={200}>Chuyên tâm · 200 XP / ngày</option>
                      </select>
                    </label>
                  </div>
                </div>
                <div className="adventure-grid two">
                  <div className="adventure-card">
                    <h3>
                      <CalendarDays size={20} /> 28 ngày cùng thơ
                    </h3>
                    <p>
                      Mỗi ô là một ngày trên thiết bị này. Chơi, đọc và khám phá đều để lại dấu
                      chân.
                    </p>
                    <div className="adventure-calendar" aria-label="Hoạt động 28 ngày gần đây">
                      {calendar.map(item => {
                        const active =
                          item.xp > 0 ||
                          item.sessions > 0 ||
                          item.read > 0 ||
                          item.saved > 0 ||
                          item.explored > 0 ||
                          item.created > 0 ||
                          item.reflected > 0 ||
                          item.reviewed > 0 ||
                          item.focusMinutes > 0
                        const frozen = state.freezeDays.includes(item.date)
                        return (
                          <div
                            key={item.date}
                            className={`adventure-day ${active ? 'active' : ''} ${frozen ? 'frozen' : ''} ${item.date === today ? 'today' : ''}`}
                            title={`${item.date}: ${active ? `${item.xp} XP, ${item.read} câu đọc, ${item.sessions} lượt chơi` : frozen ? 'Đã dùng lá giữ nhịp' : 'Chưa có hoạt động'}`}
                            aria-label={`${item.date}: ${active ? `${item.xp} XP` : frozen ? 'Đã dùng lá giữ nhịp' : 'Chưa có hoạt động'}${item.date === today ? ', hôm nay' : ''}`}
                          >
                            {Number(item.date.slice(-2))}
                          </div>
                        )
                      })}
                    </div>
                    <div className="adventure-calendar-key">
                      <span>
                        <i className="adventure-dot" /> Có hoạt động
                      </span>
                      <span>
                        <i className="adventure-dot empty" /> Chưa có hoạt động
                      </span>
                      <span>Viền đất nung: hôm nay</span>
                    </div>
                    <p>
                      {state.freezeDays.length
                        ? `Đã dùng lá giữ nhịp cho ${state.freezeDays.length} ngày.`
                        : 'Lỡ một ngày? Lá giữ nhịp có trong Quà tặng.'}
                    </p>
                  </div>
                  <div className="adventure-card">
                    <h3>
                      <Gift size={20} /> Việc nhỏ cho hôm nay
                    </h3>
                    {allQuests
                      .filter(item => item.period === 'daily')
                      .slice(0, 3)
                      .map(item => (
                        <div key={item.id}>
                          <div className="adventure-card-top">
                            <strong>{item.title}</strong>
                            {item.claimed && <Check size={17} aria-label="Đã nhận" />}
                          </div>
                          <Meter label={item.description} value={item.value} target={item.target} />
                        </div>
                      ))}
                    <button className="button" type="button" onClick={() => selectPanel('quests')}>
                      Xem và nhận phần thưởng <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
                <div className="adventure-grid two adventure-spacer">
                  <div className="adventure-card">
                    <h3>Nhìn lại tuần này</h3>
                    <p>
                      Từ {weekStart.split('-').reverse().join('/')} đến hôm nay, theo lịch trên
                      thiết bị.
                    </p>
                    <div className="adventure-row">
                      <span>Điểm trải nghiệm</span>
                      <strong>{weekXP} XP</strong>
                    </div>
                    <div className="adventure-row">
                      <span>So với cả tuần trước</span>
                      <strong>
                        {weekXP >= previousXP ? '+' : ''}
                        {weekXP - previousXP} XP
                      </strong>
                    </div>
                    <div className="adventure-row">
                      <span>Ngày có hoạt động</span>
                      <strong>{thisWeek.filter(item => item.xp > 0).length} ngày</strong>
                    </div>
                    <div className="adventure-row">
                      <span>Độ chính xác</span>
                      <strong>
                        {weekTotal
                          ? `${Math.round((weekCorrect / weekTotal) * 100)}% · ${weekCorrect}/${weekTotal}`
                          : 'Chưa có lượt chơi'}
                      </strong>
                    </div>
                    <div className="adventure-row">
                      <span>Phút tập trung</span>
                      <strong>
                        {thisWeek.reduce((total, item) => total + item.focusMinutes, 0)}
                      </strong>
                    </div>
                    <p>Chuỗi dài nhất của bạn: {longestStreak(state)} ngày có hoạt động.</p>
                  </div>
                  <div className="adventure-card">
                    <h3>Bước nhỏ tiếp theo</h3>
                    {nextChapter ? (
                      <>
                        <span className="adventure-tag">Chặng đang mở</span>
                        <h3>{nextChapter.title}</h3>
                        <p>{nextChapter.description}</p>
                        <Meter
                          label="Mục tiêu tiếp theo"
                          value={nextChapter.value}
                          target={nextChapter.target}
                        />
                        <Link
                          className="button"
                          href={chapterActions[nextChapter.id]?.href || '/full'}
                        >
                          {chapterActions[nextChapter.id]?.label || 'Đọc thơ'}{' '}
                          <ArrowRight size={15} />
                        </Link>
                        <button
                          className="button"
                          type="button"
                          onClick={() => selectPanel('campaign')}
                        >
                          Xem đường thơ và nhận thưởng
                        </button>
                      </>
                    ) : (
                      <>
                        <p>
                          Bạn đã hoàn thành mọi chặng. Hãy trở lại những câu đã học và giữ nhịp đọc
                          theo cách của mình.
                        </p>
                        <Link className="button" href="/play/mastery">
                          Ôn những câu đã quen <ArrowRight size={15} />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
                <details>
                  <summary>Điểm và hạt ngọc đến từ đâu?</summary>
                  <p>
                    Đọc thơ, lưu câu yêu thích, khám phá chủ đề, hoàn thành trò chơi và nhận thưởng
                    nhiệm vụ giúp hành trình tiến lên. Một số hoạt động chỉ nhận thưởng lần đầu để
                    khuyến khích khám phá. Hạt ngọc chỉ dùng trong ứng dụng, không phải tiền. Mọi
                    thành tích được lưu trên trình duyệt này.
                  </p>
                </details>
              </>
            )}

            {panel === 'quests' && (
              <>
                <Heading title="Những việc nhỏ, niềm vui dài.">
                  Nhận phần thưởng khi đủ tiến độ. Nhiệm vụ hằng ngày và hằng tuần theo lịch trên
                  thiết bị.
                </Heading>
                <div className="adventure-toolbar" aria-label="Lọc nhiệm vụ">
                  {(
                    [
                      { id: 'all', label: 'Tất cả' },
                      { id: 'daily', label: 'Hôm nay' },
                      { id: 'weekly', label: 'Tuần này' },
                    ] as const
                  ).map(item => (
                    <button
                      type="button"
                      className="adventure-button"
                      key={item.id}
                      aria-pressed={questPeriod === item.id}
                      onClick={() => setQuestPeriod(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="adventure-grid">
                  {allQuests
                    .filter(item => questPeriod === 'all' || item.period === questPeriod)
                    .map(item => (
                      <div
                        className={`adventure-card ${item.claimed ? 'unlocked' : ''}`}
                        key={item.id}
                      >
                        <div className="adventure-card-top">
                          <span className="adventure-tag">
                            {item.period === 'daily' ? 'Hôm nay' : 'Tuần này'}
                          </span>
                          {item.claimed ? <Check size={21} /> : <Target size={21} />}
                        </div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                        <Meter label="Tiến độ nhiệm vụ" value={item.value} target={item.target} />
                        <span className="adventure-muted">
                          +{item.xp} XP · +{item.coins} hạt ngọc
                        </span>
                        <button
                          type="button"
                          className="button"
                          disabled={item.claimed || item.value < item.target}
                          onClick={() =>
                            act(() => game.claimQuest(item.id), `Đã nhận thưởng “${item.title}”.`)
                          }
                        >
                          {item.claimed
                            ? 'Đã nhận thưởng'
                            : item.value >= item.target
                              ? 'Nhận phần thưởng'
                              : 'Đang thực hiện'}
                        </button>
                      </div>
                    ))}
                </div>
              </>
            )}

            {panel === 'campaign' && (
              <>
                <Heading title="Đi dọc một câu chuyện.">
                  Sáu cột mốc từ đọc và lưu thơ đến luyện trí nhớ. Hoàn thành điều kiện, nhận thưởng
                  để bước tiếp.
                </Heading>
                <ol className="adventure-path">
                  {chapters(state).map((item, index) => (
                    <li
                      className={`adventure-chapter ${item.claimed ? 'claimed' : ''}`}
                      key={item.id}
                    >
                      <div className="adventure-chapter-number">
                        {item.claimed ? <Check size={24} /> : String(index + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                        <Meter label="Tiến độ chặng" value={item.value} target={item.target} />
                        <p className="adventure-spacer">
                          +{item.xp} XP · +{item.coins} hạt ngọc
                        </p>
                      </div>
                      <div className="adventure-actions">
                        <Link href={chapterActions[item.id]?.href || '/full'} className="button">
                          <BookOpen size={15} /> {chapterActions[item.id]?.label || 'Đọc thơ'}
                        </Link>
                        <button
                          type="button"
                          className="button"
                          disabled={item.claimed || !item.unlocked || item.value < item.target}
                          onClick={() =>
                            act(
                              () => game.claimChapter(item.id),
                              `Đã hoàn thành chặng “${item.title}”.`
                            )
                          }
                        >
                          {item.claimed ? (
                            'Đã hoàn thành'
                          ) : !item.unlocked ? (
                            <>
                              <Lock size={14} /> Hoàn thành chặng trước
                            </>
                          ) : item.value >= item.target ? (
                            'Nhận thưởng chặng'
                          ) : (
                            'Đang khám phá'
                          )}
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {panel === 'achievements' && (
              <>
                <Heading
                  title="Mỗi bước đi, một dấu ấn."
                  extra={
                    <span className="adventure-tag earned">
                      {earnedAchievements} / {allAchievements.length} đã mở
                    </span>
                  }
                >
                  Dấu ấn tự mở khi bạn đủ điều kiện. Ghim một dấu ấn yêu thích lên lời chào của
                  mình.
                </Heading>
                <div className="adventure-toolbar">
                  <label className="adventure-field grow">
                    <span>
                      <Search size={13} /> Tìm dấu ấn
                    </span>
                    <input
                      type="search"
                      value={achievementQuery}
                      onChange={event => setAchievementQuery(event.target.value)}
                      placeholder="Ví dụ: đọc, chuỗi, khám phá…"
                    />
                  </label>
                  <label className="adventure-field">
                    Trạng thái
                    <select
                      value={achievementFilter}
                      onChange={event => setAchievementFilter(event.target.value as EarnedFilter)}
                    >
                      <option value="all">Tất cả dấu ấn</option>
                      <option value="earned">Đã mở</option>
                      <option value="pending">Đang chờ bạn</option>
                    </select>
                  </label>
                </div>
                <div className="adventure-grid">
                  {allAchievements
                    .filter(
                      item =>
                        matches(`${item.title} ${item.description}`, achievementQuery) &&
                        (achievementFilter === 'all' ||
                          item.unlocked === (achievementFilter === 'earned'))
                    )
                    .map(item => (
                      <div
                        key={item.id}
                        className={`adventure-card ${item.unlocked ? 'unlocked' : 'locked'}`}
                      >
                        <div className="adventure-card-top">
                          <Award className="adventure-card-symbol" size={30} />
                          <span className={`adventure-tag ${item.unlocked ? 'earned' : ''}`}>
                            {item.unlocked ? 'Đã mở' : 'Chưa mở'}
                          </span>
                        </div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                        <Meter label="Tiến độ dấu ấn" value={item.value} target={item.target} />
                        <button
                          className="button"
                          type="button"
                          disabled={!item.unlocked}
                          aria-pressed={state.pinnedAchievement === item.id}
                          onClick={() =>
                            act(
                              () =>
                                game.pinAchievement(
                                  state.pinnedAchievement === item.id ? null : item.id
                                ),
                              state.pinnedAchievement === item.id
                                ? 'Đã bỏ ghim dấu ấn.'
                                : `Đã ghim “${item.title}” lên lời chào.`
                            )
                          }
                        >
                          <Pin size={14} />{' '}
                          {state.pinnedAchievement === item.id
                            ? 'Bỏ ghim dấu ấn'
                            : 'Ghim lên lời chào'}
                        </button>
                      </div>
                    ))}
                  {!allAchievements.some(
                    item =>
                      matches(`${item.title} ${item.description}`, achievementQuery) &&
                      (achievementFilter === 'all' ||
                        item.unlocked === (achievementFilter === 'earned'))
                  ) && (
                    <Empty title="Chưa có dấu ấn ở đây.">
                      Thử bộ lọc khác hoặc tiếp tục đọc và chơi để mở thêm dấu ấn.
                    </Empty>
                  )}
                </div>
              </>
            )}

            {panel === 'collection' && (
              <>
                <Heading
                  title="Một vườn kỷ niệm nhỏ."
                  extra={
                    <span className="adventure-tag earned">
                      {earnedCollections} / {allCollections.length} mảnh đã tìm
                    </span>
                  }
                >
                  Những mảnh kỷ niệm mở dần qua hoạt động của bạn. Mỗi mảnh có một điều kiện rõ
                  ràng.
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
                      item =>
                        collectionFilter === 'all' ||
                        item.unlocked === (collectionFilter === 'earned')
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
                            item.id.startsWith('topic-')
                              ? '/lay-kieu'
                              : `/full?line=${item.sourceId || 1}`
                          }
                          className="button"
                        >
                          {item.id.startsWith('topic-') ? 'Khám phá chủ đề' : 'Ghé thăm trang thơ'}{' '}
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    ))}
                  {!allCollections.some(
                    item =>
                      collectionFilter === 'all' ||
                      item.unlocked === (collectionFilter === 'earned')
                  ) && (
                    <Empty title="Một khu vườn đang đợi bạn." href="/full" action="Đọc vài câu thơ">
                      Đọc, lưu thơ và thử các trò chơi để bắt đầu bộ sưu tập.
                    </Empty>
                  )}
                </div>
              </>
            )}

            {panel === 'notebook' && (
              <>
                <Heading title="Nhớ lại những điều đã học.">
                  Thành tích của riêng bạn, qua những lượt chơi đã hoàn thành trên trình duyệt này.
                </Heading>
                <div className="adventure-stats">
                  <div>
                    <span>Lượt chơi</span>
                    <strong>{state.stats.sessions}</strong>
                    <span>đã hoàn thành</span>
                  </div>
                  <div>
                    <span>Độ chính xác</span>
                    <strong>{accuracy === null ? '—' : `${accuracy}%`}</strong>
                    <span>
                      {state.stats.correct} / {state.stats.total} câu đúng
                    </span>
                  </div>
                  <div>
                    <span>Lượt trọn vẹn</span>
                    <strong>{state.stats.perfect}</strong>
                    <span>đúng toàn bộ câu hỏi</span>
                  </div>
                  <div>
                    <span>Tự mình nhớ</span>
                    <strong>{state.stats.noHint}</strong>
                    <span>lượt đúng hết, không gợi ý</span>
                  </div>
                </div>
                <div className="adventure-grid two">
                  <div className="adventure-card">
                    <h3>Kỷ lục theo trò chơi</h3>
                    {Object.entries(state.best).length ? (
                      Object.entries(state.best).map(([mode, best]) => (
                        <div className="adventure-row" key={mode}>
                          <div>
                            <strong>{modeNames[mode] || mode}</strong>
                            <small>Kỷ lục cá nhân</small>
                          </div>
                          <span className="adventure-tag earned">
                            <Trophy size={14} /> {best}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <p>Hoàn thành một trò chơi để lưu kỷ lục đầu tiên.</p>
                    )}
                    <Link className="button" href="/play/arcade">
                      Chọn một trò chơi <ArrowRight size={15} />
                    </Link>
                  </div>
                  <div className="adventure-card">
                    <h3>Câu thơ đã quen</h3>
                    <label className="adventure-field">
                      Sắp xếp sổ luyện
                      <select
                        value={masteryOrder}
                        onChange={event => setMasteryOrder(event.target.value)}
                      >
                        <option value="recent">Gần đây nhất</option>
                        <option value="strong">Nhớ nhiều nhất</option>
                        <option value="practice">Cần luyện thêm</option>
                      </select>
                    </label>
                    {Object.entries(state.mastery).length ? (
                      Object.entries(state.mastery)
                        .sort((a, b) =>
                          masteryOrder === 'recent'
                            ? b[1].lastDate.localeCompare(a[1].lastDate)
                            : masteryOrder === 'strong'
                              ? b[1].count - a[1].count
                              : a[1].count - b[1].count
                        )
                        .slice(0, 12)
                        .map(([id, item]) => (
                          <div key={id} className="adventure-row">
                            <div>
                              <strong>Dòng {id}</strong>
                              <p>{verseText.get(id)}</p>
                              <small>
                                {item.count} ngày nhớ đúng · {item.lastDate}
                              </small>
                            </div>
                            <Link href={`/full?line=${id}`} className="text-link">
                              Đọc lại <ArrowRight size={14} />
                            </Link>
                          </div>
                        ))
                    ) : (
                      <p>Những câu bạn trả lời đúng sẽ xuất hiện ở đây để dễ tìm đọc lại.</p>
                    )}
                    <Link className="button" href="/play/mastery">
                      Luyện lại những câu đã học <BookOpen size={15} />
                    </Link>
                    <Link className="text-link" href="/play/review">
                      Mở sổ lỗi từ trò chơi cũ <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
                <div className="adventure-card adventure-spacer">
                  <h3>Những lượt chơi gần đây</h3>
                  {state.history.length ? (
                    [...state.history]
                      .reverse()
                      .slice(0, 10)
                      .map(item => (
                        <div className="adventure-row" key={item.id}>
                          <div>
                            <strong>{modeNames[item.mode] || item.mode}</strong>
                            <small>
                              {item.date} ·{' '}
                              {item.hints ? `${item.hints} gợi ý` : 'Không dùng gợi ý'}
                            </small>
                          </div>
                          <span>
                            {item.correct}/{item.total} câu · +{item.xp} XP
                          </span>
                        </div>
                      ))
                  ) : (
                    <p>Chưa có lượt chơi nào. Chọn một trò nhỏ để viết dòng đầu tiên vào sổ.</p>
                  )}
                </div>
              </>
            )}

            {panel === 'shop' && (
              <>
                <Heading
                  title="Đổi niềm vui thành kỷ niệm."
                  extra={<span className="adventure-tag earned">{state.coins} hạt ngọc</span>}
                >
                  Dùng hạt ngọc kiếm được để chọn một hình đại diện, danh xưng hay màu riêng.
                </Heading>
                <div className="adventure-toolbar">
                  <label className="adventure-field">
                    Chọn loại quà
                    <select
                      value={shopFilter}
                      onChange={event => setShopFilter(event.target.value)}
                    >
                      <option value="all">Tất cả món quà</option>
                      <option value="avatar">Hình đại diện</option>
                      <option value="title">Danh xưng</option>
                      <option value="accent">Màu hành trình</option>
                      <option value="freeze">Lá giữ nhịp</option>
                      <option value="owned">Quà đã có</option>
                    </select>
                  </label>
                </div>
                <div className="adventure-grid">
                  {SHOP_ITEMS.filter(
                    item =>
                      shopFilter === 'all' ||
                      (shopFilter === 'owned'
                        ? state.inventory.includes(item.id)
                        : item.type === shopFilter)
                  ).map(item => {
                    const owned = state.inventory.includes(item.id)
                    const equipped =
                      item.type !== 'freeze' && state.profile[item.type] === item.value
                    return (
                      <div className={`adventure-card ${owned ? 'unlocked' : ''}`} key={item.id}>
                        <div className="adventure-card-top">
                          <span className="adventure-card-symbol">
                            {item.type === 'avatar' ? (
                              item.value
                            ) : item.type === 'freeze' ? (
                              <Shield size={30} />
                            ) : item.type === 'accent' ? (
                              <Leaf size={30} />
                            ) : (
                              <Sparkles size={30} />
                            )}
                          </span>
                          <span className="adventure-tag">
                            {item.type === 'avatar'
                              ? 'Hình đại diện'
                              : item.type === 'title'
                                ? 'Danh xưng'
                                : item.type === 'accent'
                                  ? 'Màu hành trình'
                                  : 'Giữ nhịp'}
                          </span>
                        </div>
                        <h3>{item.name}</h3>
                        <p>{item.description}</p>
                        {item.type === 'freeze' && (
                          <p>
                            Chỉ bù cho hôm qua nếu bạn bỏ lỡ một ngày sau ngày có hoạt động. Hạt
                            ngọc chỉ trừ khi dùng được.
                          </p>
                        )}
                        <span className="adventure-muted">
                          {owned ? 'Trong túi quà của bạn' : `${item.cost} hạt ngọc`}
                        </span>
                        {owned && item.type !== 'freeze' ? (
                          <button
                            type="button"
                            className="button"
                            disabled={equipped}
                            onClick={() =>
                              act(() => game.equip(item.id), `Đã sử dụng “${item.name}”.`)
                            }
                          >
                            {equipped ? 'Đang sử dụng' : 'Sử dụng món quà'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="button"
                            disabled={state.coins < item.cost}
                            onClick={() =>
                              act(
                                () => game.buy(item.id),
                                item.type === 'freeze'
                                  ? 'Đã dùng lá giữ nhịp cho ngày hôm qua.'
                                  : `Đã đổi “${item.name}”. Bạn có thể sử dụng ngay.`
                              )
                            }
                          >
                            {state.coins < item.cost
                              ? `Cần thêm ${item.cost - state.coins} hạt ngọc`
                              : item.type === 'freeze'
                                ? 'Dùng lá giữ nhịp'
                                : 'Đổi món quà'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {shopFilter === 'owned' &&
                    !SHOP_ITEMS.some(item => state.inventory.includes(item.id)) && (
                      <Empty title="Túi quà còn trống.">
                        Hoàn thành nhiệm vụ để dành hạt ngọc cho món quà đầu tiên.
                      </Empty>
                    )}
                </div>
              </>
            )}

            {panel === 'profile' && (
              <>
                <Heading title="Một hành trình mang tên bạn.">
                  Tên gọi, màu sắc và dữ liệu đều nằm trong trình duyệt của bạn.
                </Heading>
                <div className="adventure-grid two">
                  <div className="adventure-card">
                    <h3>Góc của bạn</h3>
                    <div className="adventure-profile-preview">
                      <div className="adventure-profile-avatar">{state.profile.avatar}</div>
                      <div>
                        <strong>{state.profile.name || 'Bạn đọc'}</strong>
                        <small>
                          {state.profile.title} · Cấp {level.level}
                        </small>
                      </div>
                    </div>
                    <form
                      onSubmit={event => {
                        event.preventDefault()
                        act(
                          () =>
                            game.updateProfile({
                              name: (profileDraft ?? state.profile.name).trim() || 'Bạn đọc',
                            }),
                          'Đã lưu tên gọi của bạn.'
                        )
                        setProfileDraft(null)
                      }}
                    >
                      <label className="adventure-field">
                        Bạn muốn được gọi là gì?
                        <input
                          maxLength={32}
                          value={profileDraft ?? state.profile.name}
                          onChange={event => setProfileDraft(event.target.value)}
                          autoComplete="nickname"
                        />
                      </label>
                      <button className="button adventure-spacer" type="submit">
                        Lưu tên gọi <Check size={15} />
                      </button>
                    </form>
                    <fieldset className="adventure-fieldset">
                      <legend>Hình đại diện</legend>
                      <div className="adventure-actions">
                        {[
                          ...new Set([
                            ...PROFILE_AVATARS.slice(0, 3),
                            ...SHOP_ITEMS.filter(
                              item => item.type === 'avatar' && state.inventory.includes(item.id)
                            ).map(item => item.value),
                          ]),
                        ].map(avatar => (
                          <label className="adventure-choice" key={avatar}>
                            <input
                              type="radio"
                              name="avatar"
                              value={avatar}
                              checked={state.profile.avatar === avatar}
                              onChange={() =>
                                act(() => game.updateProfile({ avatar }), 'Đã đổi hình đại diện.')
                              }
                            />
                            <span>{avatar}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <label className="adventure-field">
                      Danh xưng
                      <select
                        value={state.profile.title}
                        onChange={event =>
                          act(
                            () => game.updateProfile({ title: event.target.value }),
                            'Đã đổi danh xưng.'
                          )
                        }
                      >
                        {[
                          ...new Set([
                            ...earnedProfileTitles(state),
                            ...SHOP_ITEMS.filter(
                              item => item.type === 'title' && state.inventory.includes(item.id)
                            ).map(item => item.value),
                          ]),
                        ].map(title => (
                          <option value={title} key={title}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="adventure-field">
                      Màu hành trình
                      <select
                        value={state.profile.accent}
                        onChange={event =>
                          act(
                            () => game.updateProfile({ accent: event.target.value }),
                            'Đã đổi màu hành trình.'
                          )
                        }
                      >
                        {[
                          ...new Set([
                            'indigo',
                            ...SHOP_ITEMS.filter(
                              item => item.type === 'accent' && state.inventory.includes(item.id)
                            ).map(item => item.value),
                          ]),
                        ].map(accent => (
                          <option value={accent} key={accent}>
                            {accentNames[accent] || accent}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="adventure-card">
                    <h3>Mang theo hành trình</h3>
                    <p>
                      Xuất bản sao để giữ lại XP, hạt ngọc và các dấu ấn. Bản sao này chỉ chứa hành
                      trình mới; tủ thơ và tiến độ trò chơi cũ được quản lý riêng.
                    </p>
                    <button type="button" className="button" onClick={exportBackup}>
                      <Download size={16} /> Xuất bản sao JSON
                    </button>
                    <label className="adventure-field">
                      Chọn bản sao để xem trước
                      <input
                        ref={fileInput}
                        type="file"
                        accept="application/json,.json"
                        onChange={async event => {
                          setBackupPreview(null)
                          const file = event.target.files?.[0]
                          if (!file) return
                          if (file.size > 2_000_000) {
                            setNotice('Tệp quá lớn. Hãy chọn tệp nhỏ hơn 2 MB.')
                            return
                          }
                          try {
                            const raw = await file.text()
                            setBackupText(raw)
                            previewBackup(raw)
                          } catch {
                            setNotice('Không đọc được tệp đã chọn. Vui lòng thử lại.')
                          }
                        }}
                      />
                    </label>
                    <details>
                      <summary>Hoặc dán nội dung bản sao</summary>
                      <label className="adventure-field">
                        Nội dung JSON
                        <textarea
                          value={backupText}
                          onChange={event => {
                            setBackupText(event.target.value)
                            setBackupPreview(null)
                          }}
                          placeholder="Dán nội dung tệp bản sao ở đây"
                        />
                      </label>
                      <button
                        type="button"
                        className="button adventure-spacer"
                        onClick={() => previewBackup(backupText)}
                        disabled={!backupText.trim()}
                      >
                        <Upload size={15} /> Xem trước bản sao
                      </button>
                    </details>
                    {backupPreview && (
                      <div className="adventure-import-preview">
                        <h3>Xem trước: {backupPreview.name}</h3>
                        <p>
                          {backupPreview.xp.toLocaleString('vi-VN')} XP ·{' '}
                          {backupPreview.coins.toLocaleString('vi-VN')} hạt ngọc
                        </p>
                        <p>
                          Nhập bản sao sẽ thay thế hành trình hiện tại. Hãy xuất một bản sao hiện
                          tại trước nếu cần giữ lại.
                        </p>
                        <div className="adventure-actions">
                          <button
                            className="button primary"
                            type="button"
                            onClick={() => {
                              const accepted = game.importProgress(backupPreview.raw)
                              if (accepted) {
                                setBackupPreview(null)
                                setBackupText('')
                                setProfileDraft(null)
                                if (fileInput.current) fileInput.current.value = ''
                                setNotice('Đã khôi phục hành trình từ bản sao.')
                              } else
                                setNotice(
                                  'Bản sao không hợp lệ. Hành trình hiện tại vẫn được giữ nguyên.'
                                )
                            }}
                          >
                            Thay thế bằng bản sao này
                          </button>
                          <button
                            className="button"
                            type="button"
                            onClick={() => setBackupPreview(null)}
                          >
                            Hủy nhập
                          </button>
                        </div>
                      </div>
                    )}
                    <details>
                      <summary>Bắt đầu lại từ đầu</summary>
                      <p>
                        Đặt lại sẽ xóa hành trình mới trên trình duyệt này: điểm, hạt ngọc, nhiệm
                        vụ, dấu ấn và quà. Tủ thơ và trò chơi cũ không bị xóa.
                      </p>
                      {!resetOpen ? (
                        <button
                          className="button adventure-danger adventure-spacer"
                          type="button"
                          onClick={() => setResetOpen(true)}
                        >
                          Mở xác nhận đặt lại
                        </button>
                      ) : (
                        <div className="adventure-confirm adventure-spacer">
                          <label className="adventure-field">
                            Nhập “BẮT ĐẦU LẠI” để xác nhận
                            <input
                              value={resetPhrase}
                              onChange={event => setResetPhrase(event.target.value)}
                              autoComplete="off"
                            />
                          </label>
                          <div className="adventure-actions">
                            <button
                              className="button adventure-danger"
                              type="button"
                              disabled={resetPhrase !== 'BẮT ĐẦU LẠI'}
                              onClick={() => {
                                game.resetProgress()
                                setResetOpen(false)
                                setResetPhrase('')
                                setBackupPreview(null)
                                setProfileDraft(null)
                                setNotice('Đã mở một hành trình mới.')
                              }}
                            >
                              Xóa hành trình này
                            </button>
                            <button
                              className="button"
                              type="button"
                              onClick={() => {
                                setResetOpen(false)
                                setResetPhrase('')
                              }}
                            >
                              Giữ hành trình
                            </button>
                          </div>
                        </div>
                      )}
                    </details>
                  </div>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
