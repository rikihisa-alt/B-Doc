// TODO: Supabase接続後にDBからデータ取得に切り替え
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
// 承認実行ページ（デモデータ版）
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

// ---------- デモデータ ----------
const demoApproval = {
  id: 'apr-001',
  document_id: 'doc-001',
  workflow_step_id: 'ws-002',
  approver_id: 'user-approver',
  step_order: 2,
  action: null,
  comment: null,
  acted_at: null,
  created_at: '2024-12-18T09:00:00Z',
}

const demoDoc = {
  id: 'doc-001',
  title: '在職証明書（田中 太郎）',
  document_number: 'DOC-2024-0001',
  status: 'pending_approval',
  expiry_date: null,
  created_by: 'user-001',
  created_at: '2024-12-15T10:00:00Z',
  updated_at: '2024-12-18T09:00:00Z',
  template_id: 'tpl-001',
  template_version_id: 'tv-001',
  metadata: { target_name: '田中 太郎' },
}

const demoApplicant = {
  display_name: '総務部 花子',
  email: 'hanako@example.com',
  department: '総務部',
  position: '担当者',
}

const demoDocumentTypeLabel = '在職証明書'

const demoValues: Record<string, string> = {
  employee_name: '田中 太郎',
  department: '開発部',
  position: 'シニアエンジニア',
  hire_date: '2020年4月1日',
  company_name: '株式会社Backlly',
}

const demoBodyTemplate = '{{company_name}}に在籍していることを証明します。\n\n氏名: {{employee_name}}\n部署: {{department}}\n役職: {{position}}\n入社日: {{hire_date}}'

const demoTimelineSteps: ApprovalStep[] = [
  {
    id: 'apr-step-001',
    stepOrder: 1,
    approverName: '総務部 花子',
    approverRole: '確認',
    action: 'approved',
    comment: '内容を確認しました。問題ありません。',
    decidedAt: '2024-12-17T14:30:00Z',
  },
  {
    id: 'apr-step-002',
    stepOrder: 2,
    approverName: '部長 三郎',
    approverRole: '部長承認',
    action: 'pending',
    comment: null,
    decidedAt: null,
  },
]

const demoChecklist = [
  { id: 'employee_name', label: '氏名 が入力済み', checked: true },
  { id: 'department', label: '部署 が入力済み', checked: true },
  { id: 'position', label: '役職 が入力済み', checked: true },
  { id: 'hire_date', label: '入社日 が入力済み', checked: true },
]

export default function ApprovalDetailPage({ params: _params }: PageProps) {
  const approval = demoApproval
  const doc = demoDoc
  const applicant = demoApplicant
  const documentTypeLabel = demoDocumentTypeLabel
  const values = demoValues
  const bodyTemplate = demoBodyTemplate
  const timelineSteps = demoTimelineSteps
  const approvalChecklist = demoChecklist

  // 期限計算
  const deadline = doc.expiry_date ?? null
  const urgency = getDeadlineUrgency(deadline)

  // 承認済みかどうか
  const isAlreadyActed = !!approval.acted_at

  return (
    <div className="space-y-6">
      {/* ヘッダー: 承認依頼情報 */}
      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              承認依頼: {documentTypeLabel}（
              {applicant?.display_name ?? '不明'}）
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                申請者: {applicant?.display_name ?? '不明'}
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
