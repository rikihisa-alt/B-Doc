import Link from 'next/link'
import { Building2, Users, Briefcase, Stamp } from 'lucide-react'

/**
 * マスタ管理トップページ
 * 各マスタへのナビゲーション
 */
const MASTER_ITEMS = [
  {
    icon: Building2,
    label: '会社・事業所',
    description: '会社情報・事業所の登録・管理',
    href: '/dashboard/master/organizations',
  },
  {
    icon: Users,
    label: '従業員',
    description: '従業員情報の登録・管理',
    href: '/dashboard/master/employees',
  },
  {
    icon: Briefcase,
    label: '取引先',
    description: '取引先企業の登録・管理',
    href: '/dashboard/master/clients',
  },
  {
    icon: Stamp,
    label: '印影',
    description: '電子印影の登録・管理',
    href: '/dashboard/master/seals',
  },
]

export default function MasterPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-slate-900">マスタ管理</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MASTER_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <item.icon className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{item.label}</p>
              <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
