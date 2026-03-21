// TODO: Supabase接続後にDBからデータ取得に切り替え
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
import { AuditLogExpandableRow } from './audit-log-expandable-row'

// =============================================================================
// 監査ログビューア（デモデータ版）
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

// ---------- デモデータ ----------
const demoLogs = [
  {
    id: 'log-001',
    operation: 'create',
    target_table: 'documents',
    target_id: 'doc-001',
    performed_by: 'user-001',
    old_values: null,
    new_values: { status: 'draft', title: '在職証明書（田中 太郎）' },
    ip_address: '192.168.1.10',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    created_at: '2024-12-20T09:00:00Z',
    user_profiles: { display_name: '管理者 太郎', email: 'taro@example.com' },
  },
  {
    id: 'log-002',
    operation: 'status_change',
    target_table: 'documents',
    target_id: 'doc-001',
    performed_by: 'user-001',
    old_values: { status: 'draft' },
    new_values: { status: 'pending_confirm' },
    ip_address: '192.168.1.10',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    created_at: '2024-12-20T09:30:00Z',
    user_profiles: { display_name: '管理者 太郎', email: 'taro@example.com' },
  },
  {
    id: 'log-003',
    operation: 'approve',
    target_table: 'approval_records',
    target_id: 'apr-001',
    performed_by: 'user-002',
    old_values: null,
    new_values: { action: 'confirm', comment: '確認しました' },
    ip_address: '192.168.1.20',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    created_at: '2024-12-20T14:30:00Z',
    user_profiles: { display_name: '総務部 花子', email: 'hanako@example.com' },
  },
  {
    id: 'log-004',
    operation: 'update',
    target_table: 'templates',
    target_id: 'tpl-001',
    performed_by: 'user-001',
    old_values: { name: '在職証明書テンプレート v1' },
    new_values: { name: '在職証明書テンプレート v2' },
    ip_address: '192.168.1.10',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    created_at: '2024-12-19T16:00:00Z',
    user_profiles: { display_name: '管理者 太郎', email: 'taro@example.com' },
  },
  {
    id: 'log-005',
    operation: 'login',
    target_table: 'user_profiles',
    target_id: 'user-003',
    performed_by: 'user-003',
    old_values: null,
    new_values: { last_login_at: '2024-12-19T08:00:00Z' },
    ip_address: '10.0.0.5',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
    created_at: '2024-12-19T08:00:00Z',
    user_profiles: { display_name: '人事部 次郎', email: 'jiro@example.com' },
  },
  {
    id: 'log-006',
    operation: 'issue',
    target_table: 'documents',
    target_id: 'doc-005',
    performed_by: 'user-001',
    old_values: { status: 'approved' },
    new_values: { status: 'issued', issued_date: '2024-12-18T15:00:00Z' },
    ip_address: '192.168.1.10',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    created_at: '2024-12-18T15:00:00Z',
    user_profiles: { display_name: '管理者 太郎', email: 'taro@example.com' },
  },
  {
    id: 'log-007',
    operation: 'download',
    target_table: 'documents',
    target_id: 'doc-005',
    performed_by: 'user-002',
    old_values: null,
    new_values: { format: 'pdf' },
    ip_address: '192.168.1.20',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    created_at: '2024-12-18T15:30:00Z',
    user_profiles: { display_name: '総務部 花子', email: 'hanako@example.com' },
  },
  {
    id: 'log-008',
    operation: 'send',
    target_table: 'documents',
    target_id: 'doc-005',
    performed_by: 'user-001',
    old_values: { status: 'issued' },
    new_values: { status: 'sent', delivery_method: 'email' },
    ip_address: '192.168.1.10',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    created_at: '2024-12-18T16:00:00Z',
    user_profiles: { display_name: '管理者 太郎', email: 'taro@example.com' },
  },
]

const demoOrgUsers = [
  { id: 'user-001', display_name: '管理者 太郎', email: 'taro@example.com' },
  { id: 'user-002', display_name: '総務部 花子', email: 'hanako@example.com' },
  { id: 'user-003', display_name: '人事部 次郎', email: 'jiro@example.com' },
]

export default function AuditLogsPage({
  searchParams: _searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params: SearchParams = {}
  const logs = demoLogs
  const orgUsers = demoOrgUsers
  const count = logs.length
  const currentPage = 1
  const pageSize = 25
  const offset = 0
  const totalPages = 1

  // CSVエクスポートURL構築
  const exportParams = new URLSearchParams()
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
