'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Shield,
  Download,
  AlertTriangle,
} from 'lucide-react'
import { getAuditLogs } from '@/lib/store'
import type { LocalAuditLog } from '@/lib/store'
import { AuditLogExpandableRow } from './audit-log-expandable-row'

// =============================================================================
// 監査ログビューア（Client Component - ストアベース版）
// =============================================================================

/** 操作種別の日本語ラベル */
const OPERATION_LABELS: Record<string, string> = {
  create: '作成', update: '更新', delete: '削除',
  status_change: 'ステータス変更', approve: '承認', reject: '却下',
  return: '差戻し', issue: '発行', send: '送付', cancel: '取消',
  download: 'ダウンロード', view: '閲覧', login: 'ログイン', logout: 'ログアウト',
}

/** 対象種別の日本語ラベル */
const TARGET_TYPE_LABELS: Record<string, string> = {
  document: '文書', documents: '文書', templates: 'テンプレート',
  template_versions: 'テンプレートバージョン', workflow_definitions: 'ワークフロー',
  user_profiles: 'ユーザー', organizations: '組織', approval_records: '承認レコード',
}

const PAGE_SIZE = 25

export default function AuditLogsPage() {
  const [allLogs, setAllLogs] = useState<LocalAuditLog[]>([])
  const [loaded, setLoaded] = useState(false)

  // フィルタ状態
  const [filterOperation, setFilterOperation] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  // ページネーション
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setAllLogs(getAuditLogs())
    setLoaded(true)
  }, [])

  // フィルタ適用
  const filteredLogs = useMemo(() => {
    let logs = [...allLogs]

    if (filterOperation) {
      logs = logs.filter((l) => l.operation === filterOperation)
    }
    if (filterDateFrom) {
      logs = logs.filter((l) => l.executed_at >= filterDateFrom)
    }
    if (filterDateTo) {
      logs = logs.filter((l) => l.executed_at <= filterDateTo + 'T23:59:59Z')
    }

    // 新しい順
    logs.sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())

    return logs
  }, [allLogs, filterOperation, filterDateFrom, filterDateTo])

  const totalCount = filteredLogs.length
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const offset = (currentPage - 1) * PAGE_SIZE
  const pageLogs = filteredLogs.slice(offset, offset + PAGE_SIZE)

  // CSV エクスポート
  const handleCsvExport = useCallback(() => {
    const headers = ['日時', 'ユーザー', 'ロール', '操作', '対象種別', '対象ID', '対象ラベル', '成功', 'コメント']
    const rows = filteredLogs.map((log) => [
      log.executed_at,
      log.user_name,
      log.user_role,
      OPERATION_LABELS[log.operation] ?? log.operation,
      TARGET_TYPE_LABELS[log.target_type] ?? log.target_type,
      log.target_id,
      log.target_label,
      log.success ? '成功' : '失敗',
      log.comment ?? '',
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [filteredLogs])

  // 検索実行
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
  }

  // リセット
  const handleReset = () => {
    setFilterOperation('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setCurrentPage(1)
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">監査ログ</h1>
            <p className="text-sm text-slate-500">
              システムの全操作履歴を記録・閲覧
              <span className="ml-2 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">
                {totalCount.toLocaleString('ja-JP')}件
              </span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCsvExport}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow-md"
        >
          <Download className="h-4 w-4" />
          CSV エクスポート
        </button>
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
          <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
            {/* 操作種別 */}
            <div className="min-w-[140px]">
              <label htmlFor="operation" className="mb-1 block text-xs font-semibold text-slate-500">
                操作
              </label>
              <select
                id="operation"
                value={filterOperation}
                onChange={(e) => setFilterOperation(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              >
                <option value="">すべて</option>
                {Object.entries(OPERATION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* 日付範囲 */}
            <div>
              <label htmlFor="date_from" className="mb-1 block text-xs font-semibold text-slate-500">
                開始日
              </label>
              <input
                id="date_from"
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              />
            </div>
            <div>
              <label htmlFor="date_to" className="mb-1 block text-xs font-semibold text-slate-500">
                終了日
              </label>
              <input
                id="date_to"
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              />
            </div>

            <Button type="submit" size="sm" className="h-9">検索</Button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              リセット
            </button>
          </form>
        </CardContent>
      </Card>

      {/* ログテーブル */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            ログ一覧
            <span className="text-sm font-normal text-slate-500">
              ({totalCount.toLocaleString('ja-JP')}件)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pageLogs.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">日時</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">ユーザー</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">操作</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">対象</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">結果</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{/* 展開ボタン */}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageLogs.map((log) => (
                      <AuditLogExpandableRow
                        key={log.id}
                        log={{
                          id: log.id,
                          createdAt: log.executed_at,
                          userName: log.user_name,
                          operation: OPERATION_LABELS[log.operation] ?? log.operation,
                          targetType: TARGET_TYPE_LABELS[log.target_type] ?? log.target_type,
                          targetId: log.target_id,
                          isSuccess: log.success,
                          oldValues: log.before_value,
                          newValues: log.after_value,
                          ipAddress: null,
                          userAgent: null,
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3">
                  <span className="text-xs text-slate-500">
                    {totalCount.toLocaleString('ja-JP')}件中{' '}
                    {offset + 1}-{Math.min(offset + PAGE_SIZE, totalCount)}件を表示
                  </span>
                  <div className="flex items-center gap-2">
                    {currentPage > 1 && (
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => p - 1)}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        前へ
                      </button>
                    )}
                    <span className="text-xs text-slate-500">
                      {currentPage} / {totalPages}
                    </span>
                    {currentPage < totalPages && (
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => p + 1)}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        次へ
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Shield className="mb-3 h-10 w-10 text-slate-200" />
              <p className="text-sm text-slate-500">該当する監査ログはありません</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
