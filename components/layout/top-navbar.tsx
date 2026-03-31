'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  FileText,
  CheckSquare,
  Layout,
  Database,
  Shield,
  Settings,
  Bell,
  LogOut,
  ChevronDown,
  Plus,
  History,
  RotateCcw,
  List,
  Stamp,
  Building2,
  Users,
  Lock,
  GitBranch,
  FilePlus,
  UserCog,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getCurrentUser,
  setCurrentUser,
  addAuditLog,
  USER_ROLE_TYPE_LABELS,
} from '@/lib/store'
import type { CurrentUser, UserRoleType } from '@/lib/store'
import type { LucideIcon } from 'lucide-react'

// =============================================================================
// 型定義
// =============================================================================

/** ドロップダウンのサブメニュー項目 */
interface SubMenuItem {
  /** アイコンコンポーネント */
  icon: LucideIcon
  /** 表示ラベル */
  label: string
  /** リンク先パス */
  href: string
}

/** トップナビゲーション項目 */
interface TopNavItem {
  /** 一意の識別子 */
  id: string
  /** アイコンコンポーネント */
  icon: LucideIcon
  /** 表示ラベル（日本語） */
  label: string
  /** メインリンク先パス */
  href: string
  /** ドロップダウンサブメニュー（省略時はドロップダウンなし） */
  subItems?: SubMenuItem[]
  /** バッジ表示数（省略時は非表示） */
  badgeCount?: number
}

/** プロパティ（オプショナル化：内部でストアから読み取る） */
interface TopNavbarProps {
  /** ユーザー表示名（省略時はストアから取得） */
  userName?: string
  /** ユーザーのプライマリロール（省略時はストアから取得） */
  userRole?: string
}

// =============================================================================
// ナビゲーション定義
// =============================================================================

/** デフォルトのナビゲーション項目順序 */
const DEFAULT_NAV_ORDER = [
  'dashboard',
  'documents',
  'approvals',
  'templates',
  'master',
  'audit',
  'settings',
]

/** ナビゲーション項目のマスタ定義 */
const NAV_ITEMS_MAP: Record<string, TopNavItem> = {
  dashboard: {
    id: 'dashboard',
    icon: Home,
    label: 'ダッシュボード',
    href: '/dashboard',
  },
  documents: {
    id: 'documents',
    icon: FileText,
    label: '文書',
    href: '/documents',
    subItems: [
      { icon: List, label: '文書一覧', href: '/documents' },
      { icon: FilePlus, label: '新規作成', href: '/documents/new/select-template' },
      { icon: History, label: '発行履歴', href: '/documents?status=issued' },
    ],
  },
  approvals: {
    id: 'approvals',
    icon: CheckSquare,
    label: '承認',
    href: '/approvals',
    badgeCount: 3,
    subItems: [
      { icon: CheckSquare, label: '承認待ち', href: '/approvals' },
      { icon: RotateCcw, label: '差戻し一覧', href: '/documents?status=returned' },
    ],
  },
  templates: {
    id: 'templates',
    icon: Layout,
    label: 'テンプレート',
    href: '/templates',
    subItems: [
      { icon: List, label: 'テンプレート一覧', href: '/templates' },
      { icon: Plus, label: '新規テンプレート', href: '/templates/new' },
      { icon: Stamp, label: '印影管理', href: '/master/seals' },
    ],
  },
  master: {
    id: 'master',
    icon: Database,
    label: 'マスタ',
    href: '/master',
    subItems: [
      { icon: Database, label: 'マスタ管理トップ', href: '/master' },
      { icon: Stamp, label: '印影管理', href: '/master/seals' },
      { icon: Building2, label: '会社・事業所', href: '/master/organizations' },
      { icon: Users, label: '従業員', href: '/master/employees' },
    ],
  },
  audit: {
    id: 'audit',
    icon: Shield,
    label: '監査',
    href: '/audit-logs',
  },
  settings: {
    id: 'settings',
    icon: Settings,
    label: '設定',
    href: '/settings',
    subItems: [
      { icon: Settings, label: '設定トップ', href: '/settings' },
      { icon: Lock, label: '権限管理', href: '/settings/permissions' },
      { icon: GitBranch, label: '承認フロー', href: '/settings/workflows' },
    ],
  },
}

/** ロール別に表示するナビゲーション項目 */
const NAV_ITEMS_BY_ROLE: Record<UserRoleType, string[]> = {
  staff: ['dashboard', 'documents', 'templates'],
  manager: ['dashboard', 'documents', 'approvals', 'templates'],
  admin: ['dashboard', 'documents', 'approvals', 'templates', 'master', 'audit', 'settings'],
}

/** localStorageキー */
const NAV_ORDER_STORAGE_KEY = 'bdoc_nav_order'

// =============================================================================
// ユーティリティ
// =============================================================================

/** localStorageからナビゲーション順序を取得 */
function loadNavOrder(): string[] {
  if (typeof window === 'undefined') return DEFAULT_NAV_ORDER
  try {
    const saved = localStorage.getItem(NAV_ORDER_STORAGE_KEY)
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
        // 保存済みの順序にない新しい項目があれば末尾に追加
        const order = parsed as string[]
        const missing = DEFAULT_NAV_ORDER.filter((id) => !order.includes(id))
        return [...order.filter((id) => DEFAULT_NAV_ORDER.includes(id)), ...missing]
      }
    }
  } catch {
    // パースエラー時はデフォルトを返す
  }
  return DEFAULT_NAV_ORDER
}

/** localStorageにナビゲーション順序を保存 */
function saveNavOrder(order: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(NAV_ORDER_STORAGE_KEY, JSON.stringify(order))
  } catch {
    // ストレージ書き込みエラーは無視
  }
}

// =============================================================================
// ドロップダウンメニューコンポーネント
// =============================================================================

interface DropdownMenuProps {
  /** サブメニュー項目 */
  items: SubMenuItem[]
  /** 表示状態 */
  visible: boolean
}

/** ホバードロップダウンメニュー */
function DropdownMenu({ items, visible }: DropdownMenuProps) {
  return (
    <div
      className={cn(
        'absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-xl border border-slate-200/80 bg-white py-1.5 shadow-xl shadow-slate-200/50',
        'transition-all duration-200 ease-out',
        visible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none -translate-y-2 opacity-0'
      )}
    >
      {items.map((sub) => (
        <Link
          key={sub.href + sub.label}
          href={sub.href}
          className="group flex items-center gap-3 mx-1.5 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-all duration-150 hover:bg-blue-50 hover:text-blue-700"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition-colors group-hover:bg-blue-100 group-hover:text-blue-600">
            <sub.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          </span>
          <span className="font-medium">{sub.label}</span>
        </Link>
      ))}
    </div>
  )
}

// =============================================================================
// ナビゲーション項目コンポーネント
// =============================================================================

interface NavItemButtonProps {
  /** ナビゲーション項目データ */
  item: TopNavItem
  /** アクティブ状態 */
  isActive: boolean
  /** ドラッグ中の状態 */
  isDragging: boolean
  /** ドロップ対象状態 */
  isDropTarget: boolean
  /** ドラッグ開始ハンドラ */
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void
  /** ドラッグオーバーハンドラ */
  onDragOver: (e: React.DragEvent<HTMLDivElement>, id: string) => void
  /** ドロップハンドラ */
  onDrop: (e: React.DragEvent<HTMLDivElement>, id: string) => void
  /** ドラッグ終了ハンドラ */
  onDragEnd: () => void
}

/** 個別ナビゲーション項目 */
function NavItemButton({
  item,
  isActive,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: NavItemButtonProps) {
  const [hovered, setHovered] = useState(false)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** マウスエンター: ドロップダウンを即時表示 */
  const handleMouseEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
    if (item.subItems && item.subItems.length > 0) {
      setHovered(true)
    }
  }, [item.subItems])

  /** マウスリーブ: 200ms遅延後に非表示 */
  const handleMouseLeave = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => {
      setHovered(false)
    }, 200)
  }, [])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    }
  }, [])

  const hasDropdown = item.subItems && item.subItems.length > 0

  return (
    <div
      className={cn(
        'relative',
        isDropTarget && 'before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:rounded before:bg-blue-500'
      )}
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onDragOver={(e) => onDragOver(e, item.id)}
      onDrop={(e) => onDrop(e, item.id)}
      onDragEnd={onDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all duration-200 rounded-md select-none',
          'border-b-2 -mb-[2px]',
          isDragging && 'opacity-40',
          isActive
            ? 'text-blue-700 border-blue-600 bg-blue-50/70'
            : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/70'
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        <span className="whitespace-nowrap">{item.label}</span>

        {/* バッジ表示 */}
        {item.badgeCount !== undefined && item.badgeCount > 0 && (
          <span className="ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {item.badgeCount}
          </span>
        )}

        {/* ドロップダウン矢印 */}
        {hasDropdown && (
          <ChevronDown
            className={cn(
              'h-3 w-3 text-slate-400 transition-transform',
              hovered && 'rotate-180'
            )}
          />
        )}
      </Link>

      {/* ドロップダウンメニュー */}
      {hasDropdown && (
        <DropdownMenu items={item.subItems!} visible={hovered} />
      )}
    </div>
  )
}

// =============================================================================
// ロールバッジの色マップ
// =============================================================================

/** ロールバッジの色設定（staff=灰, manager=青, admin=紫） */
const ROLE_BADGE_COLORS: Record<UserRoleType, string> = {
  staff: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  manager: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  admin: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200',
}

// =============================================================================
// モバイル用ボトムタブバー
// =============================================================================

/** モバイルタブ項目の型 */
interface MobileTabItem {
  id: string
  icon: LucideIcon
  href: string
}

/** モバイルボトムタブバーの5項目（ダッシュボード、文書、テンプレート、承認、メニュー） */
const MOBILE_TABS: MobileTabItem[] = [
  { id: 'dashboard', icon: Home, href: '/dashboard' },
  { id: 'documents', icon: FileText, href: '/documents' },
  { id: 'templates', icon: Layout, href: '/templates' },
  { id: 'approvals', icon: CheckSquare, href: '/approvals' },
  { id: 'more', icon: Menu, href: '' },
]

/** スライドアップシートに表示する残りのメニュー項目 */
const MORE_MENU_ITEMS: SubMenuItem[] = [
  { icon: Database, label: 'マスタ管理', href: '/master' },
  { icon: Stamp, label: '印影管理', href: '/master/seals' },
  { icon: Shield, label: '監査ログ', href: '/audit-logs' },
  { icon: Settings, label: '設定', href: '/settings' },
  { icon: Lock, label: '権限管理', href: '/settings/permissions' },
  { icon: FilePlus, label: '新規文書作成', href: '/documents/new/select-template' },
]

/** モバイル用ボトムタブバーコンポーネント */
function MobileBottomTabBar({ pathname }: { pathname: string }) {
  const [showMoreSheet, setShowMoreSheet] = useState(false)

  /** タブがアクティブかどうか */
  const isTabActive = useCallback((tab: MobileTabItem): boolean => {
    if (tab.id === 'more') return false
    if (tab.href === '/dashboard') return pathname === '/dashboard'
    return pathname === tab.href || pathname.startsWith(tab.href + '/')
  }, [pathname])

  return (
    <>
      {/* ボトムタブバー */}
      <div className="mobile-bottom-bar md:hidden">
        <nav className="flex items-center justify-around px-2 py-1">
          {MOBILE_TABS.map((tab) => {
            const active = isTabActive(tab)
            if (tab.id === 'more') {
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setShowMoreSheet(true)}
                  className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1 transition-colors"
                >
                  <tab.icon className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
                </button>
              )
            }
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1 transition-colors"
              >
                <tab.icon
                  className={cn('h-5 w-5', active ? 'text-blue-600' : 'text-slate-400')}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {/* アクティブインジケーター（青いドット） */}
                {active && (
                  <div className="h-1 w-1 rounded-full bg-blue-600" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* スライドアップシート（メニュー） */}
      {showMoreSheet && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowMoreSheet(false)}
          />
          {/* シートコンテンツ */}
          <div className="absolute bottom-0 left-0 right-0 animate-slide-up-sheet rounded-t-2xl bg-white safe-area-bottom">
            {/* ハンドル */}
            <div className="flex justify-center py-3">
              <div className="h-1 w-10 rounded-full bg-slate-300" />
            </div>
            <div className="px-4 pb-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-500">メニュー</h3>
              <div className="space-y-1">
                {MORE_MENU_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMoreSheet(false)}
                    className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition-colors active:bg-blue-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <item.icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
            {/* セーフエリア分の余白 */}
            <div className="h-2" />
          </div>
        </div>
      )}
    </>
  )
}

// =============================================================================
// メインコンポーネント: TopNavbar
// =============================================================================

/**
 * トップナビゲーションバー
 * - ロゴ表示（左端固定）
 * - ナビゲーション項目（ドラッグ&ドロップで並び替え可能、ロール別表示）
 * - ホバーでドロップダウンメニュー表示
 * - 通知ベル + ユーザーメニュー + ロール切替（右端固定）
 */
export function TopNavbar({ userName: _userName, userRole: _userRole }: TopNavbarProps) {
  const pathname = usePathname()
  const router = useRouter()

  // 現在のユーザー情報をストアから読み取る
  const [currentUser, setCurrentUserState] = useState<CurrentUser | null>(null)

  useEffect(() => {
    setCurrentUserState(getCurrentUser())
  }, [])

  // 表示用の値（ストア優先、propsはフォールバック）
  const displayName = currentUser?.name ?? _userName ?? 'デモユーザー'
  const displayRole = currentUser?.role ?? 'staff'
  const roleLabel = USER_ROLE_TYPE_LABELS[displayRole] ?? displayRole

  // ナビゲーション項目の順序管理
  const [navOrder, setNavOrder] = useState<string[]>(DEFAULT_NAV_ORDER)
  // ドラッグ中の項目ID
  const [dragItemId, setDragItemId] = useState<string | null>(null)
  // ドロップ対象の項目ID
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  // ユーザードロップダウンの開閉
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // ロール別に表示するナビ項目を決定
  const allowedNavIds = NAV_ITEMS_BY_ROLE[displayRole] ?? NAV_ITEMS_BY_ROLE.staff

  // 初期マウント時にlocalStorageから順序を読み込む
  useEffect(() => {
    setNavOrder(loadNavOrder())
  }, [])

  // ユーザーメニュー外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // =========================================================================
  // ロール切替ハンドラ
  // =========================================================================

  /** ロールを切り替える */
  const handleRoleChange = useCallback((newRole: UserRoleType) => {
    const user = getCurrentUser()
    const oldRole = user.role

    // ロール別のデフォルト情報
    const roleDefaults: Record<UserRoleType, { position: string }> = {
      staff: { position: '一般社員' },
      manager: { position: '部長' },
      admin: { position: 'システム管理者' },
    }

    const updatedUser: CurrentUser = {
      ...user,
      role: newRole,
      position: roleDefaults[newRole].position,
    }

    setCurrentUser(updatedUser)

    // 監査ログ記録
    addAuditLog({
      user_name: user.name,
      user_role: newRole,
      target_type: 'user',
      target_id: user.id,
      target_label: user.name,
      operation: 'role_change',
      before_value: { role: oldRole },
      after_value: { role: newRole },
      success: true,
      comment: `ロール切替: ${USER_ROLE_TYPE_LABELS[oldRole]} → ${USER_ROLE_TYPE_LABELS[newRole]}`,
    })

    // ページをリロードして反映
    window.location.reload()
  }, [])

  // =========================================================================
  // ドラッグ&ドロップハンドラ
  // =========================================================================

  /** ドラッグ開始 */
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, id: string) => {
      setDragItemId(id)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', id)
    },
    []
  )

  /** ドラッグオーバー（ドロップ許可 + 対象表示） */
  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, id: string) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (id !== dragItemId) {
        setDropTargetId(id)
      }
    },
    [dragItemId]
  )

  /** ドロップ: 項目を入れ替えて保存 */
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
      e.preventDefault()
      const sourceId = e.dataTransfer.getData('text/plain')
      if (!sourceId || sourceId === targetId) {
        setDragItemId(null)
        setDropTargetId(null)
        return
      }
      setNavOrder((prev) => {
        const newOrder = [...prev]
        const sourceIndex = newOrder.indexOf(sourceId)
        const targetIndex = newOrder.indexOf(targetId)
        if (sourceIndex === -1 || targetIndex === -1) return prev
        // ソース項目を削除してターゲット位置に挿入
        newOrder.splice(sourceIndex, 1)
        newOrder.splice(targetIndex, 0, sourceId)
        saveNavOrder(newOrder)
        return newOrder
      })
      setDragItemId(null)
      setDropTargetId(null)
    },
    []
  )

  /** ドラッグ終了（キャンセル含む） */
  const handleDragEnd = useCallback(() => {
    setDragItemId(null)
    setDropTargetId(null)
  }, [])

  // =========================================================================
  // ログアウト処理（Supabase未使用のデモ版）
  // =========================================================================

  const handleLogout = useCallback(async () => {
    router.push('/login')
    router.refresh()
  }, [router])

  // =========================================================================
  // アクティブ判定
  // =========================================================================

  /** 現在のパスに対してナビ項目がアクティブかどうか判定 */
  const isItemActive = useCallback(
    (item: TopNavItem): boolean => {
      if (item.href === '/dashboard') {
        return pathname === '/dashboard'
      }
      return pathname === item.href || pathname.startsWith(item.href + '/')
    },
    [pathname]
  )

  // =========================================================================
  // 描画
  // =========================================================================

  return (
    <>
    {/* モバイル用ボトムタブバー */}
    <MobileBottomTabBar pathname={pathname} />

    <header className="hidden md:flex h-14 items-center border-b border-slate-200 bg-white px-4">
      {/* ロゴ（左端固定、ドラッグ不可） */}
      <Link
        href="/dashboard"
        className="mr-6 flex shrink-0 items-center gap-2"
      >
        <Image
          src="/logo.png"
          alt="B-Doc"
          width={120}
          height={40}
          className="h-9 w-auto"
          priority
        />
      </Link>

      {/* ナビゲーション項目（ドラッグ可能、水平スクロール対応、ロール別フィルタ） */}
      <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
        {navOrder
          .filter((id) => allowedNavIds.includes(id))
          .map((id) => {
            const item = NAV_ITEMS_MAP[id]
            if (!item) return null
            return (
              <NavItemButton
                key={item.id}
                item={item}
                isActive={isItemActive(item)}
                isDragging={dragItemId === item.id}
                isDropTarget={dropTargetId === item.id}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            )
          })}
      </nav>

      {/* 右側: 通知ベル + ユーザーメニュー（固定、ドラッグ不可） */}
      <div className="ml-4 flex shrink-0 items-center gap-3">
        {/* 通知ベル（カウントバッジ付き） */}
        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600 hover:shadow-sm"
          title="通知"
        >
          <Bell className="h-5 w-5" strokeWidth={1.75} />
          {/* 通知カウントバッジ */}
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
            2
          </span>
        </button>

        {/* 区切り線 */}
        <div className="h-6 w-px bg-slate-200" />

        {/* ユーザードロップダウン */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-50"
          >
            {/* ユーザーアバター */}
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              {displayName.charAt(0)}
            </div>
            <span className="text-slate-700 font-medium text-sm">
              {displayName}
            </span>
            <span className={cn(
              'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide',
              ROLE_BADGE_COLORS[displayRole]
            )}>
              {roleLabel}
            </span>
            <ChevronDown
              className={cn(
                'h-3 w-3 text-slate-400 transition-transform',
                userMenuOpen && 'rotate-180'
              )}
            />
          </button>

          {/* ユーザードロップダウンメニュー */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-slate-200/80 bg-white py-1 shadow-xl shadow-slate-200/50 dropdown-enter">
              {/* ユーザー情報 */}
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-medium text-slate-700 truncate">
                  {displayName}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {currentUser?.department ?? '総務部'} / {roleLabel}
                </p>
              </div>

              {/* ロール切替セクション */}
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <UserCog className="h-3.5 w-3.5" />
                  ロール切替
                </p>
                <div className="flex flex-col gap-1">
                  {(Object.entries(USER_ROLE_TYPE_LABELS) as [UserRoleType, string][]).map(([role, label]) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleChange(role)}
                      className={cn(
                        'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                        displayRole === role
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      <span>{label}</span>
                      {displayRole === role && (
                        <span className="text-[10px] rounded bg-blue-100 px-1.5 py-0.5 text-blue-600">
                          現在
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ログアウト */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
    </>
  )
}
