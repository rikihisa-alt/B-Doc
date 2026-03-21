import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Shield,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { AUDIT_OPERATIONS } from '@/types'
import { AuditLogExpandableRow } from './audit-log-expandable-row'

// =============================================================================
// 監査ログビューア（Server Component）
// S-M11 仕様準拠:
// - 警告バナー: "このログは改ざん不能です"
// - フィルター: 操作種別、ユーザー、対象種別、日付範囲、成功/失敗
// - テーブル: 日時、ユーザー、操作、対象、成功(check/x)
// - 行クリック → 展開: before/after JSON, IP, User Agent
// - CSV エクスポートボタン
// =============================================================================

/** 操作種別の日本語ラベル */
const OPERATION_LABELS: Record<string, string> = {
  create: '作成',
  update: '更新',
  delete: '削除',
  status_change: 'ステータス変更',
  approve: '承認',
  reject: '却下',
  return: '差戻し',
  issue: '発行',
  send: '送付',
  cancel: '取消',
  download: 'ダウンロード',
  view: '閲覧',
  login: 'ログイン',
  logout: 'ログアウト',
}

/** 対象種別の日本語ラベル */
const TARGET_TYPE_LABELS: Record<string, string> = {
  documents: '文書',
  templates: 'テンプレート',
  template_versions: 'テンプレートバージョン',
  workflow_definitions: 'ワークフロー',
  user_profiles: 'ユーザー',
  organizations: '組織',
  approval_records: '承認レコード',
}

interface SearchParams {
  operation?: string
  user_id?: string
  target_table?: string
  date_from?: string
  date_to?: string
  success?: string
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

  // ユーザーの権限を確認（system_admin, audit_viewer のみアクセス可能）
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('roles, organization_id')
    .eq('id', user.id)
    .single()

  const userRoles: string[] = profile?.roles ?? []
  const hasAccess =
    userRoles.includes('system_admin') || userRoles.includes('audit_viewer')

  if (!hasAccess) {
    redirect('/dashboard')
  }

  const params = await searchParams
  const currentPage = parseInt(params.page ?? '1', 10)
  const pageSize = 25
  const offset = (currentPage - 1) * pageSize

  // 監査ログのクエリ構築
  let query = supabase
    .from('audit_logs')
    .select(
      `
      id,
      operation,
      target_table,
      target_id,
      performed_by,
      old_values,
      new_values,
      ip_address,
      user_agent,
      created_at,
      user_profiles!audit_logs_performed_by_fkey (
        display_name,
        email
      )
    `,
      { count: 'exact' }
    )
    .eq('organization_id', profile!.organization_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  // フィルター適用
  if (params.operation) {
    query = query.eq('operation', params.operation)
  }
  if (params.user_id) {
    query = query.eq('performed_by', params.user_id)
  }
  if (params.target_table) {
    query = query.eq('target_table', params.target_table)
  }
  if (params.date_from) {
    query = query.gte('created_at', params.date_from)
  }
  if (params.date_to) {
    query = query.lte('created_at', `${params.date_to}T23:59:59`)
  }

  const { data: logs, count, error } = await query
  const totalPages = Math.ceil((count ?? 0) / pageSize)

  // 組織内のユーザー一覧（フィルター用）
  const { data: orgUsers } = await supabase
    .from('user_profiles')
    .select('id, display_name, email')
    .eq('organization_id', profile!.organization_id)
    .order('display_name')

  // CSVエクスポートURL構築
  const exportParams = new URLSearchParams()
  if (params.operation) exportParams.set('operation', params.operation)
  if (params.user_id) exportParams.set('user_id', params.user_id)
  if (params.target_table) exportParams.set('target_table', params.target_table)
  if (params.date_from) exportParams.set('date_from', params.date_from)
  if (params.date_to) exportParams.set('date_to', params.date_to)
  const exportUrl = `/api/audit-logs/export?${exportParams.toString()}`

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">監査ログ</h1>
            <p className="text-sm text-slate-500">
              システムの全操作履歴を記録・閲覧
            </p>
          </div>
        </div>
        <a
          href={exportUrl}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          CSV エクスポート
        </a>
      </div>

      {/* 改ざん不能警告バナー */}
      <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-sm font-medium text-amber-800">
          このログは改ざん不能です。すべての操作は自動的に記録され、削除・変更はできません。
        </p>
      </div>

      {/* フィルターパネル */}
      <Card>
        <CardContent className="p-4">
          <form method="get" className="flex flex-wrap items-end gap-4">
            {/* 操作種別 */}
            <div className="min-w-[140px]">
              <label
                htmlFor="operation"
                className="mb-1 block text-xs font-semibold text-slate-500"
              >
                操作
              </label>
              <select
                id="operation"
                name="operation"
                defaultValue={params.operation ?? ''}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              >
                <option value="">すべて</option>
                {Object.entries(OPERATION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* ユーザー */}
            <div className="min-w-[180px]">
              <label
                htmlFor="user_id"
                className="mb-1 block text-xs font-semibold text-slate-500"
              >
                ユーザー
              </label>
              <select
                id="user_id"
                name="user_id"
                defaultValue={params.user_id ?? ''}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              >
                <option value="">すべて</option>
                {(orgUsers ?? []).map(
                  (u: { id: string; display_name: string; email: string }) => (
                    <option key={u.id} value={u.id}>
                      {u.display_name ?? u.email}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* 対象種別 */}
            <div className="min-w-[140px]">
              <label
                htmlFor="target_table"
                className="mb-1 block text-xs font-semibold text-slate-500"
              >
                対象種別
              </label>
              <select
                id="target_table"
                name="target_table"
                defaultValue={params.target_table ?? ''}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              >
                <option value="">すべて</option>
                {Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* 日付範囲 */}
            <div>
              <label
                htmlFor="date_from"
                className="mb-1 block text-xs font-semibold text-slate-500"
              >
                開始日
              </label>
              <input
                id="date_from"
                name="date_from"
                type="date"
                defaultValue={params.date_from ?? ''}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              />
            </div>
            <div>
              <label
                htmlFor="date_to"
                className="mb-1 block text-xs font-semibold text-slate-500"
              >
                終了日
              </label>
              <input
                id="date_to"
                name="date_to"
                type="date"
                defaultValue={params.date_to ?? ''}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              />
            </div>

            {/* 検索ボタン */}
            <Button type="submit" size="sm" className="h-9">
              検索
            </Button>
            <Link
              href="/dashboard/audit-logs"
              className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              リセット
            </Link>
          </form>
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-red-700">
              データの取得に失敗しました: {error.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ログテーブル */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            ログ一覧
            {count !== null && (
              <span className="text-sm font-normal text-slate-500">
                ({count.toLocaleString('ja-JP')}件)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs && logs.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        日時
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        ユーザー
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        操作
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        対象
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                        結果
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {/* 展開ボタン */}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log: Record<string, unknown>) => {
                      const logUser = log.user_profiles as Record<
                        string,
                        unknown
                      > | null

                      // 成功判定: new_values に error がなければ成功
                      const isSuccess = !(
                        log.new_values as Record<string, unknown>
                      )?.error

                      return (
                        <AuditLogExpandableRow
                          key={log.id as string}
                          log={{
                            id: log.id as string,
                            createdAt: log.created_at as string,
                            userName:
                              (logUser?.display_name as string) ??
                              (logUser?.email as string) ??
                              (log.performed_by as string)?.slice(0, 8),
                            operation:
                              OPERATION_LABELS[log.operation as string] ??
                              (log.operation as string),
                            targetType:
                              TARGET_TYPE_LABELS[
                                log.target_table as string
                              ] ?? (log.target_table as string),
                            targetId: log.target_id as string,
                            isSuccess,
                            oldValues: log.old_values as Record<
                              string,
                              unknown
                            > | null,
                            newValues: log.new_values as Record<
                              string,
                              unknown
                            > | null,
                            ipAddress: (log.ip_address as string) ?? null,
                            userAgent: (log.user_agent as string) ?? null,
                          }}
                        />
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3">
                  <span className="text-xs text-slate-500">
                    {count?.toLocaleString('ja-JP')}件中{' '}
                    {offset + 1}-{Math.min(offset + pageSize, count ?? 0)}件を表示
                  </span>
                  <div className="flex items-center gap-2">
                    {currentPage > 1 && (
                      <Link
                        href={`/dashboard/audit-logs?${new URLSearchParams({
                          ...params,
                          page: String(currentPage - 1),
                        } as Record<string, string>).toString()}`}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        前へ
                      </Link>
                    )}
                    <span className="text-xs text-slate-500">
                      {currentPage} / {totalPages}
                    </span>
                    {currentPage < totalPages && (
                      <Link
                        href={`/dashboard/audit-logs?${new URLSearchParams({
                          ...params,
                          page: String(currentPage + 1),
                        } as Record<string, string>).toString()}`}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        次へ
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Shield className="mb-3 h-10 w-10 text-slate-200" />
              <p className="text-sm text-slate-500">
                該当する監査ログはありません
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
