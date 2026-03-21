import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

/**
 * ダッシュボードレイアウト（Server Component）
 * - 左: コンパクトサイドバー（64px幅）
 * - 上: スリムヘッダー
 * - 中央: コンテンツエリア
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 未認証の場合はログイン画面へリダイレクト
  if (!user) {
    redirect('/login')
  }

  // ユーザープロフィール取得
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // プロフィールのロール（配列の先頭 or フォールバック）
  const userRole = profile?.role ?? profile?.roles?.[0] ?? 'viewer'
  const userRoles: string[] = profile?.roles ?? (profile?.role ? [profile.role] : ['viewer'])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* コンパクトアイコンサイドバー */}
      <Sidebar userRole={userRole} userRoles={userRoles} />

      {/* メインコンテンツエリア */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* スリムヘッダー */}
        <Header
          userName={profile?.display_name ?? user.email ?? ''}
          userRole={userRole}
        />

        {/* ページコンテンツ */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
