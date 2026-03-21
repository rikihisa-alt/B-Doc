import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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
// 承認一覧ページ（Server Component）
// 現在のユーザーに割り当てられた承認待ちタスクを一覧表示する
// - テーブル: 文書タイトル、種別、申請者、提出日、期限緊急度、ステップ情報
// - 期限24h以内: amber、超過: red ハイライト
// - 行クリック → /dashboard/approvals/[id]
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

export default async function ApprovalsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザーに関連する承認待ちタスクを取得
  // approval_records テーブルから pending 状態のものを文書情報付きで取得
  const { data: pendingApprovals, error } = await supabase
    .from('approval_records')
    .select(
      `
      id,
      document_id,
      workflow_step_id,
      step_order,
      action,
      created_at,
      documents (
        id,
        title,
        document_number,
        status,
        expiry_date,
        created_by,
        created_at,
        templates (
          document_type
        ),
        user_profiles!documents_created_by_fkey (
          display_name,
          email,
          department
        )
      ),
      workflow_steps:workflow_step_id (
        name,
        deadline_hours
      )
    `
    )
    .eq('approver_id', user.id)
    .is('acted_at', null)
    .order('created_at', { ascending: false })

  // 承認待ち件数
  const pendingCount = pendingApprovals?.length ?? 0

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
