'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, ChevronRight, ChevronDown } from 'lucide-react'

// =============================================================================
// 監査ログの展開可能な行コンポーネント（Client Component）
// 行クリックで before/after JSON、IP、User Agent を表示
// =============================================================================

interface AuditLogRowData {
  /** ログID */
  id: string
  /** 作成日時 */
  createdAt: string
  /** ユーザー名 */
  userName: string
  /** 操作名（日本語） */
  operation: string
  /** 対象種別（日本語） */
  targetType: string
  /** 対象ID */
  targetId: string
  /** 成功フラグ */
  isSuccess: boolean
  /** 変更前の値 */
  oldValues: Record<string, unknown> | null
  /** 変更後の値 */
  newValues: Record<string, unknown> | null
  /** IPアドレス */
  ipAddress: string | null
  /** ユーザーエージェント */
  userAgent: string | null
}

interface AuditLogExpandableRowProps {
  log: AuditLogRowData
}

/** 操作種別の色マッピング */
const OPERATION_COLOR_MAP: Record<string, string> = {
  '作成': 'bg-green-100 text-green-700 border-green-200',
  '更新': 'bg-blue-100 text-blue-700 border-blue-200',
  '削除': 'bg-red-100 text-red-700 border-red-200',
  '承認': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '却下': 'bg-red-100 text-red-700 border-red-200',
  '差戻し': 'bg-amber-100 text-amber-700 border-amber-200',
  '発行': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'ダウンロード': 'bg-purple-100 text-purple-700 border-purple-200',
  'ログイン': 'bg-sky-100 text-sky-700 border-sky-200',
  'ログアウト': 'bg-slate-100 text-slate-600 border-slate-200',
  '文書作成': 'bg-green-100 text-green-700 border-green-200',
  'PDF生成': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  '承認申請': 'bg-amber-100 text-amber-700 border-amber-200',
  'ロール変更': 'bg-purple-100 text-purple-700 border-purple-200',
  'ステータス変更': 'bg-orange-100 text-orange-700 border-orange-200',
}

export function AuditLogExpandableRow({ log }: AuditLogExpandableRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const operationColor = OPERATION_COLOR_MAP[log.operation] ?? 'bg-slate-100 text-slate-600 border-slate-200'

  return (
    <>
      {/* メイン行 */}
      <tr
        className="cursor-pointer transition-colors duration-150 hover:bg-blue-50/40"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* 日時 */}
        <td className="px-6 py-3 text-sm text-slate-600">
          {new Date(log.createdAt).toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </td>

        {/* ユーザー */}
        <td className="px-4 py-3 text-sm font-medium text-slate-700">
          {log.userName}
        </td>

        {/* 操作（色分け） */}
        <td className="px-4 py-3">
          <Badge className={`text-xs border ${operationColor}`}>
            {log.operation}
          </Badge>
        </td>

        {/* 対象 */}
        <td className="px-4 py-3">
          <span className="text-sm text-slate-600">{log.targetType}</span>
          <code className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
            {log.targetId?.slice(0, 8)}...
          </code>
        </td>

        {/* 成功/失敗 */}
        <td className="px-4 py-3 text-center">
          {log.isSuccess ? (
            <CheckCircle2 className="mx-auto h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="mx-auto h-5 w-5 text-red-500" />
          )}
        </td>

        {/* 展開ボタン */}
        <td className="px-4 py-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </td>
      </tr>

      {/* 展開詳細パネル */}
      {isExpanded && (
        <tr className="animate-slide-down">
          <td colSpan={6} className="bg-gradient-to-b from-slate-50 to-white px-6 py-5 border-b-2 border-slate-200">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Before JSON */}
              <div>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  変更前 (Before)
                </h4>
                <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
                  {log.oldValues
                    ? JSON.stringify(log.oldValues, null, 2)
                    : '(なし)'}
                </pre>
              </div>

              {/* After JSON */}
              <div>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  変更後 (After)
                </h4>
                <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
                  {log.newValues
                    ? JSON.stringify(log.newValues, null, 2)
                    : '(なし)'}
                </pre>
              </div>
            </div>

            {/* メタ情報 */}
            <div className="mt-3 flex flex-wrap gap-6 text-xs text-slate-500">
              <div>
                <span className="font-semibold text-slate-600">IP:</span>{' '}
                <code className="rounded bg-white px-1.5 py-0.5 text-slate-500">
                  {log.ipAddress ?? '不明'}
                </code>
              </div>
              <div className="max-w-lg truncate">
                <span className="font-semibold text-slate-600">
                  User Agent:
                </span>{' '}
                <code className="rounded bg-white px-1.5 py-0.5 text-slate-500">
                  {log.userAgent ?? '不明'}
                </code>
              </div>
              <div>
                <span className="font-semibold text-slate-600">ログID:</span>{' '}
                <code className="rounded bg-white px-1.5 py-0.5 text-slate-500">
                  {log.id}
                </code>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
