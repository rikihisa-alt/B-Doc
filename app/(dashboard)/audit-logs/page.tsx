import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Download } from 'lucide-react'
import Link from 'next/link'

/** 操作ラベル */
const ACTION_LABELS: Record<string, string> = {
  create: '作成',
  update: '更新',
  delete: '削除',
  status_change: 'ステータス変更',
  approve: '承認',
  reject: '却下',
  return: '差戻し',
  publish: '公開',
  archive: 'アーカイブ',
  download: 'ダウンロード',
  view: '閲覧',
}

/** エンティティ種別ラベル */
const ENTITY_TYPE_LABELS: Record<string, string> = {
  document: '文書',
  template: 'テンプレート',
  workflow: 'ワークフロー',
  user: 'ユーザー',
  organization: '組織',
}

interface SearchParams {
  entity_type?: string
  action?: string
  user_id?: string
  date_from?: string
  date_to?: string
  page?: string
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザーの役割を確認（system_admin, audit_viewer のみアクセス可能）
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const params = await searchParams
  const currentPage = parseInt(params.page ?? '1', 10)
  const pageSize = 20
  const offset = (currentPage - 1) * pageSize

  // 監査ログのクエリ構築
  let query = supabase
    .from('audit_logs')
    .select(
      `
      id,
      action,
      entity_type,
      entity_id,
      user_id,
      metadata,
      ip_address,
      created_at,
      user_profiles (
        full_name,
        email
      )
    `,
      { count: 'exact' }
    )
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  // フィルタ適用
  if (params.entity_type) {
    query = query.eq('entity_type', params.entity_type)
  }
  if (params.action) {
    query = query.eq('action', params.action)
  }
  if (params.user_id) {
    query = query.eq('user_id', params.user_id)
  }
  if (params.date_from) {
    query = query.gte('created_at', params.date_from)
  }
  if (params.date_to) {
    query = query.lte('created_at', `${params.date_to}T23:59:59`)
  }

  const { data: logs, count, error } = await query

  const totalPages = Math.ceil((count ?? 0) / pageSize)

  // CSVエクスポート用URLの構築
  const exportParams = new URLSearchParams()
  if (params.entity_type) exportParams.set('entity_type', params.entity_type)
  if (params.action) exportParams.set('action', params.action)
  if (params.user_id) exportParams.set('user_id', params.user_id)
  if (params.date_from) exportParams.set('date_from', params.date_from)
  if (params.date_to) exportParams.set('date_to', params.date_to)
  const exportUrl = `/api/audit-logs/export?${exportParams.toString()}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Shield className="h-6 w-6 text-blue-600" />
          監査ログ
        </h1>
        <a
          href={exportUrl}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          CSV出力
        </a>
      </div>

      {/* フィルタ */}
      <Card>
        <CardContent className="p-4">
          <form method="get" className="flex flex-wrap items-end gap-4">
            <div>
              <label
                htmlFor="entity_type"
                className="mb-1 block text-xs font-medium text-gray-600"
              >
                対象種別
              </label>
              <select
                id="entity_type"
                name="entity_type"
                defaultValue={params.entity_type ?? ''}
                className="h-9 rounded-md border border-gray-300 px-3 text-sm"
              >
                <option value="">すべて</option>
                {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="action"
                className="mb-1 block text-xs font-medium text-gray-600"
              >
                操作
              </label>
              <select
                id="action"
                name="action"
                defaultValue={params.action ?? ''}
                className="h-9 rounded-md border border-gray-300 px-3 text-sm"
              >
                <option value="">すべて</option>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="date_from"
                className="mb-1 block text-xs font-medium text-gray-600"
              >
                開始日
              </label>
              <input
                id="date_from"
                name="date_from"
                type="date"
                defaultValue={params.date_from ?? ''}
                className="h-9 rounded-md border border-gray-300 px-3 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="date_to"
                className="mb-1 block text-xs font-medium text-gray-600"
              >
                終了日
              </label>
              <input
                id="date_to"
                name="date_to"
                type="date"
                defaultValue={params.date_to ?? ''}
                className="h-9 rounded-md border border-gray-300 px-3 text-sm"
              />
            </div>

            <button
              type="submit"
              className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              検索
            </button>

            <Link
              href="/audit-logs"
              className="h-9 rounded-md border border-gray-300 px-4 text-sm font-medium leading-9 text-gray-700 transition-colors hover:bg-gray-50"
            >
              リセット
            </Link>
          </form>
        </CardContent>
      </Card>

      {/* ログテーブル */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            ログ一覧
            {count !== null && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({count}件)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-red-500">
              データの取得に失敗しました: {error.message}
            </p>
          )}

          {logs && logs.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-3 pr-4 font-medium">日時</th>
                      <th className="pb-3 pr-4 font-medium">ユーザー</th>
                      <th className="pb-3 pr-4 font-medium">操作</th>
                      <th className="pb-3 pr-4 font-medium">対象種別</th>
                      <th className="pb-3 pr-4 font-medium">対象ID</th>
                      <th className="pb-3 font-medium">IPアドレス</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log: Record<string, unknown>) => {
                      const userProfile = log.user_profiles as Record<
                        string,
                        unknown
                      > | null

                      return (
                        <tr
                          key={log.id as string}
                          className="border-b last:border-0"
                        >
                          <td className="py-3 pr-4 text-gray-500">
                            {new Date(
                              log.created_at as string
                            ).toLocaleString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="py-3 pr-4 text-gray-700">
                            {(userProfile?.full_name as string) ??
                              (userProfile?.email as string) ??
                              (log.user_id as string)?.slice(0, 8)}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant="secondary">
                              {ACTION_LABELS[log.action as string] ??
                                (log.action as string)}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {ENTITY_TYPE_LABELS[
                              log.entity_type as string
                            ] ?? (log.entity_type as string)}
                          </td>
                          <td className="py-3 pr-4">
                            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                              {(log.entity_id as string)?.slice(0, 8)}...
                            </code>
                          </td>
                          <td className="py-3 text-gray-500">
                            {(log.ip_address as string) ?? '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  {currentPage > 1 && (
                    <Link
                      href={`/audit-logs?${new URLSearchParams({
                        ...params,
                        page: String(currentPage - 1),
                      }).toString()}`}
                      className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      前へ
                    </Link>
                  )}
                  <span className="text-sm text-gray-500">
                    {currentPage} / {totalPages} ページ
                  </span>
                  {currentPage < totalPages && (
                    <Link
                      href={`/audit-logs?${new URLSearchParams({
                        ...params,
                        page: String(currentPage + 1),
                      }).toString()}`}
                      className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      次へ
                    </Link>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">
              該当する監査ログはありません。
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
