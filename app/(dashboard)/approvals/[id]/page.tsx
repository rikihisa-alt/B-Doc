'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  FileText,
  User,
  CalendarDays,
  Clock,
  CheckCircle2,
  RotateCcw,
  X,
  Loader2,
} from 'lucide-react'
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS } from '@/types'
import {
  getDocument,
  getApprovalRecords,
  saveDocument,
  addApprovalRecord,
  addAuditLog,
  getTemplate,
} from '@/lib/store'
import type { LocalDocument, LocalApprovalRecord } from '@/lib/store'
import { ApprovalTimeline } from '@/components/workflow/approval-timeline'
import type { ApprovalStep } from '@/components/workflow/approval-timeline'

/**
 * 承認実行ページ（Client Component）
 * ストアから文書と承認レコードを取得、承認/差戻し操作を実行
 */
export default function ApprovalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [doc, setDoc] = useState<LocalDocument | null>(null)
  const [approvals, setApprovals] = useState<LocalApprovalRecord[]>([])
  const [loaded, setLoaded] = useState(false)

  // 承認/差戻し操作状態
  const [returnReason, setReturnReason] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isReturning, setIsReturning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(() => {
    const d = getDocument(id)
    setDoc(d)
    if (d) {
      setApprovals(getApprovalRecords(id))
    }
    setLoaded(true)
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 文書種別ラベル
  const documentTypeLabel = doc ? (DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type) : ''

  // テンプレート変数を展開した本文
  const bodyTemplate = doc?.body_template ?? ''
  const values = doc?.values ?? {}

  // 承認タイムラインステップを構築
  const timelineSteps: ApprovalStep[] = approvals.map((a, i) => ({
    id: a.id,
    stepOrder: a.step_order,
    approverName: a.approver_name,
    approverRole: a.action === 'confirmed' ? '確認者' : '承認者',
    action: a.action === 'confirmed' ? 'approved' : a.action === 'rejected' ? 'rejected' : a.action === 'returned' ? 'rejected' : 'approved',
    comment: a.comment || null,
    decidedAt: a.acted_at,
  }))

  // 現在のステップ
  const currentStep = approvals.length + 1

  // 承認実行
  const handleApprove = useCallback(async () => {
    if (!doc) return
    setIsApproving(true)
    setError(null)

    try {
      // 文書ステータスを承認済みに更新
      saveDocument({
        ...doc,
        status: DOCUMENT_STATUS.APPROVED,
      })

      // 承認レコード追加
      addApprovalRecord({
        document_id: id,
        step_order: approvals.length + 1,
        approver_name: 'デモユーザー',
        action: 'approved',
        comment: '',
        acted_at: new Date().toISOString(),
      })

      // 監査ログ追加
      addAuditLog({
        user_name: 'デモユーザー',
        user_role: 'approver',
        target_type: 'document',
        target_id: id,
        target_label: doc.title,
        operation: 'approve',
        before_value: { status: doc.status },
        after_value: { status: 'approved' },
        success: true,
        comment: null,
      })

      router.push('/approvals')
    } catch (err) {
      setError(err instanceof Error ? err.message : '承認処理中にエラーが発生しました')
    } finally {
      setIsApproving(false)
    }
  }, [doc, id, approvals.length, router])

  // 差戻し実行
  const handleReturn = useCallback(async () => {
    if (!doc || !returnReason.trim()) return
    setIsReturning(true)
    setError(null)

    try {
      // 文書ステータスを差戻しに更新
      saveDocument({
        ...doc,
        status: DOCUMENT_STATUS.RETURNED,
      })

      // 承認レコード追加
      addApprovalRecord({
        document_id: id,
        step_order: approvals.length + 1,
        approver_name: 'デモユーザー',
        action: 'returned',
        comment: returnReason.trim(),
        acted_at: new Date().toISOString(),
      })

      // 監査ログ追加
      addAuditLog({
        user_name: 'デモユーザー',
        user_role: 'approver',
        target_type: 'document',
        target_id: id,
        target_label: doc.title,
        operation: 'return',
        before_value: { status: doc.status },
        after_value: { status: 'returned' },
        success: true,
        comment: returnReason.trim(),
      })

      router.push('/approvals')
    } catch (err) {
      setError(err instanceof Error ? err.message : '差戻し処理中にエラーが発生しました')
    } finally {
      setIsReturning(false)
    }
  }, [doc, id, returnReason, approvals.length, router])

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="py-20 text-center text-sm text-gray-500">
        文書が見つかりません
      </div>
    )
  }

  const isPendingAction = doc.status === DOCUMENT_STATUS.PENDING_APPROVAL || doc.status === DOCUMENT_STATUS.PENDING_CONFIRM

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              承認依頼: {documentTypeLabel}（{doc.created_by}）
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                作成者: {doc.created_by}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                作成日: {new Date(doc.created_at).toLocaleDateString('ja-JP')}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {doc.document_number ?? '未採番'}
              </span>
            </div>
          </div>
          {!isPendingAction && (
            <Badge className="bg-slate-100 text-slate-600">処理済み</Badge>
          )}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* 左パネル: A4プレビュー */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-slate-600" />
                文書プレビュー
                <Badge variant="secondary" className="text-xs">{documentTypeLabel}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                  <div className="mb-3 border-b pb-2">
                    {doc.document_number && (
                      <p className="text-[8px] text-gray-400">文書番号: {doc.document_number}</p>
                    )}
                    <h2 className="text-xs font-bold text-gray-900">{doc.title}</h2>
                  </div>
                  {bodyTemplate ? (
                    <div className="text-[9px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                      {bodyTemplate.replace(
                        /\{\{(\w+)\}\}/g,
                        (_: string, key: string) => values[key] ?? `[${key}]`
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

        {/* 右パネル: 承認アクション + 履歴 */}
        <div className="space-y-6 lg:col-span-2">
          {/* エラー表示 */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-3">
                <p className="text-sm text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* 承認/差戻しパネル */}
          {isPendingAction ? (
            <div className="space-y-4">
              {/* 承認ボタン */}
              <Card className="border-green-200">
                <CardContent className="p-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        className="w-full bg-green-600 text-white hover:bg-green-700"
                        size="lg"
                        disabled={isApproving}
                      >
                        {isApproving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        承認する
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>承認の確認</AlertDialogTitle>
                        <AlertDialogDescription>
                          この文書を承認します。よろしいですか？
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleApprove}
                          className="bg-green-600 text-white hover:bg-green-700"
                        >
                          承認する
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>

              {/* 差戻しセクション */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-red-700">
                    <RotateCcw className="h-5 w-5" />
                    差戻し
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="具体的に記述してください（必須）"
                    rows={4}
                    className="resize-none"
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full"
                        disabled={!returnReason.trim() || isReturning}
                      >
                        {isReturning ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <X className="mr-2 h-4 w-4" />
                        )}
                        差戻す
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>差戻しの確認</AlertDialogTitle>
                        <AlertDialogDescription>
                          以下の理由で文書を差し戻します。よろしいですか？
                        </AlertDialogDescription>
                        <div className="mt-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                          {returnReason}
                        </div>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleReturn}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          差戻す
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                <p className="text-sm font-medium text-slate-500">
                  この承認依頼は処理済みです
                </p>
              </CardContent>
            </Card>
          )}

          {/* 承認履歴 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-slate-600" />
                承認履歴
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timelineSteps.length > 0 ? (
                <ApprovalTimeline steps={timelineSteps} currentStep={currentStep} />
              ) : (
                <p className="py-4 text-center text-sm text-slate-400">承認履歴はありません</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
