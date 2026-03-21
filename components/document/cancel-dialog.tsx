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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// =============================================================================
// 文書取消ダイアログ
// 最も危険な操作のため、GitHub リポジトリ削除と同様の二重確認を要求する
// =============================================================================

interface CancelDocumentDialogProps {
  /** 取消対象の文書番号（確認入力に使用） */
  documentNumber: string
  /** 取消確定時のコールバック（理由を引数に渡す） */
  onConfirm: (reason: string) => void
  /** ダイアログの開閉状態 */
  open: boolean
  /** 開閉状態の変更ハンドラ */
  onOpenChange: (open: boolean) => void
}

/** 取消理由の最小文字数 */
const MIN_REASON_LENGTH = 10

/**
 * 文書取消確認ダイアログ
 *
 * 以下の2つの条件を満たさない限り実行ボタンが有効にならない:
 * 1. 取消理由が10文字以上入力されている
 * 2. 文書番号が正確に一致する確認入力
 */
export function CancelDocumentDialog({
  documentNumber,
  onConfirm,
  open,
  onOpenChange,
}: CancelDocumentDialogProps) {
  const [reason, setReason] = useState('')
  const [confirmInput, setConfirmInput] = useState('')

  /** 両方の条件を満たしているか */
  const isReasonValid = reason.trim().length >= MIN_REASON_LENGTH
  const isConfirmMatch = confirmInput === documentNumber
  const canSubmit = isReasonValid && isConfirmMatch

  /** ダイアログを閉じるときにフォームをリセット */
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setReason('')
        setConfirmInput('')
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange],
  )

  /** 取消実行 */
  const handleConfirm = useCallback(() => {
    if (!canSubmit) return
    onConfirm(reason.trim())
    setReason('')
    setConfirmInput('')
  }, [canSubmit, reason, onConfirm])

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="border-red-300 sm:max-w-md">
        <AlertDialogHeader>
          {/* 赤色の警告ヘッダー */}
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-5 w-5 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <AlertDialogTitle className="text-red-900">
              文書の取消
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-red-700">
            この操作は取り消せません。文書を取消すると、以降の編集・発行・送付はできなくなります。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {/* 取消理由の入力 */}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason" className="text-sm font-medium text-gray-700">
              取消理由
              <span className="ml-1 text-xs text-gray-500">（{MIN_REASON_LENGTH}文字以上）</span>
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="取消の理由を具体的に記入してください..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={cn(
                'min-h-[100px] resize-none border-red-200 focus-visible:ring-red-400',
                !isReasonValid && reason.length > 0 && 'border-red-400',
              )}
            />
            {/* 文字数カウンター */}
            <p className="text-right text-xs text-gray-400">
              {reason.trim().length} / {MIN_REASON_LENGTH} 文字以上
            </p>
          </div>

          {/* 文書番号の確認入力 */}
          <div className="space-y-2">
            <Label htmlFor="cancel-confirm" className="text-sm font-medium text-gray-700">
              確認のため文書番号を入力してください
            </Label>
            <p className="text-xs text-gray-500">
              以下の文書番号を正確に入力:
              <code className="ml-1 rounded bg-red-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-red-800">
                {documentNumber}
              </code>
            </p>
            <Input
              id="cancel-confirm"
              placeholder={documentNumber}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className={cn(
                'font-mono border-red-200 focus-visible:ring-red-400',
                confirmInput.length > 0 && !isConfirmMatch && 'border-red-400 bg-red-50',
                isConfirmMatch && 'border-emerald-400 bg-emerald-50',
              )}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canSubmit}
            className={cn(
              'bg-red-700 text-white hover:bg-red-800',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            文書を取消する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
