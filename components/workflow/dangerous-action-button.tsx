'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'

/** DangerousActionButton のアクション種別 */
type ActionType = 'approve' | 'reject' | 'issue' | 'cancel' | 'delete' | 'archive'

/** アクション種別ごとのデフォルト設定 */
const ACTION_DEFAULTS: Record<
  ActionType,
  {
    title: string
    description: string
    confirmLabel: string
    variant: 'default' | 'destructive'
  }
> = {
  approve: {
    title: '承認の確認',
    description: 'この文書を承認します。この操作は取り消せません。承認してよろしいですか？',
    confirmLabel: '承認する',
    variant: 'default',
  },
  reject: {
    title: '却下の確認',
    description: 'この文書を却下します。却下理由をコメントに記入してください。却下してよろしいですか？',
    confirmLabel: '却下する',
    variant: 'destructive',
  },
  issue: {
    title: '発行の確認',
    description: 'この文書を正式に発行します。文書番号が採番され、PDFが生成されます。発行してよろしいですか？',
    confirmLabel: '発行する',
    variant: 'default',
  },
  cancel: {
    title: '取消の確認',
    description: 'この操作を取り消します。変更内容は失われます。取り消してよろしいですか？',
    confirmLabel: '取り消す',
    variant: 'destructive',
  },
  delete: {
    title: '削除の確認',
    description: 'この文書を削除します。削除された文書は復元できません。削除してよろしいですか？',
    confirmLabel: '削除する',
    variant: 'destructive',
  },
  archive: {
    title: 'アーカイブの確認',
    description: 'この文書をアーカイブします。アーカイブ後も閲覧は可能です。アーカイブしてよろしいですか？',
    confirmLabel: 'アーカイブする',
    variant: 'default',
  },
}

interface DangerousActionButtonProps {
  /** アクション種別 */
  actionType: ActionType
  /** ボタンのラベル（省略時はactionTypeのデフォルト） */
  label?: string
  /** 確認ダイアログのタイトル（省略時はactionTypeのデフォルト） */
  dialogTitle?: string
  /** 確認ダイアログの説明文（省略時はactionTypeのデフォルト） */
  dialogDescription?: string
  /** 確認ボタンのテキスト（省略時はactionTypeのデフォルト） */
  confirmText?: string
  /** ボタンのバリアント（省略時はactionTypeのデフォルト） */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  /** ボタンサイズ */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** 確認後のコールバック */
  onConfirm: () => void | Promise<void>
  /** 無効状態 */
  disabled?: boolean
  /** ローディング状態 */
  loading?: boolean
  /** 追加CSSクラス */
  className?: string
  /** ボタン内のアイコン */
  icon?: React.ReactNode
}

/**
 * 危険な操作用の確認ダイアログ付きボタン
 * 承認・却下・発行・削除など、重要な操作の前にAlertDialogで確認を取る
 */
export function DangerousActionButton({
  actionType,
  label,
  dialogTitle,
  dialogDescription,
  confirmText,
  variant,
  size = 'default',
  onConfirm,
  disabled = false,
  loading = false,
  className,
  icon,
}: DangerousActionButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const defaults = ACTION_DEFAULTS[actionType]

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      await onConfirm()
    } finally {
      setIsProcessing(false)
    }
  }

  const isDisabled = disabled || loading || isProcessing

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant ?? defaults.variant}
          size={size}
          disabled={isDisabled}
          className={cn(className)}
        >
          {isProcessing || loading ? (
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            icon && <span className="mr-2">{icon}</span>
          )}
          {label ?? defaults.confirmLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {dialogTitle ?? defaults.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {dialogDescription ?? defaults.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={cn(
              (variant ?? defaults.variant) === 'destructive' &&
                'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            )}
          >
            {confirmText ?? defaults.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export type { DangerousActionButtonProps, ActionType }
