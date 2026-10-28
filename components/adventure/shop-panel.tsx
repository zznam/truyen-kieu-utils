'use client'

import { SHOP_ITEMS } from '@/lib/gamification'
import { Leaf, Shield, Sparkles } from 'lucide-react'
import { Empty, Heading } from './shared'
import type { AdventureAction, AdventureGame } from './types'

type Props = {
  game: AdventureGame
  act: AdventureAction
  shopFilter: string
  setShopFilter: (filter: string) => void
}

export function ShopPanel({ game, act, shopFilter, setShopFilter }: Props) {
  const { state } = game
  return (
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
          <select value={shopFilter} onChange={event => setShopFilter(event.target.value)}>
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
            (shopFilter === 'owned' ? state.inventory.includes(item.id) : item.type === shopFilter)
        ).map(item => {
          const owned = state.inventory.includes(item.id)
          const equipped = item.type !== 'freeze' && state.profile[item.type] === item.value
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
                  Chỉ bù cho hôm qua nếu bạn bỏ lỡ một ngày sau ngày có hoạt động. Hạt ngọc chỉ trừ
                  khi dùng được.
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
                  onClick={() => act(() => game.equip(item.id), `Đã sử dụng “${item.name}”.`)}
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
        {shopFilter === 'owned' && !SHOP_ITEMS.some(item => state.inventory.includes(item.id)) && (
          <Empty title="Túi quà còn trống.">
            Hoàn thành nhiệm vụ để dành hạt ngọc cho món quà đầu tiên.
          </Empty>
        )}
      </div>
    </>
  )
}
