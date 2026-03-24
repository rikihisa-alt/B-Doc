'use client'

// =============================================================================
// B-Doc 再発行申請ページ
// 発行済み文書の再発行理由を入力し、元の内容をプリフィルした新文書を作成
// 変更内容の追跡表示あり。localStorage ストアを使用
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getDocument,
  saveDocument,
  createDocument,
  addAuditLog,
} from '@/lib/store'
import type { LocalDocument } from '@/lib/store'
import { DOCUMENT_STATUS } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import type { TemplateVariable } from '@/types'
import {
  ArrowLeft,
  RotateCcw,
  Loader2,
  AlertTriangle,
  FileText,
} from 'lucide-react'

/** 再発行理由の最小文字数 */
const MIN_REASON_LENGTH = 10

export default function ReissueDocumentPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const originalDocId = params.id

  // ---------- 再発行理由 ----------
  const [reason, setReason] = useState('')

  // ---------- フォーム状態 ----------
  const [title, setTitle] = useState('')
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({})
  const [originalDoc, setOriginalDoc] = useState<LocalDocument | null>(null)

  // ---------- UI状態 ----------
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  /** 再発行理由のバリデーション */
  const isReasonValid = reason.trim().length >= MIN_REASON_LENGTH

  // ---------- テンプレート変数（ストアのvaluesキーから復元） ----------
  const templateVariables = useMemo<TemplateVariable[]>(() => {
    if (!originalDoc) return []
    return Object.keys(originalDoc.values).map((key) => ({
      name: key,
      label: key,
      type: 'text' as const,
      required: false,
      default_value: null,
      placeholder: null,
      help_text: null,
      validation: null,
      options: null,
      display_order: 0,
      visible_condition: null,
    }))
  }, [originalDoc])

  /** 変更されたフィールドの検出 */
  const changedFields = useMemo(() => {
    const changed = new Set<string>()
    for (const [key, value] of Object.entries(formValues)) {
      if (originalValues[key] !== value) {
        changed.add(key)
      }
    }
    return changed
  }, [formValues, originalValues])

  // ============================================================
  // 元文書データの読み込み
  // ============================================================
  useEffect(() => {
    setIsLoading(true)
    try {
      // 元文書を取得
      const doc = getDocument(originalDocId)
      if (!doc) {
        router.push('/documents')
        return
      }

      // 発行済み/送付済みでなければリダイレクト
      if (doc.status !== DOCUMENT_STATUS.ISSUED && doc.status !== DOCUMENT_STATUS.SENT) {
        router.push(`/documents/${originalDocId}`)
        return
      }

      setOriginalDoc(doc)
      setTitle(doc.title)
      setFormValues({ ...doc.values })
      setOriginalValues({ ...doc.values })
    } catch (error) {
      // エラー時は一覧へ遷移
      router.push('/documents')
    } finally {
      setIsLoading(false)
    }
  }, [originalDocId, router])

  // ============================================================
  // フィールド変更
  // ============================================================
  const handleFieldChange = useCallback((name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  // ============================================================
  // 再発行申請処理
  // ============================================================
  const handleSubmit = useCallback(() => {
    if (!isReasonValid || !originalDoc) return

    // バリデーション
    const missingFields: string[] = []
    if (!title.trim()) missingFields.push('タイトル')
    for (const v of templateVariables) {
      if (v.required && !formValues[v.name]?.trim()) {
        missingFields.push(v.label)
      }
    }
    if (missingFields.length > 0) {
      alert(`以下の必須項目を入力してください:\n${missingFields.join('\n')}`)
      return
    }

    setIsSubmitting(true)
    try {
      // 新しい文書を作成（再発行として）
      const newDoc = createDocument({
        template_id: originalDoc.template_id,
        title: `[再発行] ${title}`,
        document_type: originalDoc.document_type,
        status: DOCUMENT_STATUS.PENDING_APPROVAL,
        confidentiality: originalDoc.confidentiality,
        values: { ...formValues },
        body_template: originalDoc.body_template,
      })

      // 元文書のステータスを「取消」に変更
      saveDocument({
        ...originalDoc,
        status: DOCUMENT_STATUS.CANCELLED,
        cancel_reason: `再発行のため取消（再発行文書ID: ${newDoc.id}）`,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      // 元文書の監査ログ
      addAuditLog({
        user_name: 'デモユーザー',
        user_role: 'creator',
        target_type: 'document',
        target_id: originalDocId,
        target_label: originalDoc.title,
        operation: 'reissue_original',
        before_value: { status: originalDoc.status },
        after_value: { status: DOCUMENT_STATUS.CANCELLED, reissued_to: newDoc.id },
        success: true,
        comment: `再発行理由: ${reason}`,
      })

      // 新文書の監査ログ
      addAuditLog({
        user_name: 'デモユーザー',
        user_role: 'creator',
        target_type: 'document',
        target_id: newDoc.id,
        target_label: newDoc.title,
        operation: 'reissue_create',
        before_value: null,
        after_value: {
          status: DOCUMENT_STATUS.PENDING_APPROVAL,
          original_document_id: originalDocId,
          original_document_number: originalDoc.document_number,
        },
        success: true,
        comment: `再発行理由: ${reason}（元文書: ${originalDoc.document_number ?? originalDocId}）`,
      })

      // 新しい文書の詳細ページへ遷移
      router.push(`/documents/${newDoc.id}`)
    } catch (error) {
      alert('再発行申請に失敗しました。')
    } finally {
      setIsSubmitting(false)
    }
  }, [isReasonValid, title, templateVariables, formValues, originalDoc, originalDocId, reason, router])

  // ============================================================
  // ローディング
  // ============================================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // ============================================================
  // レンダリング
  // ============================================================
  return (
    <div className="flex min-h-screen flex-col">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link
              href={`/documents/${originalDocId}`}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              元の文書へ戻る
            </Link>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-gray-900">再発行申請</h1>
              <Badge variant="outline" className="text-xs">
                <FileText className="mr-1 h-3 w-3" />
                元文書: {originalDoc?.document_number ?? originalDocId}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* 再発行理由（必須） */}
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                再発行理由
                <span className="text-red-500">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="再発行の理由を具体的に記入してください（例: 対象者の氏名変更に伴う再発行）"
                rows={4}
                className="resize-none border-amber-200 bg-white focus-visible:ring-amber-400"
              />
              <div className="flex items-center justify-between text-xs">
                <span className={reason.trim().length >= MIN_REASON_LENGTH ? 'text-emerald-600' : 'text-gray-400'}>
                  {reason.trim().length} / {MIN_REASON_LENGTH} 文字以上必要
                </span>
              </div>
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                再発行すると元の文書は「取消」ステータスとなり、新しい文書が承認フローに提出されます。
              </div>
            </CardContent>
          </Card>

          {/* タイトル */}
          <div className="space-y-1.5">
            <Label htmlFor="doc-title" className="text-sm font-medium">
              文書タイトル <span className="text-red-500">*</span>
            </Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="文書タイトルを入力"
            />
          </div>

          {/* フォームフィールド（変更追跡表示付き） */}
          {templateVariables.map((variable) => {
            const isChanged = changedFields.has(variable.name)
            const value = formValues[variable.name] ?? variable.default_value ?? ''

            return (
              <div
                key={variable.name}
                className={`space-y-1.5 rounded-md p-3 transition-colors ${
                  isChanged ? 'bg-blue-50 ring-1 ring-blue-200' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <Label htmlFor={variable.name} className="text-sm">
                    {variable.label}
                    {variable.required && <span className="text-red-500 ml-0.5">*</span>}
                  </Label>
                  {isChanged && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      変更あり
                    </span>
                  )}
                </div>

                {variable.type === 'select' && variable.options ? (
                  <Select value={value} onValueChange={(v) => handleFieldChange(variable.name, v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={variable.placeholder ?? '選択してください'} />
                    </SelectTrigger>
                    <SelectContent>
                      {variable.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={variable.name}
                    type={variable.type === 'number' ? 'number' : variable.type === 'date' ? 'date' : 'text'}
                    value={value}
                    onChange={(e) => handleFieldChange(variable.name, e.target.value)}
                    placeholder={variable.placeholder ?? undefined}
                  />
                )}

                {isChanged && originalValues[variable.name] && (
                  <p className="text-xs text-gray-400">
                    元の値: {originalValues[variable.name]}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </main>

      {/* フッター */}
      <footer className="sticky bottom-0 z-30 border-t bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          <Link href={`/documents/${originalDocId}`}>
            <Button variant="outline" className="text-gray-500">
              キャンセル
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            {changedFields.size > 0 && (
              <span className="text-xs text-blue-600">{changedFields.size} 項目変更</span>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isSubmitting || !isReasonValid}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  再発行を申請する
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>再発行を申請しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    元の文書（{originalDoc?.document_number ?? originalDocId}）は「取消」となり、
                    新しい文書が承認フローに提出されます。
                    {changedFields.size > 0 && (
                      <span className="block mt-1 text-blue-600">
                        {changedFields.size} 項目が変更されています。
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>
                    再発行を申請する
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </footer>
    </div>
  )
}
