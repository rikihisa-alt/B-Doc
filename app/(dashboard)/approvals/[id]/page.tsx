import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  Clock,
  FileText,
  User,
  CalendarDays,
} from 'lucide-react'
import { DOCUMENT_TYPE_LABELS } from '@/types'
import { ApprovalTimeline } from '@/components/workflow/approval-timeline'
import type { ApprovalStep } from '@/components/workflow/approval-timeline'
import { ApprovalExecutionPanel } from './approval-execution-panel'

// =============================================================================
// 承認実行ページ（Server Component + Client child）
// S-A02 仕様準拠:
// - ヘッダー: "承認依頼: 在職証明書（田中 太郎）" 形式
// - 左パネル: A4プレビュー（再提出時はdiffハイライト）
// - 右パネル: 承認条件チェック、承認/差戻しアクション、承認履歴
// =============================================================================

/** 期限の緊急度を判定 */
function getDeadlineUrgency(deadlineStr: string | null): 'overdue' | 'urgent' | 'normal' {
  if (!deadlineStr) return 'normal'
  const now = new Date()
  const deadline = new Date(deadlineStr)
  if (deadline < now) return 'overdue'
  const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursRemaining <= 24) return 'urgent'
  return 'normal'
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ApprovalDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 承認レコードと関連データを取得
  const { data: approval, error } = await supabase
    .from('approval_records')
    .select(
      `
      id,
      document_id,
      workflow_step_id,
      approver_id,
      step_order,
      action,
      comment,
      acted_at,
      created_at,
      documents (
        id,
        title,
        document_number,
        status,
        expiry_date,
        created_by,
        created_at,
        updated_at,
        template_id,
        template_version_id,
        metadata,
        templates (
          id,
          name,
          document_type
        ),
        template_versions (
          id,
          body,
          variables,
          layout,
          version
        ),
        user_profiles!documents_created_by_fkey (
          display_name,
          email,
          department,
          position
        )
      )
    `
    )
    .eq('id', id)
    .single()

  if (error || !approval) {
    redirect('/dashboard/approvals')
  }

  const doc = approval.documents as unknown as Record<string, unknown> | null
  const template = doc?.templates as unknown as Record<string, unknown> | null
  const templateVersion = doc?.template_versions as unknown as Record<string, unknown> | null
  const applicant = doc?.user_profiles as unknown as Record<string, unknown> | null
  const documentType = (template?.document_type as string) ?? ''
  const documentTypeLabel = DOCUMENT_TYPE_LABELS[documentType] ?? documentType

  // 文書の入力値を取得
  const { data: documentValues } = await supabase
    .from('document_values')
    .select('variable_name, value')
    .eq('document_id', doc?.id as string)

  const values: Record<string, string> = {}
  ;(documentValues ?? []).forEach((dv: { variable_name: string; value: string }) => {
    values[dv.variable_name] = dv.value
  })

  // この文書の全承認履歴を取得
  const { data: approvalHistory } = await supabase
    .from('approval_records')
    .select(
      `
      id,
      step_order,
      action,
      comment,
      acted_at,
      created_at,
      user_profiles!approval_records_approver_id_fkey (
        display_name,
        email
      ),
      workflow_steps:workflow_step_id (
        name
      )
    `
    )
    .eq('document_id', doc?.id as string)
    .order('step_order', { ascending: true })
    .order('created_at', { ascending: true })

  // 承認タイムラインデータを構築
  const timelineSteps: ApprovalStep[] = (approvalHistory ?? []).map(
    (record: Record<string, unknown>) => {
      const recordProfile = record.user_profiles as Record<string, unknown> | null
      const recordStep = record.workflow_steps as Record<string, unknown> | null
      return {
        id: record.id as string,
        stepOrder: record.step_order as number,
        approverName:
          (recordProfile?.display_name as string) ??
          (recordProfile?.email as string) ??
          '不明',
        approverRole: (recordStep?.name as string) ?? `ステップ ${record.step_order}`,
        action: record.acted_at
          ? (record.action as 'approved' | 'rejected' | 'returned')
          : 'pending',
        comment: (record.comment as string) ?? null,
        decidedAt: (record.acted_at as string) ?? null,
      }
    }
  )

  // 期限計算
  const deadline = (doc?.expiry_date as string) ?? null
  const urgency = getDeadlineUrgency(deadline)

  // テンプレートの本文取得
  const bodyTemplate =
    (templateVersion?.body as Record<string, unknown>)?.content as string ?? ''

  // 承認済みかどうか（既にアクション済み）
  const isAlreadyActed = !!approval.acted_at

  // 承認条件チェックリスト（テンプレートの変数定義から自動生成）
  const variables = (templateVersion?.variables as Array<Record<string, unknown>>) ?? []
  const approvalChecklist = variables
    .filter((v) => v.required)
    .map((v) => ({
      id: v.name as string,
      label: `${v.label ?? v.name} が入力済み`,
      checked: !!(values[v.name as string] && values[v.name as string].trim() !== ''),
    }))

  return (
    <div className="space-y-6">
      {/* ヘッダー: 承認依頼情報 */}
      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              承認依頼: {documentTypeLabel}（
              {(applicant?.display_name as string) ?? '不明'}）
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                申請者: {(applicant?.display_name as string) ?? '不明'}
                {applicant?.department ? ` / ${String(applicant.department)}` : ''}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                提出日:{' '}
                {doc?.created_at
                  ? new Date(doc.created_at as string).toLocaleDateString('ja-JP')
                  : '--'}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {doc?.document_number as string}
              </span>
            </div>
          </div>

          {/* 期限警告 */}
          {deadline && urgency !== 'normal' && (
            <div
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                urgency === 'overdue'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              {urgency === 'overdue' ? '期限超過' : '期限間近'}:{' '}
              {new Date(deadline).toLocaleDateString('ja-JP', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}

          {isAlreadyActed && (
            <Badge className="bg-slate-100 text-slate-600">処理済み</Badge>
          )}
        </div>
      </div>

      {/* メインコンテンツ: 左パネル（プレビュー）+ 右パネル（アクション） */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* 左パネル: A4プレビュー（3/5幅） */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-slate-600" />
                文書プレビュー
                <Badge variant="secondary" className="text-xs">
                  {documentTypeLabel}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* A4用紙プレビュー */}
              <div className="overflow-auto rounded-lg border bg-slate-100 p-4">
                <div
                  className="mx-auto bg-white shadow-lg"
                  style={{
                    width: '297px',
                    minHeight: '420px',
                    padding: '14px',
                    fontFamily: '"Noto Sans JP", "Yu Gothic", sans-serif',
                  }}
                >
                  {/* ヘッダー */}
                  <div className="mb-3 border-b pb-2">
                    {doc?.document_number ? (
                      <p className="text-[8px] text-gray-400">
                        文書番号: {String(doc.document_number)}
                      </p>
                    ) : null}
                    <h2 className="text-xs font-bold text-gray-900">
                      {(doc?.title as string) ?? ''}
                    </h2>
                  </div>

                  {/* 本文: テンプレート変数を置換して表示 */}
                  {bodyTemplate ? (
                    <div className="text-[9px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                      {bodyTemplate.replace(
                        /\{\{(\w+)\}\}/g,
                        (_: string, key: string) =>
                          values[key] ?? `[${key}]`
                      )}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-[10px] text-gray-300">
                      プレビューを表示できません
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右パネル: 承認アクション + 履歴（2/5幅） */}
        <div className="space-y-6 lg:col-span-2">
          {/* 承認実行パネル（Client Component） */}
          <ApprovalExecutionPanel
            approvalId={approval.id as string}
            documentId={doc?.id as string}
            isAlreadyActed={isAlreadyActed}
            checklist={approvalChecklist}
          />

          {/* 承認履歴 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-slate-600" />
                承認履歴
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ApprovalTimeline
                steps={timelineSteps}
                currentStep={approval.step_order as number}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
