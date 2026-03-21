'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Edit, Send, CheckCircle, XCircle, FileText, Ban } from 'lucide-react'
import type { DocumentStatus } from '@/types'

interface DocumentActionsProps {
  documentId: string
  status: DocumentStatus
  isOwner: boolean
}

export function DocumentActions({ documentId, status, isOwner }: DocumentActionsProps) {
  const router = useRouter()
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAction = async (action: string) => {
    setLoading(true)
    try {
      const endpoint = action === 'issue'
        ? `/api/documents/${documentId}/issue`
        : `/api/documents/${documentId}/approve`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment }),
      })

      if (res.ok) {
        router.refresh()
      }
    } catch {
      // エラー処理
    } finally {
      setLoading(false)
      setComment('')
    }
  }

  const actions = getActions(status, isOwner)
  if (actions.length === 0) return null

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* コメント欄（承認/差戻し時） */}
        {['pending_confirm', 'pending_approval', 'approved'].includes(status) && (
          <div>
            <Textarea
              placeholder="コメント（任意）"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {actions.map((action) =>
            action.dangerous ? (
              <AlertDialog key={action.key}>
                <AlertDialogTrigger asChild>
                  <Button variant={action.variant} disabled={loading}>
                    {action.icon}
                    {action.label}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>確認</AlertDialogTitle>
                    <AlertDialogDescription>{action.confirmText}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAction(action.key)}>
                      実行する
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                key={action.key}
                variant={action.variant}
                disabled={loading}
                onClick={() => {
                  if (action.key === 'edit') {
                    router.push(`/dashboard/documents/${documentId}/edit`)
                  } else {
                    handleAction(action.key)
                  }
                }}
              >
                {action.icon}
                {action.label}
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface ActionConfig {
  key: string
  label: string
  variant: 'default' | 'outline' | 'destructive' | 'secondary'
  icon: React.ReactNode
  dangerous: boolean
  confirmText: string
}

function getActions(status: DocumentStatus, isOwner: boolean): ActionConfig[] {
  const actions: ActionConfig[] = []

  switch (status) {
    case 'draft':
    case 'returned':
      if (isOwner) {
        actions.push({
          key: 'edit', label: '編集', variant: 'outline',
          icon: <Edit className="mr-2 h-4 w-4" />, dangerous: false, confirmText: '',
        })
        actions.push({
          key: 'submit', label: '承認申請', variant: 'default',
          icon: <Send className="mr-2 h-4 w-4" />, dangerous: false, confirmText: '',
        })
      }
      break
    case 'pending_confirm':
    case 'pending_approval':
      actions.push({
        key: 'approve', label: '承認', variant: 'default',
        icon: <CheckCircle className="mr-2 h-4 w-4" />, dangerous: false, confirmText: '',
      })
      actions.push({
        key: 'reject', label: '差戻し', variant: 'destructive',
        icon: <XCircle className="mr-2 h-4 w-4" />, dangerous: true,
        confirmText: 'この文書を差し戻しますか？',
      })
      break
    case 'approved':
      actions.push({
        key: 'issue', label: '発行', variant: 'default',
        icon: <FileText className="mr-2 h-4 w-4" />, dangerous: true,
        confirmText: 'この文書を発行しますか？発行後は編集できなくなります。',
      })
      break
    case 'issued':
      actions.push({
        key: 'cancel', label: '取消', variant: 'destructive',
        icon: <Ban className="mr-2 h-4 w-4" />, dangerous: true,
        confirmText: 'この文書を取り消しますか？この操作は元に戻せません。',
      })
      break
  }

  return actions
}
