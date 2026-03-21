import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

/**
 * ダッシュボードレイアウト（Server Component）
 * TODO: Supabase接続後に認証チェックを復活させる
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 認証バイパス中: デモ用のダミーデータ
  const userRole = 'system_admin'
  const userRoles = ['system_admin']

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar userRole={userRole} userRoles={userRoles} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userName="デモユーザー"
          userRole={userRole}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
