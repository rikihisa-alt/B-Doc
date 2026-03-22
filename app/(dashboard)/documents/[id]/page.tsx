'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  DOCUMENT_STATUS,
  STATUS_BADGE_MAP,
  type DocumentStatus,
} from '@/types'
import {
  getDocument,
  getApprovalRecords,
  getAuditLogs,
  saveDocument,
  addApprovalRecord,
  addAuditLog,
  assignDocumentNumber,
  getTemplate,
  getSeals,
} from '@/lib/store'
import type { LocalDocument, LocalApprovalRecord, LocalAuditLog } from '@/lib/store'
import {
  ArrowLeft,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Paperclip,
  History,
  User,
  Calendar,
  Hash,
  Lock,
  Printer,
} from 'lucide-react'

// ステータスから次のアクションテキストを導出するヘルパー
function getNextActionText(status: DocumentStatus): string {
  switch (status) {
    case 'draft': return '作成者が編集・申請を行えます'
    case 'pending_confirm': return '確認者による確認が必要です'
    case 'returned': return '作成者が修正して再申請してください'
    case 'pending_approval': return '承認者による承認が必要です'
    case 'approved': return '発行担当者が発行処理を行えます'
    case 'issuing': return '発行処理を実行中です'
    case 'issued': return '発行済み - PDF確認・再発行・取消が可能です'
    case 'sent': return '送付済み'
    case 'cancelled': return 'この文書は取消されました'
    case 'expired': return 'この文書は期限切れです'
    default: return ''
  }
}

// 承認タイムラインのアイコン判定
function getApprovalIcon(action: string) {
  switch (action) {
    case 'approve': case 'approved': case 'confirm': case 'confirmed':
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    case 'reject': case 'rejected': case 'return': case 'returned':
      return <XCircle className="h-4 w-4 text-red-600" />
    default:
      return <Clock className="h-4 w-4 text-gray-400" />
  }
}

function getApprovalBg(action: string) {
  switch (action) {
    case 'approve': case 'approved': case 'confirm': case 'confirmed':
      return 'bg-emerald-100'
    case 'reject': case 'rejected': case 'return': case 'returned':
      return 'bg-red-100'
    default:
      return 'bg-gray-100'
  }
}

function getApprovalLabel(action: string) {
  switch (action) {
    case 'approve': case 'approved': return '承認'
    case 'confirm': case 'confirmed': return '確認'
    case 'reject': case 'rejected': return '却下'
    case 'return': case 'returned': return '差戻し'
    default: return action
  }
}

// 操作ログのラベル変換
const OPERATION_LABELS: Record<string, string> = {
  create: '作成', update: '更新', status_change: 'ステータス変更',
  approve: '承認', reject: '却下', return: '差戻し', issue: '発行',
  send: '送付', cancel: '取消', download: 'ダウンロード', view: '閲覧',
}

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [doc, setDoc] = useState<LocalDocument | null>(null)
  const [approvals, setApprovals] = useState<LocalApprovalRecord[]>([])
  const [auditLogs, setAuditLogs] = useState<LocalAuditLog[]>([])
  const [loaded, setLoaded] = useState(false)

  // データ読み込み
  const loadData = useCallback(() => {
    const d = getDocument(id)
    setDoc(d)
    setApprovals(getApprovalRecords(id))
    // 監査ログをこの文書のものだけフィルタ
    const allLogs = getAuditLogs()
    setAuditLogs(allLogs.filter((l) => l.target_id === id))
    setLoaded(true)
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ステータス遷移アクション
  const handleStatusChange = useCallback(
    (newStatus: DocumentStatus, operation: string, comment?: string) => {
      if (!doc) return
      const prevStatus = doc.status
      const updated: LocalDocument = { ...doc, status: newStatus, updated_at: new Date().toISOString() }

      // 発行時: 文書番号を採番
      if (newStatus === DOCUMENT_STATUS.ISSUED) {
        const docNum = assignDocumentNumber(doc)
        updated.document_number = docNum
        updated.issued_at = new Date().toISOString()
        updated.issued_by = 'デモユーザー'
      }

      // 取消時: 取消理由を保存
      if (newStatus === DOCUMENT_STATUS.CANCELLED) {
        updated.cancelled_at = new Date().toISOString()
        updated.cancel_reason = comment || '取消'
      }

      saveDocument(updated)

      // 承認レコード追加（承認操作の場合）
      if (operation === 'approve') {
        addApprovalRecord({
          document_id: id,
          step_order: approvals.length + 1,
          approver_name: 'デモユーザー',
          action: 'approved',
          comment: comment || '',
          acted_at: new Date().toISOString(),
        })
      }

      // 監査ログ追加
      addAuditLog({
        user_name: 'デモユーザー',
        user_role: 'creator',
        target_type: 'document',
        target_id: id,
        target_label: doc.title,
        operation,
        before_value: { status: prevStatus },
        after_value: { status: newStatus },
        success: true,
        comment: comment || null,
      })

      loadData()
    },
    [doc, id, approvals.length, loadData]
  )

  // PDF ダウンロード
  const handleDownloadPdf = async () => {
    if (!doc) return
    try {
      // テンプレートのブロック・印影データを取得
      const template = doc.template_id ? getTemplate(doc.template_id) : null
      const allSeals = getSeals()

      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: doc.title,
          document_number: doc.document_number,
          document_type: doc.document_type,
          values: doc.values,
          body_template: doc.body_template,
          blocks: template?.blocks || undefined,
          seals: allSeals,
          issued_at: doc.issued_at || new Date().toISOString(),
          is_draft: doc.status === 'draft',
        }),
      })

      if (!res.ok) throw new Error('PDF生成に失敗しました')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc.document_number || doc.title}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      alert('PDF生成エラー: ' + (error instanceof Error ? error.message : '不明なエラー'))
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="space-y-4">
        <Link href="/documents" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          一覧へ
        </Link>
        <p className="text-sm text-gray-500">文書が見つかりません</p>
      </div>
    )
  }

  const status = doc.status as DocumentStatus
  const badgeInfo = STATUS_BADGE_MAP[status]
  const valuesMap = doc.values
  const bodyTemplate = doc.body_template

  // ワークフロー進行状況を承認レコードから構築
  const progressSteps = (() => {
    const steps: { label: string; status: 'completed' | 'current' | 'pending'; actor?: string; date?: string }[] = []

    // 確認ステップ
    const confirmRecord = approvals.find((a) => a.action === 'confirmed')
    if (confirmRecord) {
      steps.push({ label: '確認', status: 'completed', actor: confirmRecord.approver_name, date: new Date(confirmRecord.acted_at).toLocaleString('ja-JP') })
    } else if (status === 'pending_confirm') {
      steps.push({ label: '確認', status: 'current' })
    }

    // 承認ステップ
    const approveRecord = approvals.find((a) => a.action === 'approved')
    if (approveRecord) {
      steps.push({ label: '承認', status: 'completed', actor: approveRecord.approver_name, date: new Date(approveRecord.acted_at).toLocaleString('ja-JP') })
    } else if (status === 'pending_approval') {
      steps.push({ label: '承認', status: 'current' })
    } else if (!approveRecord && steps.length > 0) {
      steps.push({ label: '承認', status: 'pending' })
    }

    // 発行ステップ
    if (status === 'issued' || status === 'sent') {
      steps.push({ label: '発行', status: 'completed', actor: doc.issued_by || undefined, date: doc.issued_at ? new Date(doc.issued_at).toLocaleString('ja-JP') : undefined })
    } else if (status === 'approved') {
      steps.push({ label: '発行', status: 'current' })
    } else if (steps.length > 0) {
      steps.push({ label: '発行', status: 'pending' })
    }

    return steps
  })()

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
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
                {doc.document_number ?? '未採番'}
              </p>
              <StatusBadge status={status} />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{doc.title}</h1>
            <p className="text-sm text-gray-500">作成者: {doc.created_by}</p>
          </div>
        </div>
      </div>

      {/* 2カラムレイアウト */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 左カラム: メインコンテンツ (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 文書情報セクション */}
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
                    <dd className="font-mono font-medium">{doc.document_number ?? '未採番'}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-3.5 w-3.5 text-gray-400" />
                  <div>
                    <dt className="text-gray-500">文書種別</dt>
                    <dd>{DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-3.5 w-3.5 text-gray-400" />
                  <div>
                    <dt className="text-gray-500">作成者</dt>
                    <dd>{doc.created_by}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-3.5 w-3.5 text-gray-400" />
                  <div>
                    <dt className="text-gray-500">作成日</dt>
                    <dd>{new Date(doc.created_at).toLocaleDateString('ja-JP')}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Lock className="mt-0.5 h-3.5 w-3.5 text-gray-400" />
                  <div>
                    <dt className="text-gray-500">機密レベル</dt>
                    <dd>
                      <Badge variant="outline" className="text-xs">
                        <Shield className="mr-1 h-3 w-3" />
                        {doc.confidentiality}
                      </Badge>
                    </dd>
                  </div>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* 文書プレビューセクション */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-gray-500" />
                  文書プレビュー
                </CardTitle>
                <div className="flex items-center gap-2">
                  {status === 'issued' && (
                    <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      PDF ダウンロード
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
                title={doc.title}
                documentNumber={doc.document_number ?? undefined}
                issuedAt={
                  doc.issued_at
                    ? new Date(doc.issued_at).toLocaleDateString('ja-JP')
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

          {/* 承認履歴セクション */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-gray-500" />
                承認履歴
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approvals.length > 0 ? (
                <div className="space-y-0">
                  {approvals.map((approval, index) => {
                    const isLast = index === approvals.length - 1
                    return (
                      <div key={approval.id} className="relative flex gap-3">
                        {!isLast && (
                          <div className="absolute left-[15px] top-[32px] h-[calc(100%-8px)] w-0.5 bg-gray-200" />
                        )}
                        <div className={`relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getApprovalBg(approval.action)}`}>
                          {getApprovalIcon(approval.action)}
                        </div>
                        <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-6'}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {approval.approver_name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {getApprovalLabel(approval.action)}
                            </Badge>
                          </div>
                          {approval.comment && (
                            <p className="mt-1 text-sm text-gray-600">{approval.comment}</p>
                          )}
                          <p className="mt-1 text-xs text-gray-400">
                            {new Date(approval.acted_at).toLocaleString('ja-JP')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">承認履歴はありません</p>
              )}
            </CardContent>
          </Card>

          {/* 添付資料セクション */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Paperclip className="h-4 w-4 text-gray-500" />
                添付資料
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="py-4 text-center text-sm text-gray-400">添付資料はありません</p>
            </CardContent>
          </Card>

          {/* 操作ログセクション */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-gray-500" />
                操作ログ
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {auditLogs.length > 0 ? (
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
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="border-b last:border-0">
                          <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(log.executed_at).toLocaleString('ja-JP', {
                              month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-2">
                            <Badge variant="outline" className="text-xs">
                              {OPERATION_LABELS[log.operation] ?? log.operation}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-600">{log.user_name}</td>
                          <td className="px-4 py-2 text-xs text-gray-500 max-w-[200px] truncate">
                            {log.after_value ? JSON.stringify(log.after_value).slice(0, 60) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-gray-400">操作ログはありません</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右カラム: 操作パネル (1/3) */}
        <div className="space-y-6">
          {/* ワークフロー進行状況 */}
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

          {/* 次のアクション */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">次のアクション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{getNextActionText(status)}</p>

              {/* アクションボタン */}
              <div className="space-y-2">
                {/* 下書き → 申請する */}
                {(status === 'draft' || status === 'returned') && (
                  <Button
                    className="w-full"
                    onClick={() => handleStatusChange(DOCUMENT_STATUS.PENDING_APPROVAL, 'status_change')}
                  >
                    申請する
                  </Button>
                )}

                {/* 承認待ち → 承認する */}
                {status === 'pending_approval' && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => handleStatusChange(DOCUMENT_STATUS.APPROVED, 'approve', '承認しました')}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    承認する
                  </Button>
                )}

                {/* 承認済み → 発行する */}
                {status === 'approved' && (
                  <Button
                    className="w-full"
                    onClick={() => handleStatusChange(DOCUMENT_STATUS.ISSUED, 'issue')}
                  >
                    発行する
                  </Button>
                )}

                {/* 取消ボタン（発行済み以外のアクティブなステータスで表示） */}
                {(['draft', 'pending_confirm', 'pending_approval', 'approved', 'returned'] as DocumentStatus[]).includes(status) && (
                  <Button
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700 hover:border-red-300"
                    onClick={() => {
                      const reason = prompt('取消理由を入力してください')
                      if (reason) {
                        handleStatusChange(DOCUMENT_STATUS.CANCELLED, 'cancel', reason)
                      }
                    }}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />
                    取消
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 発行済み文書の追加情報 */}
          {(status === 'issued' || status === 'sent') && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">発行情報</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500">発行番号</dt>
                    <dd className="font-mono font-medium">{doc.document_number ?? '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">発行日時</dt>
                    <dd>{doc.issued_at ? new Date(doc.issued_at).toLocaleString('ja-JP') : '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">発行者</dt>
                    <dd>{doc.issued_by ?? '-'}</dd>
                  </div>
                  <div className="pt-2">
                    <Button variant="outline" size="sm" className="w-full" onClick={handleDownloadPdf}>
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      PDF ダウンロード
                    </Button>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}

          {/* 取消済み文書の取消理由 */}
          {status === 'cancelled' && (
            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-red-700">取消情報</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {doc.cancel_reason ?? '取消理由の記載なし'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
