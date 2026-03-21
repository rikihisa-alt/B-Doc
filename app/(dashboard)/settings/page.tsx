import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings, User, Building2, GitBranch, Shield } from 'lucide-react'
import Link from 'next/link'

/** 役割の日本語ラベルと説明 */
const ROLE_INFO: Record<
  string,
  { label: string; description: string; color: string }
> = {
  admin: {
    label: '管理者',
    description:
      'システム全体の管理権限を持ちます。ユーザー管理、ワークフロー設定、監査ログの閲覧が可能です。',
    color: 'bg-red-50 text-red-700 border-red-200',
  },
  manager: {
    label: 'マネージャー',
    description:
      '文書の承認・却下が可能です。ワークフローの承認者として設定できます。監査ログの閲覧も可能です。',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  editor: {
    label: '編集者',
    description:
      '文書の作成・編集・提出が可能です。自分が作成した文書の管理ができます。',
    color: 'bg-green-50 text-green-700 border-green-200',
  },
  viewer: {
    label: '閲覧者',
    description:
      '公開済みの文書を閲覧できます。文書の作成や編集はできません。',
    color: 'bg-gray-50 text-gray-700 border-gray-200',
  },
}

export default async function SettingsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // プロフィールと組織情報を取得
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, organizations(*)')
    .eq('id', user.id)
    .single()

  const organization = profile?.organizations as Record<string, unknown> | null
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <Settings className="h-6 w-6 text-gray-600" />
        設定
      </h1>

      {/* ユーザープロフィール */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-blue-600" />
            ユーザー情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-gray-500">氏名</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {profile?.full_name ?? '未設定'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">
                メールアドレス
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {profile?.email ?? user.email ?? '未設定'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">役割</p>
              <div className="mt-1">
                <Badge
                  className={
                    ROLE_INFO[profile?.role ?? 'viewer']?.color ?? ''
                  }
                >
                  {ROLE_INFO[profile?.role ?? 'viewer']?.label ??
                    profile?.role}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">ユーザーID</p>
              <p className="mt-1">
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  {user.id}
                </code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 組織設定（管理者のみ表示） */}
      {isAdmin && organization && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-purple-600" />
              組織設定
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-gray-500">組織名</p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {(organization.name as string) ?? '未設定'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">
                  スラッグ
                </p>
                <p className="mt-1">
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                    {(organization.slug as string) ?? '未設定'}
                  </code>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">組織ID</p>
                <p className="mt-1">
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                    {organization.id as string}
                  </code>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">作成日</p>
                <p className="mt-1 text-sm text-gray-700">
                  {organization.created_at
                    ? new Date(
                        organization.created_at as string
                      ).toLocaleDateString('ja-JP')
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* クイックリンク */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* ワークフロー設定 */}
        {isAdmin && (
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50">
                <GitBranch className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">
                  ワークフロー設定
                </h3>
                <p className="text-sm text-gray-500">
                  承認フローの作成・編集
                </p>
              </div>
              <Link
                href="/dashboard/workflows"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                管理
              </Link>
            </CardContent>
          </Card>
        )}

        {/* 監査ログ */}
        {['admin', 'manager'].includes(profile?.role ?? '') && (
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">監査ログ</h3>
                <p className="text-sm text-gray-500">
                  操作履歴の確認・出力
                </p>
              </div>
              <Link
                href="/audit-logs"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                表示
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 役割説明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">役割一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(ROLE_INFO).map(([key, info]) => (
              <div
                key={key}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <Badge className={info.color}>{info.label}</Badge>
                <p className="flex-1 text-sm text-gray-600">
                  {info.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
