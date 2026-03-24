import { TopNavbar } from '@/components/layout/top-navbar'

/**
 * ダッシュボードレイアウト（Server Component）
 * トップナビゲーションバー + フルワイドコンテンツ
 * ユーザー情報はTopNavbar内部でストアから読み取る
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <TopNavbar />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
