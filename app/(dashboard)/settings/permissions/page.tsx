'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  Shield,
  ChevronLeft,
  Loader2,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { USER_ROLE_LABELS } from '@/types'

// =============================================================================
// 権限管理ページ（Client Component）
// - ユーザー一覧とロール割り当て
// - ロール説明
// =============================================================================

/** ロール定義と説明 */
const ROLE_DESCRIPTIONS: Record<
  string,
  { label: string; description: string; color: string }
> = {
  system_admin: {
    label: 'システム管理者',
    description:
      'システム全体の管理権限。ユーザー管理、組織設定、全機能へのアクセス。',
    color: 'bg-red-50 text-red-700 border-red-200',
  },
  doc_controller: {
    label: '文書管理者',
    description:
      '文書の管理・発行・送付を担当。文書のライフサイクル全体を管理。',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  template_manager: {
    label: 'テンプレート管理者',
    description: 'テンプレートの作成・編集・公開を担当。',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  creator: {
    label: '作成者',
    description: '文書の作成・編集・提出が可能。自分が作成した文書を管理。',
    color: 'bg-green-50 text-green-700 border-green-200',
  },
  confirmer: {
    label: '確認者',
    description: '文書の内容確認を担当。確認ステップでの処理が可能。',
    color: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  approver: {
    label: '承認者',
    description: '文書の承認・差戻しを担当。承認ステップでの処理が可能。',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  issuer: {
    label: '発行者',
    description: '承認済み文書の発行処理を担当。',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  viewer: {
    label: '閲覧者',
    description: '発行済み文書の閲覧のみ可能。',
    color: 'bg-gray-50 text-gray-700 border-gray-200',
  },
  audit_viewer: {
    label: '監査閲覧者',
    description: '監査ログの閲覧が可能。',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
}

/** ユーザー情報の型 */
interface UserInfo {
  id: string
  display_name: string
  email: string
  roles: string[]
  department: string | null
  position: string | null
  is_active: boolean
}

export default function PermissionsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [users, setUsers] = useState<UserInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ユーザー一覧を読み込み
  useEffect(() => {
    async function loadUsers() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        // 現在のユーザーの組織IDを取得
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (!profile) return

        // 組織内のユーザー一覧を取得
        const { data: orgUsers, error: fetchErr } = await supabase
          .from('user_profiles')
          .select(
            'id, display_name, email, roles, department, position, is_active'
          )
          .eq('organization_id', profile.organization_id)
          .order('display_name')

        if (fetchErr) throw fetchErr
        setUsers((orgUsers as UserInfo[]) ?? [])
      } catch {
        setError('ユーザーデータの読み込みに失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [supabase])

  /** ロールのトグル（削除） */
  const removeRole = async (userId: string, role: string) => {
    setSavingUserId(userId)
    setError(null)

    const targetUser = users.find((u) => u.id === userId)
    if (!targetUser) return

    const newRoles = (targetUser.roles ?? []).filter((r) => r !== role)

    try {
      const { error: updateErr } = await supabase
        .from('user_profiles')
        .update({ roles: newRoles })
        .eq('id', userId)

      if (updateErr) throw updateErr

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, roles: newRoles } : u))
      )
    } catch {
      setError('ロールの更新に失敗しました')
    } finally {
      setSavingUserId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/settings')}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          設定に戻る
        </Button>
        <div className="h-6 w-px bg-slate-200" />
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Users className="h-6 w-6 text-indigo-600" />
            権限管理
          </h1>
          <p className="text-sm text-slate-500">
            ユーザーへのロール割り当てを管理します
          </p>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* ユーザー一覧テーブル */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            ユーザー一覧
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({users.length}名)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    ユーザー
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    部署
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    ロール
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    状態
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-slate-900">
                        {u.display_name || u.email}
                      </p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {u.department ?? '--'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(u.roles ?? []).map((role) => (
                          <Badge
                            key={role}
                            className={`cursor-pointer text-[10px] ${
                              ROLE_DESCRIPTIONS[role]?.color ??
                              'bg-gray-50 text-gray-700'
                            }`}
                            onClick={() => removeRole(u.id, role)}
                          >
                            {USER_ROLE_LABELS[role] ?? role}
                            {savingUserId === u.id ? (
                              <Loader2 className="ml-1 h-2.5 w-2.5 animate-spin" />
                            ) : (
                              <X className="ml-1 h-2.5 w-2.5 opacity-50 hover:opacity-100" />
                            )}
                          </Badge>
                        ))}
                        {(u.roles ?? []).length === 0 && (
                          <span className="text-xs text-slate-400">
                            ロール未割当
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {u.is_active ? (
                        <Badge className="border-green-200 bg-green-50 text-green-700 text-[10px]">
                          有効
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500 text-[10px]">
                          無効
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ロール説明 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-slate-600" />
            ロール定義
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(ROLE_DESCRIPTIONS).map(([key, info]) => (
              <div
                key={key}
                className="flex items-start gap-3 rounded-lg border border-slate-100 p-3"
              >
                <Badge className={`shrink-0 text-[10px] ${info.color}`}>
                  {info.label}
                </Badge>
                <p className="text-xs leading-relaxed text-slate-600">
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
