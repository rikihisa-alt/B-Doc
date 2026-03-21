// TODO: Supabase接続後にDBからデータ取得に切り替え
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CheckSquare,
  AlertTriangle,
  Clock,
  ChevronRight,
} from 'lucide-react'
import { DOCUMENT_TYPE_LABELS } from '@/types'

// =============================================================================
// 承認一覧ページ（デモデータ版）
// =============================================================================

/** 期限の緊急度を判定するヘルパー */
function getDeadlineUrgency(deadlineStr: string | null): 'overdue' | 'urgent' | 'normal' {
  if (!deadlineStr) return 'normal'
  const now = new Date()
  const deadline = new Date(deadlineStr)
  if (deadline < now) return 'overdue'
  const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursRemaining <= 24) return 'urgent'
  return 'normal'
}

/** 期限の緊急度に応じた行スタイル */
function getUrgencyRowClass(urgency: 'overdue' | 'urgent' | 'normal'): string {
  switch (urgency) {
    case 'overdue':
      return 'bg-red-50 hover:bg-red-100'
    case 'urgent':
      return 'bg-amber-50 hover:bg-amber-100'
    default:
      return 'hover:bg-slate-50'
  }
}

/** 期限バッジの表示 */
function DeadlineBadge({ deadline }: { deadline: string | null }) {
  if (!deadline) {
    return <span className="text-xs text-slate-400">--</span>
  }

  const urgency = getDeadlineUrgency(deadline)
  const dateStr = new Date(deadline).toLocaleDateString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  switch (urgency) {
    case 'overdue':
      return (
        <Badge className="border-red-300 bg-red-100 text-red-800">
          <AlertTriangle className="mr-1 h-3 w-3" />
          期限超過
        </Badge>
      )
    case 'urgent':
      return (
        <Badge className="border-amber-300 bg-amber-100 text-amber-800">
          <Clock className="mr-1 h-3 w-3" />
          {dateStr}
        </Badge>
      )
    default:
      return <span className="text-xs text-slate-500">{dateStr}</span>
  }
}

// ---------- デモデータ ----------
const demoPendingApprovals = [
  {
    id: 'apr-001',
    document_id: 'doc-001',
    step_order: 2,
    created_at: '2024-12-18T09:00:00Z',
    documents: {
      id: 'doc-001',
      title: '在職証明書（田中 太郎）',
      document_number: 'DOC-2024-0001',
      status: 'pending_approval',
      expiry_date: null,
      created_at: '2024-12-15T10:00:00Z',
      templates: { document_type: 'employment_certificate' },
      user_profiles: { display_name: '総務部 花子', email: 'hanako@example.com', department: '総務部' },
    },
    workflow_steps: { name: '部長承認', deadline_hours: 72 },
  },
  {
    id: 'apr-002',
    document_id: 'doc-002',
    step_order: 1,
    created_at: '2024-12-19T14:00:00Z',
    documents: {
      id: 'doc-002',
      title: '給与証明書（鈴木 花子）',
      document_number: 'DOC-2024-0002',
      status: 'pending_confirm',
      expiry_date: '2024-12-20T23:59:59Z',
      created_at: '2024-12-19T10:00:00Z',
      templates: { document_type: 'salary_certificate' },
      user_profiles: { display_name: '人事部 次郎', email: 'jiro@example.com', department: '人事部' },
    },
    workflow_steps: { name: '確認', deadline_hours: 24 },
  },
  {
    id: 'apr-003',
    document_id: 'doc-003',
    step_order: 2,
    created_at: '2024-12-17T11:00:00Z',
    documents: {
      id: 'doc-003',
      title: '退職証明書（佐藤 健一）',
      document_number: 'DOC-2024-0003',
      status: 'pending_approval',
      expiry_date: null,
      created_at: '2024-12-16T08:30:00Z',
      templates: { document_type: 'retirement_certificate' },
      user_profiles: { display_name: '管理者 太郎', email: 'taro@example.com', department: '管理部' },
    },
    workflow_steps: { name: '最終承認', deadline_hours: 48 },
  },
]

export default function ApprovalsPage() {
  const pendingApprovals = demoPendingApprovals
  const pendingCount = pendingApprovals.length

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">承認一覧</h1>
          {pendingCount > 0 && (
            <Badge className="h-7 min-w-[28px] justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {pendingCount}
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-500">
          あなたに割り当てられた承認待ちタスク
        </p>
      </div>

      {/* 承認待ちテーブル */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            承認待ちタスク
            <span className="text-sm font-normal text-slate-500">
              ({pendingCount}件)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingApprovals && pendingApprovals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      文書タイトル
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      種別
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      申請者
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      提出日
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      期限
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      ステップ
                    </th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {/* 矢印 */}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingApprovals.map((approval: Record<string, unknown>) => {
                    const doc = approval.documents as Record<string, unknown> | null
                    const step = approval.workflow_steps as Record<string, unknown> | null
                    const applicant = doc
                      ? (doc.user_profiles as Record<string, unknown> | null)
                      : null
                    const template = doc
                      ? (doc.templates as Record<string, unknown> | null)
                      : null

                    // 期限計算: ステップのdeadline_hoursから算出
                    const createdAt = approval.created_at as string
                    const deadlineHours = step?.deadline_hours as number | null
                    const deadline = deadlineHours
                      ? new Date(
                          new Date(createdAt).getTime() +
                            deadlineHours * 60 * 60 * 1000
                        ).toISOString()
                      : (doc?.expiry_date as string | null)

                    const urgency = getDeadlineUrgency(deadline)

                    return (
                      <tr
                        key={approval.id as string}
                        className={`cursor-pointer transition-colors ${getUrgencyRowClass(urgency)}`}
                      >
                        <td className="py-3.5 pr-4">
                          <Link
                            href={`/dashboard/approvals/${approval.id}`}
                            className="block"
                          >
                            <p className="font-medium text-slate-900">
                              {(doc?.title as string) ?? '不明な文書'}
                            </p>
                            {doc?.document_number ? (
                              <p className="mt-0.5 text-xs text-slate-400">
                                {String(doc.document_number)}
                              </p>
                            ) : null}
                          </Link>
                        </td>
                        <td className="py-3.5 pr-4">
                          <Badge variant="secondary" className="text-xs">
                            {DOCUMENT_TYPE_LABELS[(template?.document_type as string) ?? ''] ??
                              (template?.document_type as string) ??
                              '--'}
                          </Badge>
                        </td>
                        <td className="py-3.5 pr-4">
                          <div>
                            <p className="text-sm text-slate-700">
                              {(applicant?.display_name as string) ??
                                (applicant?.email as string) ??
                                '不明'}
                            </p>
                            {applicant?.department ? (
                              <p className="text-xs text-slate-400">
                                {String(applicant.department)}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3.5 pr-4 text-sm text-slate-500">
                          {createdAt
                            ? new Date(createdAt).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                              })
                            : '--'}
                        </td>
                        <td className="py-3.5 pr-4">
                          <DeadlineBadge deadline={deadline} />
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                            {(step?.name as string) ??
                              `ステップ ${approval.step_order}`}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <Link
                            href={`/dashboard/approvals/${approval.id}`}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <CheckSquare className="mb-3 h-12 w-12 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">
                承認待ちのタスクはありません
              </p>
              <p className="mt-1 text-xs text-slate-400">
                新しい承認依頼が届くとここに表示されます
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
