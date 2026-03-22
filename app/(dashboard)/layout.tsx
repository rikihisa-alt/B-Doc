import { TopNavbar } from '@/components/layout/top-navbar'

/**
 * ダッシュボードレイアウト（Server Component）
 * トップナビゲーションバー + フルワイドコンテンツ
 * TODO: Supabase接続後に認証チェックを復活させる
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <TopNavbar userName="デモユーザー" userRole="system_admin" />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
