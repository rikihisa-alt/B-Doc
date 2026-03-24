import Link from 'next/link'
import { Building2, Users, Briefcase, Stamp, ChevronRight } from 'lucide-react'

/**
 * マスタ管理トップページ
 * 各マスタへのナビゲーション
 */

/** マスタ項目定義 */
const MASTER_ITEMS = [
  {
    icon: Building2,
    label: '会社・事業所',
    description: '会社情報・事業所の登録・管理',
    href: '/master/organizations',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    icon: Users,
    label: '従業員',
    description: '従業員情報の登録・管理',
    href: '/master/employees',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: Briefcase,
    label: '取引先',
    description: '取引先企業の登録・管理',
    href: '/master/clients',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Stamp,
    label: '印影',
    description: '電子印影の登録・管理',
    href: '/master/seals',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
  },
]

export default function MasterPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">マスタ管理</h1>
        <p className="mt-1 text-sm text-slate-500">各種マスタデータの登録・管理を行います</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {MASTER_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}>
              <item.icon className={`h-6 w-6 ${item.iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{item.label}</p>
              <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-500" />
          </Link>
        ))}
      </div>
    </div>
  )
}
