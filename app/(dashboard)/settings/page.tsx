// TODO: Supabase接続後にDBからデータ取得に切り替え
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Settings,
  User,
  Building2,
  GitBranch,
  Shield,
  Users,
  Mail,
  Bell,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { USER_ROLE_LABELS } from '@/types'

// =============================================================================
// 設定ページ（デモデータ版）
// =============================================================================

// ---------- デモデータ ----------
const demoProfile = {
  display_name: '管理者 太郎',
  email: 'taro@backlly.example.com',
  department: '人事部',
  position: '主任',
  roles: ['system_admin', 'document_issuer'],
  last_login_at: '2024-12-20T09:00:00Z',
}

const demoOrganization = {
  name: '株式会社Backlly',
  slug: 'backlly',
  plan: 'business',
  created_at: '2024-01-15T00:00:00Z',
}

const demoUserId = 'demo-user-001'

export default function SettingsPage() {
  const profile = demoProfile
  const organization = demoOrganization
  const userRoles: string[] = profile?.roles ?? []
  const isAdmin = userRoles.includes('system_admin')

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Settings className="h-6 w-6 text-slate-600" />
          設定
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          アカウントと組織の設定を管理します
        </p>
      </div>

      {/* ユーザープロフィールセクション */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-blue-600" />
            ユーザープロフィール
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* 表示名 */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                氏名
              </p>
              <p className="mt-1.5 text-sm font-medium text-slate-900">
                {profile?.display_name ?? '未設定'}
              </p>
            </div>

            {/* メールアドレス */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                メールアドレス
              </p>
              <p className="mt-1.5 text-sm text-slate-900">
                {profile?.email ?? '未設定'}
              </p>
            </div>

            {/* 部署 */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                部署
              </p>
              <p className="mt-1.5 text-sm text-slate-900">
                {profile?.department ?? '--'}
              </p>
            </div>

            {/* 役職 */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                役職
              </p>
              <p className="mt-1.5 text-sm text-slate-900">
                {profile?.position ?? '--'}
              </p>
            </div>

            {/* ロール */}
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                割り当てロール
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {userRoles.length > 0 ? (
                  userRoles.map((role: string) => (
                    <Badge
                      key={role}
                      variant="secondary"
                      className="text-xs"
                    >
                      {USER_ROLE_LABELS[role] ?? role}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="text-xs text-slate-400">
                    閲覧者
                  </Badge>
                )}
              </div>
            </div>

            {/* 最終ログイン */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                最終ログイン
              </p>
              <p className="mt-1.5 text-sm text-slate-500">
                {profile?.last_login_at
                  ? new Date(profile.last_login_at).toLocaleString('ja-JP')
                  : '--'}
              </p>
            </div>

            {/* ユーザーID */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                ユーザーID
              </p>
              <code className="mt-1.5 block rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">
                {demoUserId}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 組織設定（管理者のみ） */}
      {isAdmin && organization && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-purple-600" />
              組織設定
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  組織名
                </p>
                <p className="mt-1.5 text-sm font-medium text-slate-900">
                  {(organization.name as string) ?? '未設定'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  スラッグ
                </p>
                <code className="mt-1.5 block rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">
                  {(organization.slug as string) ?? '未設定'}
                </code>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  プラン
                </p>
                <Badge className="mt-1.5 bg-blue-50 text-blue-700 border-blue-200">
                  {(organization.plan as string) ?? 'free'}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  作成日
                </p>
                <p className="mt-1.5 text-sm text-slate-500">
                  {organization.created_at
                    ? new Date(
                        organization.created_at as string
                      ).toLocaleDateString('ja-JP')
                    : '--'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* クイックリンク */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          各種設定
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {/* 権限管理 */}
          {isAdmin && (
            <Link
              href="/dashboard/settings/permissions"
              className="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-slate-900">権限管理</h3>
                <p className="text-xs text-slate-500">
                  ユーザーとロールの管理
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1" />
            </Link>
          )}

          {/* ワークフロー設定 */}
          {isAdmin && (
            <Link
              href="/dashboard/settings/workflows"
              className="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                <GitBranch className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-slate-900">
                  ワークフロー設定
                </h3>
                <p className="text-xs text-slate-500">
                  承認フローの作成・編集
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1" />
            </Link>
          )}

          {/* 監査ログ */}
          {(isAdmin || userRoles.includes('audit_viewer')) && (
            <Link
              href="/dashboard/audit-logs"
              className="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-slate-900">監査ログ</h3>
                <p className="text-xs text-slate-500">
                  操作履歴の確認・出力
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1" />
            </Link>
          )}

          {/* 通知設定 */}
          <Link
            href="/dashboard/settings"
            className="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <Bell className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-slate-900">通知設定</h3>
              <p className="text-xs text-slate-500">
                メール・Slack通知の管理
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  )
}
