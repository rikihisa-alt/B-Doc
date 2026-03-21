'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FileText,
  LayoutDashboard,
  FileStack,
  CheckSquare,
  ClipboardList,
  Settings,
  ScrollText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ロールに基づくメニュー表示制御
const MENU_ITEMS = [
  {
    label: 'ダッシュボード',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['system_admin', 'doc_controller', 'template_manager', 'creator', 'confirmer', 'approver', 'issuer', 'viewer', 'audit_viewer'],
  },
  {
    label: '文書管理',
    href: '/dashboard/documents',
    icon: FileText,
    roles: ['system_admin', 'doc_controller', 'creator', 'confirmer', 'approver', 'issuer', 'viewer'],
  },
  {
    label: 'テンプレート',
    href: '/dashboard/templates',
    icon: FileStack,
    roles: ['system_admin', 'template_manager'],
  },
  {
    label: '承認',
    href: '/dashboard/approvals',
    icon: CheckSquare,
    roles: ['system_admin', 'doc_controller', 'confirmer', 'approver'],
  },
  {
    label: '監査ログ',
    href: '/dashboard/audit-logs',
    icon: ClipboardList,
    roles: ['system_admin', 'audit_viewer'],
  },
  {
    label: '設定',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['system_admin'],
  },
]

interface SidebarProps {
  userRole: string
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()

  // ロールに基づいてメニューをフィルタリング
  const visibleItems = MENU_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  )

  return (
    <aside className="flex w-64 flex-col border-r bg-white">
      {/* ロゴ */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <ScrollText className="h-6 w-6 text-blue-600" />
        <span className="text-lg font-bold text-gray-900">B-Doc</span>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 space-y-1 p-4">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* バージョン情報 */}
      <div className="border-t p-4">
        <p className="text-xs text-gray-400">B-Doc v1.0.0</p>
      </div>
    </aside>
  )
}
