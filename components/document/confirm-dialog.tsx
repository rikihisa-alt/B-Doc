'use client'

import { useState, useCallback } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// =============================================================================
// 汎用確認ダイアログ
// 承認・差戻し・発行など、各種アクションで共通利用する確認ダイアログ
// =============================================================================

interface ConfirmDialogProps {
  /** ダイアログのタイトル */
  title: string
  /** ダイアログの説明文 */
  description: string
  /** 確認ボタンのラベル */
  confirmLabel: string
  /** 確認ボタンの追加クラス（色の制御に使用） */
  confirmClassName?: string
  /** コメント入力欄を表示するか */
  showComment?: boolean
  /** コメントのプレースホルダー */
  commentPlaceholder?: string
  /** コメントを必須にするか */
  commentRequired?: boolean
  /** 確定時のコールバック（コメントを引数に渡す） */
  onConfirm: (comment?: string) => void
  /** ダイアログの開閉状態 */
  open: boolean
  /** 開閉状態の変更ハンドラ */
  onOpenChange: (open: boolean) => void
}

/**
 * 汎用確認ダイアログ
 *
 * 各アクションに応じてボタンの色を変更可能:
 * - 承認: confirmClassName="bg-emerald-600 hover:bg-emerald-700 text-white"
 * - 差戻し: confirmClassName="bg-red-600 hover:bg-red-700 text-white"
 * - 発行: confirmClassName="bg-blue-600 hover:bg-blue-700 text-white"
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  confirmClassName,
  showComment = false,
  commentPlaceholder = 'コメントを入力...',
  commentRequired = false,
  onConfirm,
  open,
  onOpenChange,
}: ConfirmDialogProps) {
  const [comment, setComment] = useState('')

  /** コメントが必須の場合、空欄なら送信不可 */
  const canSubmit = !commentRequired || comment.trim().length > 0

  /** ダイアログを閉じるときにコメントをリセット */
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setComment('')
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange],
  )

  /** 確定処理 */
  const handleConfirm = useCallback(() => {
    if (!canSubmit) return
    onConfirm(showComment ? comment.trim() || undefined : undefined)
    setComment('')
  }, [canSubmit, showComment, comment, onConfirm])

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {/* コメント入力欄（オプション） */}
        {showComment && (
          <div className="space-y-2 py-2">
            <Label htmlFor="confirm-comment" className="text-sm font-medium text-gray-700">
              コメント
              {commentRequired && (
                <span className="ml-1 text-xs text-red-500">*必須</span>
              )}
            </Label>
            <Textarea
              id="confirm-comment"
              placeholder={commentPlaceholder}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canSubmit}
            className={cn(
              confirmClassName,
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
