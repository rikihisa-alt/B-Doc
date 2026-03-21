'use client'

// =============================================================================
// B-Doc 文書アクションボタン
// ステータスに応じたアクションボタンを表示し、確認ダイアログ付きで操作を実行する
// CancelDialog: 取消操作（文書番号の確認入力必須）
// ConfirmDialog: 承認・差戻し・発行等の汎用確認
// =============================================================================

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CancelDocumentDialog } from '@/components/document/cancel-dialog'
import { ConfirmDialog } from '@/components/document/confirm-dialog'
import type { DocumentStatus } from '@/types'
import {
  Edit,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  RotateCcw,
  Trash2,
  Download,
  Printer,
  Loader2,
  Eye,
  AlertTriangle,
} from 'lucide-react'

// =============================================================================
// Props
// =============================================================================

interface DocumentActionsProps {
  /** 文書ID */
  documentId: string
  /** 文書番号（取消ダイアログの確認入力に使用） */
  documentNumber: string
  /** 現在の文書ステータス */
  status: DocumentStatus
  /** 操作者が文書の作成者かどうか */
  isOwner: boolean
  /** 操作者のユーザーID */
  userId: string
  /** 追加CSSクラス */
  className?: string
}

// =============================================================================
// メインコンポーネント
// =============================================================================

export function DocumentActions({
  documentId,
  documentNumber,
  status,
  isOwner,
  userId,
  className,
}: DocumentActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // ---------- ダイアログ開閉状態 ----------
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showIssueDialog, setShowIssueDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  // ============================================================
  // 汎用アクション実行
  // ============================================================
  const executeAction = useCallback(
    async (action: string, comment?: string) => {
      setLoading(true)
      try {
        const endpoint =
          action === 'issue'
            ? `/api/documents/${documentId}/issue`
            : action === 'cancel'
              ? `/api/documents/${documentId}/cancel`
              : action === 'submit'
                ? `/api/documents/${documentId}/submit`
                : action === 'discard'
                  ? `/api/documents/${documentId}`
                  : `/api/documents/${documentId}/approve`

        const method = action === 'discard' ? 'DELETE' : 'POST'

        const res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, comment, userId }),
        })

        if (res.ok) {
          if (action === 'discard') {
            router.push('/documents')
          } else {
            router.refresh()
          }
        } else {
          const body = await res.json().catch(() => ({}))
          alert(body.message ?? '処理に失敗しました。')
        }
      } catch (error) {
        console.error(`[DocumentActions] ${action} エラー:`, error)
        alert('通信エラーが発生しました。')
      } finally {
        setLoading(false)
      }
    },
    [documentId, userId, router]
  )

  // ============================================================
  // 取消処理（CancelDialog から呼ばれる）
  // ============================================================
  const handleCancel = useCallback(
    (reason: string) => {
      executeAction('cancel', reason)
      setShowCancelDialog(false)
    },
    [executeAction]
  )

  // ============================================================
  // ステータス別のアクションボタンをレンダリング
  // ============================================================

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {/* ================================================================ */}
        {/* draft: 編集・申請・破棄 */}
        {/* ================================================================ */}
        {status === 'draft' && isOwner && (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/documents/${documentId}/revise`}>
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                編集
              </Link>
            </Button>

            <Button
              size="sm"
              disabled={loading}
              onClick={() => executeAction('submit')}
            >
              {loading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              申請する
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="text-gray-500 hover:text-red-600 hover:border-red-300"
              onClick={() => setShowDiscardDialog(true)}
              disabled={loading}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              破棄
            </Button>

            {/* 破棄確認ダイアログ */}
            <ConfirmDialog
              title="文書を破棄しますか？"
              description="この文書を完全に削除します。この操作は元に戻せません。"
              confirmLabel="破棄する"
              confirmClassName="bg-red-600 hover:bg-red-700 text-white"
              onConfirm={() => {
                executeAction('discard')
                setShowDiscardDialog(false)
              }}
              open={showDiscardDialog}
              onOpenChange={setShowDiscardDialog}
            />
          </>
        )}

        {/* ================================================================ */}
        {/* pending_confirm: 確認・差戻し（確認者用） */}
        {/* ================================================================ */}
        {status === 'pending_confirm' && (
          <>
            <Button
              size="sm"
              disabled={loading}
              onClick={() => setShowConfirmDialog(true)}
            >
              {loading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              )}
              確認完了
            </Button>

            <Button
              variant="destructive"
              size="sm"
              disabled={loading}
              onClick={() => setShowRejectDialog(true)}
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" />
              差戻し
            </Button>

            {/* 確認完了ダイアログ */}
            <ConfirmDialog
              title="確認を完了しますか？"
              description="この文書の確認を完了し、次の承認ステップに進めます。"
              confirmLabel="確認完了"
              confirmClassName="bg-emerald-600 hover:bg-emerald-700 text-white"
              showComment
              commentPlaceholder="確認コメント（任意）"
              onConfirm={(comment) => {
                executeAction('confirm', comment)
                setShowConfirmDialog(false)
              }}
              open={showConfirmDialog}
              onOpenChange={setShowConfirmDialog}
            />

            {/* 差戻しダイアログ */}
            <ConfirmDialog
              title="文書を差し戻しますか？"
              description="作成者に修正を依頼します。差戻し理由を入力してください。"
              confirmLabel="差し戻す"
              confirmClassName="bg-red-600 hover:bg-red-700 text-white"
              showComment
              commentRequired
              commentPlaceholder="差戻し理由を入力してください..."
              onConfirm={(comment) => {
                executeAction('return', comment)
                setShowRejectDialog(false)
              }}
              open={showRejectDialog}
              onOpenChange={setShowRejectDialog}
            />
          </>
        )}

        {/* ================================================================ */}
        {/* returned: 差戻し理由 + 修正・再申請（作成者用） */}
        {/* ================================================================ */}
        {status === 'returned' && isOwner && (
          <>
            <Button size="sm" asChild>
              <Link href={`/documents/${documentId}/revise`}>
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                修正する
              </Link>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="text-gray-500 hover:text-red-600 hover:border-red-300"
              onClick={() => setShowDiscardDialog(true)}
              disabled={loading}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              破棄
            </Button>

            <ConfirmDialog
              title="文書を破棄しますか？"
              description="差し戻された文書を完全に削除します。この操作は元に戻せません。"
              confirmLabel="破棄する"
              confirmClassName="bg-red-600 hover:bg-red-700 text-white"
              onConfirm={() => {
                executeAction('discard')
                setShowDiscardDialog(false)
              }}
              open={showDiscardDialog}
              onOpenChange={setShowDiscardDialog}
            />
          </>
        )}

        {/* ================================================================ */}
        {/* pending_approval: 承認・差戻し（承認者用） */}
        {/* ================================================================ */}
        {status === 'pending_approval' && (
          <>
            <Button
              size="sm"
              disabled={loading}
              onClick={() => setShowApproveDialog(true)}
            >
              {loading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              )}
              承認
            </Button>

            <Button
              variant="destructive"
              size="sm"
              disabled={loading}
              onClick={() => setShowRejectDialog(true)}
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" />
              差戻し
            </Button>

            {/* 承認ダイアログ */}
            <ConfirmDialog
              title="文書を承認しますか？"
              description="この文書を承認します。承認後は発行処理に進みます。"
              confirmLabel="承認する"
              confirmClassName="bg-emerald-600 hover:bg-emerald-700 text-white"
              showComment
              commentPlaceholder="承認コメント（任意）"
              onConfirm={(comment) => {
                executeAction('approve', comment)
                setShowApproveDialog(false)
              }}
              open={showApproveDialog}
              onOpenChange={setShowApproveDialog}
            />

            {/* 差戻しダイアログ */}
            <ConfirmDialog
              title="文書を差し戻しますか？"
              description="作成者に修正を依頼します。差戻し理由を入力してください。"
              confirmLabel="差し戻す"
              confirmClassName="bg-red-600 hover:bg-red-700 text-white"
              showComment
              commentRequired
              commentPlaceholder="差戻し理由を入力してください..."
              onConfirm={(comment) => {
                executeAction('return', comment)
                setShowRejectDialog(false)
              }}
              open={showRejectDialog}
              onOpenChange={setShowRejectDialog}
            />
          </>
        )}

        {/* ================================================================ */}
        {/* approved: 発行（発行担当者用） */}
        {/* ================================================================ */}
        {status === 'approved' && (
          <>
            <Button
              size="sm"
              disabled={loading}
              onClick={() => setShowIssueDialog(true)}
            >
              {loading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="mr-1.5 h-3.5 w-3.5" />
              )}
              発行する
            </Button>

            {/* 発行確認ダイアログ */}
            <ConfirmDialog
              title="文書を発行しますか？"
              description="この文書を正式に発行します。発行後は編集できなくなります。文書番号が採番され、PDFが生成されます。"
              confirmLabel="発行する"
              confirmClassName="bg-blue-600 hover:bg-blue-700 text-white"
              onConfirm={() => {
                executeAction('issue')
                setShowIssueDialog(false)
              }}
              open={showIssueDialog}
              onOpenChange={setShowIssueDialog}
            />
          </>
        )}

        {/* ================================================================ */}
        {/* issued: PDF確認・再発行・取消 */}
        {/* ================================================================ */}
        {status === 'issued' && (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/api/documents/${documentId}/pdf`}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                PDF ダウンロード
              </Link>
            </Button>

            <Button variant="outline" size="sm" asChild>
              <Link href={`/documents/${documentId}/reissue`}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                再発行
              </Link>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              disabled={loading}
              onClick={() => setShowCancelDialog(true)}
            >
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
              取消
            </Button>

            {/* 取消ダイアログ（文書番号の確認入力付き） */}
            <CancelDocumentDialog
              documentNumber={documentNumber}
              onConfirm={handleCancel}
              open={showCancelDialog}
              onOpenChange={setShowCancelDialog}
            />
          </>
        )}

        {/* ================================================================ */}
        {/* cancelled: 読取専用 + 取消理由表示 */}
        {/* ================================================================ */}
        {status === 'cancelled' && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Eye className="h-4 w-4" />
            <span>この文書は取消されています（読取専用）</span>
          </div>
        )}

        {/* ================================================================ */}
        {/* expired: 読取専用 */}
        {/* ================================================================ */}
        {status === 'expired' && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Eye className="h-4 w-4" />
            <span>この文書は期限切れです（読取専用）</span>
          </div>
        )}
      </div>
    </div>
  )
}
