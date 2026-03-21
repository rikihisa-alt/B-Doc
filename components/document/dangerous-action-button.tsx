'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Loader2 } from 'lucide-react'

interface DangerousActionButtonProps {
  /** 対象文書ID */
  documentId: string
  /** アクション種別（APIエンドポイントに対応） */
  action: string
  /** ボタンラベル */
  label: string
  /** 確認ダイアログの説明文 */
  description: string
  /** ボタンアイコン */
  icon?: React.ReactNode
}

/**
 * 危険な操作（却下・アーカイブ等）用の確認ダイアログ付きボタン
 * AlertDialog で確認後、APIを呼び出して処理を実行する
 */
export function DangerousActionButton({
  documentId,
  action,
  label,
  description,
  icon,
}: DangerousActionButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  /** 確認後のアクション実行 */
  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/${action}`, {
        method: 'POST',
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.message ?? '処理に失敗しました。')
        return
      }

      // ページをリロードして最新状態を反映
      router.refresh()
    } catch (error) {
      console.error(`[DangerousAction] ${action} エラー:`, error)
      alert('通信エラーが発生しました。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            icon
          )}
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確認</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
