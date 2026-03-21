'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  FileText,
  CheckSquare,
  Layout,
  Database,
  Send,
  Shield,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// =============================================================================
// ナビゲーション定義
// =============================================================================

interface NavItem {
  /** アイコンコンポーネント */
  icon: LucideIcon
  /** 表示ラベル（日本語） */
  label: string
  /** リンク先パス */
  href: string
  /** アクセス許可ロール（'all' は全ロール許可） */
  roles: string[]
  /** バッジ表示フラグ（承認待ち件数等） */
  badge?: boolean
}

/** サイドバーのナビゲーション項目定義 */
const NAV_ITEMS: NavItem[] = [
  {
    icon: Home,
    label: 'ダッシュボード',
    href: '/dashboard',
    roles: ['all'],
  },
  {
    icon: FileText,
    label: '文書一覧',
    href: '/dashboard/documents',
    roles: ['all'],
  },
  {
    icon: CheckSquare,
    label: '承認待ち',
    href: '/dashboard/approvals',
    roles: ['confirmer', 'approver', 'system_admin', 'doc_controller'],
    badge: true,
  },
  {
    icon: Layout,
    label: 'テンプレート',
    href: '/dashboard/templates',
    roles: ['template_manager', 'system_admin'],
  },
  {
    icon: Database,
    label: 'マスタ管理',
    href: '/dashboard/master',
    roles: ['system_admin'],
  },
  {
    icon: Send,
    label: '送付管理',
    href: '/dashboard/delivery',
    roles: ['issuer', 'system_admin'],
  },
  {
    icon: Shield,
    label: '監査ログ',
    href: '/dashboard/audit-logs',
    roles: ['audit_viewer', 'system_admin'],
  },
  {
    icon: Settings,
    label: '設定',
    href: '/dashboard/settings',
    roles: ['system_admin'],
  },
]

// =============================================================================
// コンポーネント
// =============================================================================

interface SidebarProps {
  /** ユーザーのプライマリロール */
  userRole: string
  /** ユーザーの全ロール配列 */
  userRoles?: string[]
}

/**
 * コンパクトアイコンサイドバー（64px幅）
 * - ダークテーマ（bg-slate-900）
 * - アイコン + 小さなラベルの縦並び
 * - アクティブ状態: 左側に青いボーダー
 * - ロールベースのメニューフィルタリング
 */
export function Sidebar({ userRole, userRoles = [] }: SidebarProps) {
  const pathname = usePathname()

  // ロールに基づいてメニューをフィルタリング
  const allRoles = userRoles.length > 0 ? userRoles : [userRole]
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.roles.includes('all')) return true
    return item.roles.some((role) => allRoles.includes(role))
  })

  return (
    <aside className="flex w-16 flex-col bg-slate-900 border-r border-slate-800">
      {/* ロゴエリア */}
      <div className="flex h-12 items-center justify-center border-b border-slate-800">
        <span className="text-sm font-bold tracking-tight text-white">
          B
        </span>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 py-2">
        {visibleItems.map((item) => {
          // アクティブ判定: 完全一致またはサブパス
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                'group relative flex flex-col items-center justify-center px-1 py-2.5 transition-colors',
                isActive
                  ? 'bg-slate-800/80 text-blue-400'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              )}
            >
              {/* アクティブインジケータ（左側の青いボーダー） */}
              {isActive && (
                <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-blue-400" />
              )}

              {/* アイコン */}
              <item.icon className="h-4.5 w-4.5 shrink-0" strokeWidth={1.75} />

              {/* ラベル */}
              <span className="mt-0.5 text-[9px] leading-tight font-medium truncate w-full text-center">
                {item.label}
              </span>

              {/* ツールチップ（ホバー時表示） */}
              <div className="absolute left-full ml-2 hidden rounded bg-slate-800 px-2 py-1 text-xs text-white shadow-lg group-hover:block z-50 whitespace-nowrap">
                {item.label}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* バージョン情報 */}
      <div className="border-t border-slate-800 py-2 text-center">
        <span className="text-[8px] text-slate-600">v1.0</span>
      </div>
    </aside>
  )
}
