'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  Shield,
  ChevronLeft,
  Save,
  Check,
} from 'lucide-react'
import { USER_ROLE_LABELS } from '@/types'
import {
  getPermissions,
  savePermissions,
  getEmployees,
} from '@/lib/store'
import type { LocalPermission, LocalEmployee } from '@/lib/store'

// =============================================================================
// 権限管理ページ（localStorage駆動）
// - 従業員一覧に対してロールをトグルで割り当て
// =============================================================================

/** ロール定義と説明 */
const ROLE_DEFINITIONS: {
  key: string
  label: string
  description: string
  color: string
}[] = [
  { key: 'system_admin', label: 'システム管理者', description: 'システム全体の管理権限。ユーザー管理、組織設定、全機能へのアクセス。', color: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'doc_controller', label: '文書管理者', description: '文書の管理・発行・送付を担当。文書のライフサイクル全体を管理。', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'template_manager', label: 'テンプレート管理者', description: 'テンプレートの作成・編集・公開を担当。', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'creator', label: '作成者', description: '文書の作成・編集・提出が可能。自分が作成した文書を管理。', color: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'confirmer', label: '確認者', description: '文書の内容確認を担当。確認ステップでの処理が可能。', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'approver', label: '承認者', description: '文書の承認・差戻しを担当。承認ステップでの処理が可能。', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'issuer', label: '発行者', description: '承認済み文書の発行処理を担当。', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { key: 'viewer', label: '閲覧者', description: '発行済み文書の閲覧のみ可能。', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  { key: 'audit_viewer', label: '監査閲覧者', description: '監査ログの閲覧が可能。', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
]

/** すべてのロールキー */
const ALL_ROLE_KEYS = ROLE_DEFINITIONS.map((r) => r.key)

export default function PermissionsPage() {
  const router = useRouter()

  // --- 状態 ---
  const [permissions, setPermissionsState] = useState<LocalPermission[]>([])
  const [employees, setEmployeesState] = useState<LocalEmployee[]>([])
  const [saved, setSaved] = useState(false)

  // --- 初期読み込み ---
  useEffect(() => {
    const emps = getEmployees()
    const perms = getPermissions()
    setEmployeesState(emps)

    // 従業員全員分のパーミッションを確保（まだ権限エントリがない従業員用）
    const merged = emps.map((emp) => {
      const existing = perms.find((p) => p.userId === emp.id)
      return existing ?? { userId: emp.id, userName: emp.name, roles: [] }
    })
    setPermissionsState(merged)
  }, [])

  // --- ロールのトグル ---
  const toggleRole = useCallback((userId: string, role: string) => {
    setPermissionsState((prev) =>
      prev.map((p) => {
        if (p.userId !== userId) return p
        const has = p.roles.includes(role)
        return {
          ...p,
          roles: has ? p.roles.filter((r) => r !== role) : [...p.roles, role],
        }
      })
    )
  }, [])

  // --- 保存 ---
  const handleSave = useCallback(() => {
    savePermissions(permissions)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [permissions])

  // --- ロール色を取得 ---
  const roleColor = (key: string): string => {
    return ROLE_DEFINITIONS.find((r) => r.key === key)?.color ?? 'bg-gray-50 text-gray-700 border-gray-200'
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/settings')}
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
        <Button size="sm" onClick={handleSave}>
          {saved ? (
            <>
              <Check className="mr-1.5 h-4 w-4" />
              保存しました
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-4 w-4" />
              保存
            </>
          )}
        </Button>
      </div>

      {/* ユーザー×ロール テーブル */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            ユーザー一覧
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({permissions.length}名)
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
                    ロール（クリックで切替）
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permissions.map((perm) => {
                  const emp = employees.find((e) => e.id === perm.userId)
                  return (
                    <tr key={perm.userId} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-slate-900">{perm.userName}</p>
                        <p className="text-xs text-slate-400">{emp?.email ?? ''}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {emp?.department ?? '--'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {ALL_ROLE_KEYS.map((roleKey) => {
                            const active = perm.roles.includes(roleKey)
                            return (
                              <button
                                key={roleKey}
                                type="button"
                                onClick={() => toggleRole(perm.userId, roleKey)}
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all ${
                                  active
                                    ? roleColor(roleKey)
                                    : 'border-slate-200 bg-white text-slate-300 hover:border-slate-300 hover:text-slate-400'
                                }`}
                              >
                                {USER_ROLE_LABELS[roleKey] ?? roleKey}
                              </button>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  )
                })}
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
            {ROLE_DEFINITIONS.map((info) => (
              <div
                key={info.key}
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
