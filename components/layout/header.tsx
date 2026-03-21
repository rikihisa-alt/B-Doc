'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, LogOut, ChevronDown } from 'lucide-react'
import { USER_ROLE_LABELS } from '@/types'
import { cn } from '@/lib/utils'

// =============================================================================
// 型定義
// =============================================================================

interface HeaderProps {
  /** ユーザー表示名 */
  userName: string
  /** ユーザーのプライマリロール */
  userRole: string
}

// =============================================================================
// ヘッダーコンポーネント
// =============================================================================

/**
 * ダッシュボード上部のスリムヘッダー
 * - 左: ブレッドクラム / ページコンテキスト（将来用、現在は空）
 * - 右: 通知ベル + ユーザー名 + ロールバッジ + ログアウトドロップダウン
 */
export function Header({ userName, userRole }: HeaderProps) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ロールの日本語ラベル
  const roleLabel =
    USER_ROLE_LABELS[userRole as keyof typeof USER_ROLE_LABELS] ?? userRole

  // ドロップダウン外側クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ログアウト処理
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-6">
      {/* 左側: ブレッドクラム / ページコンテキスト（将来拡張用） */}
      <div className="flex items-center text-sm text-slate-500" />

      {/* 右側: 通知 + ユーザー情報 */}
      <div className="flex items-center gap-3">
        {/* 通知ベル */}
        <button
          type="button"
          className="relative rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          title="通知"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          {/* 通知件数バッジ（将来的にpropsで制御） */}
          {/*
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
            3
          </span>
          */}
        </button>

        {/* 区切り線 */}
        <div className="h-5 w-px bg-slate-200" />

        {/* ユーザードロップダウン */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-slate-50"
          >
            {/* ユーザー名 */}
            <span className="text-slate-700 font-medium text-xs">
              {userName}
            </span>

            {/* ロールバッジ */}
            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              {roleLabel}
            </span>

            <ChevronDown
              className={cn(
                'h-3 w-3 text-slate-400 transition-transform',
                dropdownOpen && 'rotate-180'
              )}
            />
          </button>

          {/* ドロップダウンメニュー */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded border border-slate-200 bg-white py-1 shadow-lg z-50">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-xs font-medium text-slate-700 truncate">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-400">{roleLabel}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50 hover:text-red-600"
              >
                <LogOut className="h-3.5 w-3.5" />
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
