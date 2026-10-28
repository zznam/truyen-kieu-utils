'use client'

import { earnedProfileTitles, levelInfo, PROFILE_AVATARS, SHOP_ITEMS } from '@/lib/gamification'
import { Check, Download, Upload } from 'lucide-react'
import { accentNames } from './presentation'
import { Heading } from './shared'
import type { AdventureAction, AdventureGame } from './types'
import type { useAdventureProfile } from './use-profile'

type Props = {
  game: AdventureGame
  act: AdventureAction
  profile: ReturnType<typeof useAdventureProfile>
  setNotice: (notice: string) => void
}

export function ProfilePanel({ game, act, profile, setNotice }: Props) {
  const { state } = game
  const level = levelInfo(state.xp)
  const {
    profileDraft,
    setProfileDraft,
    backupText,
    setBackupText,
    backupPreview,
    setBackupPreview,
    resetOpen,
    setResetOpen,
    resetPhrase,
    setResetPhrase,
    fileInput,
    exportBackup,
    previewBackup,
  } = profile
  return (
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
                act(() => game.updateProfile({ title: event.target.value }), 'Đã đổi danh xưng.')
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
            Xuất bản sao để giữ lại XP, hạt ngọc và các dấu ấn. Bản sao này chỉ chứa hành trình mới;
            tủ thơ và tiến độ trò chơi cũ được quản lý riêng.
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
                Nhập bản sao sẽ thay thế hành trình hiện tại. Hãy xuất một bản sao hiện tại trước
                nếu cần giữ lại.
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
                      setNotice('Bản sao không hợp lệ. Hành trình hiện tại vẫn được giữ nguyên.')
                  }}
                >
                  Thay thế bằng bản sao này
                </button>
                <button className="button" type="button" onClick={() => setBackupPreview(null)}>
                  Hủy nhập
                </button>
              </div>
            </div>
          )}
          <details>
            <summary>Bắt đầu lại từ đầu</summary>
            <p>
              Đặt lại sẽ xóa hành trình mới trên trình duyệt này: điểm, hạt ngọc, nhiệm vụ, dấu ấn
              và quà. Tủ thơ và trò chơi cũ không bị xóa.
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
  )
}
