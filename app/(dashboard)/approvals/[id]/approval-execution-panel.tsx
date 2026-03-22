'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  CheckCircle2,
  RotateCcw,
  ClipboardCheck,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import {
  getDocument,
  saveDocument,
  addApprovalRecord,
  addAuditLog,
} from '@/lib/store'
import { DOCUMENT_STATUS } from '@/types'

// =============================================================================
// 承認実行パネル（Client Component - ストアベース版）
// =============================================================================

interface ChecklistItem {
  id: string
  label: string
  checked: boolean
}

interface ApprovalExecutionPanelProps {
  approvalId: string
  documentId: string
  isAlreadyActed: boolean
  checklist: ChecklistItem[]
}

export function ApprovalExecutionPanel({
  approvalId,
  documentId,
  isAlreadyActed,
  checklist,
}: ApprovalExecutionPanelProps) {
  const router = useRouter()

  // チェックリスト状態
  const [checkStates, setCheckStates] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {}
      checklist.forEach((item) => {
        initial[item.id] = item.checked
      })
      return initial
    }
  )

  // 差戻し理由
  const [returnReason, setReturnReason] = useState('')

  // ローディング状態
  const [isApproving, setIsApproving] = useState(false)
  const [isReturning, setIsReturning] = useState(false)

  // エラー状態
  const [error, setError] = useState<string | null>(null)

  // 全チェック済みかどうか
  const allChecked =
    checklist.length === 0 ||
    checklist.every((item) => checkStates[item.id])

  const toggleCheck = (id: string) => {
    setCheckStates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  /** 承認実行 */
  const handleApprove = async () => {
    setIsApproving(true)
    setError(null)

    try {
      const doc = getDocument(documentId)
      if (!doc) throw new Error('文書が見つかりません')

      // 文書ステータスを承認済みに更新
      saveDocument({
        ...doc,
        status: DOCUMENT_STATUS.APPROVED,
      })

      // 承認レコード追加
      addApprovalRecord({
        document_id: documentId,
        step_order: 1,
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
        target_id: documentId,
        target_label: doc.title,
        operation: 'approve',
        before_value: { status: doc.status },
        after_value: { status: 'approved' },
        success: true,
        comment: null,
      })

      router.push('/dashboard/approvals')
    } catch (err) {
      setError(err instanceof Error ? err.message : '承認処理中にエラーが発生しました')
    } finally {
      setIsApproving(false)
    }
  }

  /** 差戻し実行 */
  const handleReturn = async () => {
    if (!returnReason.trim()) return

    setIsReturning(true)
    setError(null)

    try {
      const doc = getDocument(documentId)
      if (!doc) throw new Error('文書が見つかりません')

      // 文書ステータスを差戻しに更新
      saveDocument({
        ...doc,
        status: DOCUMENT_STATUS.RETURNED,
      })

      // 承認レコード追加
      addApprovalRecord({
        document_id: documentId,
        step_order: 1,
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
        target_id: documentId,
        target_label: doc.title,
        operation: 'return',
        before_value: { status: doc.status },
        after_value: { status: 'returned' },
        success: true,
        comment: returnReason.trim(),
      })

      router.push('/dashboard/approvals')
    } catch (err) {
      setError(err instanceof Error ? err.message : '差戻し処理中にエラーが発生しました')
    } finally {
      setIsReturning(false)
    }
  }

  // 処理済みの場合は非活性表示
  if (isAlreadyActed) {
    return (
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <p className="text-sm font-medium text-slate-500">
            この承認依頼は処理済みです
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* エラー表示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* 承認条件チェックリスト */}
      {checklist.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              承認条件チェック
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {checklist.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggleCheck(item.id)}
                    className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        checkStates[item.id]
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {checkStates[item.id] && <Check className="h-3 w-3" />}
                    </div>
                    <span
                      className={`text-sm ${
                        checkStates[item.id] ? 'text-slate-700' : 'text-slate-500'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {!allChecked && (
              <p className="mt-3 text-xs text-amber-600">
                すべての条件をチェックすると承認ボタンが有効になります
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 承認ボタン */}
      <Card className="border-green-200">
        <CardContent className="p-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                size="lg"
                disabled={!allChecked || isApproving}
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
                  この文書を承認します。承認後は取り消しできません。
                  よろしいですか？
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
  )
}
