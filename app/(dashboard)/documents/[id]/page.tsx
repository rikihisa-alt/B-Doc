// TODO: Supabase接続後にDBからデータ取得に切り替え
// =============================================================================
// B-Doc 文書詳細ページ（デモデータ版）
// 左カラム: 文書情報・プレビュー・承認履歴・添付資料・操作ログ
// 右カラム: ワークフロー進行状況・次のアクション・操作ボタン
// =============================================================================

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/document/status-badge'
import { WorkflowProgress } from '@/components/document/workflow-progress'
import { DocumentActions } from '@/components/document/document-actions'
import { A4Preview } from '@/components/document/a4-preview'
import {
  DOCUMENT_TYPE_LABELS,
  STATUS_BADGE_MAP,
  type DocumentStatus,
  type ApprovalRecord,
  type AuditLog,
} from '@/types'
import {
  ArrowLeft,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Shield,
  Paperclip,
  History,
  User,
  Calendar,
  Hash,
  Building2,
  Lock,
  Printer,
} from 'lucide-react'

// =============================================================================
// ステータスから次のアクションテキストを導出するヘルパー
// =============================================================================

function getNextActionText(status: DocumentStatus): string {
  switch (status) {
    case 'draft':
      return '作成者が編集・申請を行えます'
    case 'pending_confirm':
      return '確認者による確認が必要です'
    case 'returned':
      return '作成者が修正して再申請してください'
    case 'pending_approval':
      return '承認者による承認が必要です'
    case 'approved':
      return '発行担当者が発行処理を行えます'
    case 'issuing':
      return '発行処理を実行中です'
    case 'issued':
      return '発行済み - PDF確認・再発行・取消が可能です'
    case 'sent':
      return '送付済み'
    case 'cancelled':
      return 'この文書は取消されました'
    case 'expired':
      return 'この文書は期限切れです'
    default:
      return ''
  }
}

// =============================================================================
// 承認タイムラインのアイコン判定
// =============================================================================

function getApprovalIcon(action: string) {
  switch (action) {
    case 'approve':
    case 'approved':
    case 'confirm':
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    case 'reject':
    case 'rejected':
    case 'return':
    case 'returned':
      return <XCircle className="h-4 w-4 text-red-600" />
    default:
      return <Clock className="h-4 w-4 text-gray-400" />
  }
}

function getApprovalBg(action: string) {
  switch (action) {
    case 'approve':
    case 'approved':
    case 'confirm':
      return 'bg-emerald-100'
    case 'reject':
    case 'rejected':
    case 'return':
    case 'returned':
      return 'bg-red-100'
    default:
      return 'bg-gray-100'
  }
}

function getApprovalLabel(action: string) {
  switch (action) {
    case 'approve':
    case 'approved':
      return '承認'
    case 'confirm':
      return '確認'
    case 'reject':
    case 'rejected':
      return '却下'
    case 'return':
    case 'returned':
      return '差戻し'
    default:
      return action
  }
}

// =============================================================================
// デモデータ
// =============================================================================

const demoDocument = {
  id: 'demo-001',
  document_number: 'DOC-2024-0001',
  title: '在職証明書（田中 太郎）',
  document_type: 'employment_certificate',
  status: 'pending_approval' as DocumentStatus,
  created_at: '2024-12-01T10:00:00Z',
  created_by: 'user-001',
  updated_by: 'user-001',
  issued_date: null as string | null,
  template_id: 'tpl-001',
  template_version_id: 'tv-001',
  recipient: { name: '田中 太郎' },
  metadata: { target_name: '田中 太郎', confidentiality: '社外秘' },
}

const demoCreatorProfile = {
  display_name: '管理者 太郎',
  department: '人事部',
  position: '主任',
}

const demoApprovals = [
  {
    id: 'apr-001',
    step_order: 1,
    action: 'confirm',
    comment: '内容を確認しました。問題ありません。',
    acted_at: '2024-12-02T14:30:00Z',
    user_profiles: { display_name: '総務部 花子', position: '確認者' },
  },
  {
    id: 'apr-002',
    step_order: 2,
    action: 'pending',
    comment: null,
    acted_at: null,
    user_profiles: { display_name: '部長 三郎', position: '承認者' },
  },
]

const demoAuditLogs = [
  {
    id: 'log-001',
    created_at: '2024-12-01T10:00:00Z',
    operation: 'create',
    performed_by: 'user-001',
    new_values: { status: 'draft' },
  },
  {
    id: 'log-002',
    created_at: '2024-12-01T10:30:00Z',
    operation: 'status_change',
    performed_by: 'user-001',
    new_values: { status: 'pending_confirm' },
  },
  {
    id: 'log-003',
    created_at: '2024-12-02T14:30:00Z',
    operation: 'approve',
    performed_by: 'user-002',
    new_values: { status: 'pending_approval' },
  },
]

const demoProgressSteps = [
  { label: '確認', status: 'completed' as const, actor: '総務部 花子', date: '2024/12/02 14:30' },
  { label: '承認', status: 'current' as const, actor: undefined, date: undefined },
  { label: '発行', status: 'pending' as const, actor: undefined, date: undefined },
]

const demoValuesMap: Record<string, string> = {
  employee_name: '田中 太郎',
  department: '開発部',
  position: 'シニアエンジニア',
  hire_date: '2020年4月1日',
  company_name: '株式会社Backlly',
}

const demoBodyTemplate = '{{company_name}}に在籍していることを証明します。\n\n氏名: {{employee_name}}\n部署: {{department}}\n役職: {{position}}\n入社日: {{hire_date}}\n\n上記の者は、当社に在籍していることを証明いたします。'

// =============================================================================
// メインページコンポーネント
// =============================================================================

export default function DocumentDetailPage({
  params: _params,
}: {
  params: Promise<{ id: string }>
}) {
  const id = 'demo-001'
  const document = demoDocument
  const approvals = demoApprovals
  const auditLogs = demoAuditLogs
  const creatorProfile = demoCreatorProfile

  // ---------- 派生値 ----------
  const status = document.status as DocumentStatus
  const badgeInfo = STATUS_BADGE_MAP[status]
  const isOwner = true

  const valuesMap = demoValuesMap
  const bodyTemplate = demoBodyTemplate
  const progressSteps = demoProgressSteps

  // 機密レベルバッジ
  const confidentiality = (document.metadata as Record<string, unknown>)?.confidentiality as string | undefined

  // ---------- 操作ログのラベル変換 ----------
  const OPERATION_LABELS: Record<string, string> = {
    create: '作成',
    update: '更新',
    status_change: 'ステータス変更',
    approve: '承認',
    reject: '却下',
    return: '差戻し',
    issue: '発行',
    send: '送付',
    cancel: '取消',
    download: 'ダウンロード',
    view: '閲覧',
  }

  // ==========================================================================
  // レンダリング
  // ==========================================================================
  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* ページヘッダー */}
      {/* ================================================================ */}
      <div className="space-y-3">
        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          一覧へ
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <p className="font-mono text-sm text-gray-500">
                {document.document_number ?? '未採番'}
              </p>
              <StatusBadge status={status} />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              {document.title}
            </h1>
            <p className="text-sm text-gray-500">
              作成者: {creatorProfile?.display_name ?? '不明'}
              {creatorProfile?.department ? ` (${creatorProfile.department})` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 2カラムレイアウト */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ============================================ */}
        {/* 左カラム: メインコンテンツ (2/3) */}
        {/* ============================================ */}
        <div className="lg:col-span-2 space-y-6">
          {/* --- 文書情報セクション --- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-gray-500" />
                文書情報
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Hash className="mt-0.5 h-3.5 w-3.5 text-gray-400" />
                  <div>
                    <dt className="text-gray-500">文書番号</dt>
                    <dd className="font-mono font-medium">{document.document_number ?? '未採番'}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-3.5 w-3.5 text-gray-400" />
                  <div>
                    <dt className="text-gray-500">文書種別</dt>
                    <dd>{DOCUMENT_TYPE_LABELS[document.document_type] ?? document.document_type}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-3.5 w-3.5 text-gray-400" />
                  <div>
                    <dt className="text-gray-500">対象者</dt>
                    <dd>{(document.metadata as Record<string, unknown>)?.target_name as string ?? '-'}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-3.5 w-3.5 text-gray-400" />
                  <div>
                    <dt className="text-gray-500">作成者</dt>
                    <dd>{creatorProfile?.display_name ?? '-'}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-3.5 w-3.5 text-gray-400" />
                  <div>
                    <dt className="text-gray-500">作成日</dt>
                    <dd>{new Date(document.created_at).toLocaleDateString('ja-JP')}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Lock className="mt-0.5 h-3.5 w-3.5 text-gray-400" />
                  <div>
                    <dt className="text-gray-500">機密レベル</dt>
                    <dd>
                      {confidentiality ? (
                        <Badge variant="outline" className="text-xs">
                          <Shield className="mr-1 h-3 w-3" />
                          {confidentiality}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">未設定</span>
                      )}
                    </dd>
                  </div>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* --- 文書プレビューセクション --- */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-gray-500" />
                  文書プレビュー
                </CardTitle>
                <div className="flex items-center gap-2">
                  {status === 'issued' && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/api/documents/${id}/pdf`}>
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        PDF ダウンロード
                      </Link>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                    印刷プレビュー
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="bg-gray-100 p-6 rounded-b-lg">
              <A4Preview
                bodyTemplate={bodyTemplate}
                values={valuesMap}
                title={document.title}
                documentNumber={document.document_number ?? undefined}
                issuedAt={
                  document.issued_date
                    ? new Date(document.issued_date).toLocaleDateString('ja-JP')
                    : undefined
                }
                watermark={
                  status === 'draft' || status === 'returned'
                    ? 'DRAFT'
                    : status === 'cancelled'
                      ? '取消'
                      : undefined
                }
              />
            </CardContent>
          </Card>

          {/* --- 承認履歴セクション --- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-gray-500" />
                承認履歴
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approvals && approvals.length > 0 ? (
                <div className="space-y-0">
                  {approvals.map((approval: Record<string, unknown>, index: number) => {
                    const isLast = index === approvals.length - 1
                    const profile = approval.user_profiles as { display_name: string; position?: string } | null
                    const action = String(approval.action)

                    return (
                      <div key={String(approval.id)} className="relative flex gap-3">
                        {/* タイムライン線 */}
                        {!isLast && (
                          <div className="absolute left-[15px] top-[32px] h-[calc(100%-8px)] w-0.5 bg-gray-200" />
                        )}

                        {/* アイコン */}
                        <div className={`relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getApprovalBg(action)}`}>
                          {getApprovalIcon(action)}
                        </div>

                        {/* コンテンツ */}
                        <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-6'}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {profile?.display_name ?? `ステップ ${approval.step_order}`}
                            </span>
                            {profile?.position ? (
                              <span className="text-xs text-gray-500">({String(profile.position)})</span>
                            ) : null}
                            <Badge variant="outline" className="text-xs">
                              {getApprovalLabel(action)}
                            </Badge>
                          </div>
                          {approval.comment ? (
                            <p className="mt-1 text-sm text-gray-600">
                              {String(approval.comment)}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-gray-400">
                            {approval.acted_at
                              ? new Date(String(approval.acted_at)).toLocaleString('ja-JP')
                              : '未処理'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">
                  承認履歴はありません
                </p>
              )}
            </CardContent>
          </Card>

          {/* --- 添付資料セクション --- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Paperclip className="h-4 w-4 text-gray-500" />
                添付資料
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="py-4 text-center text-sm text-gray-400">
                添付資料はありません
              </p>
            </CardContent>
          </Card>

          {/* --- 操作ログセクション --- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-gray-500" />
                操作ログ
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {auditLogs && auditLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">日時</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">操作</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">実行者</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">詳細</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log: Record<string, unknown>) => (
                        <tr key={String(log.id)} className="border-b last:border-0">
                          <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(String(log.created_at)).toLocaleString('ja-JP', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-2">
                            <Badge variant="outline" className="text-xs">
                              {OPERATION_LABELS[String(log.operation)] ?? String(log.operation)}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-600">
                            {String(log.performed_by).slice(0, 8)}...
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-500 max-w-[200px] truncate">
                            {log.new_values
                              ? JSON.stringify(log.new_values).slice(0, 60)
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-gray-400">
                  操作ログはありません
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ============================================ */}
        {/* 右カラム: 操作パネル (1/3) */}
        {/* ============================================ */}
        <div className="space-y-6">
          {/* --- ワークフロー進行状況 --- */}
          {progressSteps.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">ワークフロー</CardTitle>
              </CardHeader>
              <CardContent>
                <WorkflowProgress steps={progressSteps} />
              </CardContent>
            </Card>
          )}

          {/* --- 次のアクション --- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">次のアクション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                {getNextActionText(status)}
              </p>

              {/* アクションボタン */}
              <DocumentActions
                documentId={id}
                documentNumber={document.document_number ?? ''}
                status={status}
                isOwner={isOwner}
                userId={'demo-user-001'}
              />
            </CardContent>
          </Card>

          {/* --- 発行済み文書の追加情報 --- */}
          {(status === 'issued' || status === 'sent') && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">発行情報</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500">発行番号</dt>
                    <dd className="font-mono font-medium">
                      {document.document_number ?? '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">発行日時</dt>
                    <dd>
                      {document.issued_date
                        ? new Date(document.issued_date).toLocaleString('ja-JP')
                        : '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">発行者</dt>
                    <dd>{document.updated_by?.slice(0, 8) ?? '-'}...</dd>
                  </div>
                  <div className="pt-2">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link href={`/api/documents/${id}/pdf`}>
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        PDF ダウンロード
                      </Link>
                    </Button>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}

          {/* --- 取消済み文書の取消理由 --- */}
          {status === 'cancelled' && (
            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-red-700">取消情報</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {(document.metadata as Record<string, unknown>)?.cancel_reason as string ?? '取消理由の記載なし'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
