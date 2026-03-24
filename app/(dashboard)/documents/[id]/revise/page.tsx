'use client'

// =============================================================================
// B-Doc 文書修正ページ（差戻し後の修正・再申請）
// 差戻し理由を上部に表示し、既存値をプリフィル、変更フィールドをハイライト
// localStorage ストアを使用
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getDocument,
  saveDocument,
  getApprovalRecords,
  addAuditLog,
} from '@/lib/store'
import type { LocalDocument } from '@/lib/store'
import { DOCUMENT_STATUS } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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
  Save,
  Send,
  Loader2,
  AlertTriangle,
} from 'lucide-react'

export default function ReviseDocumentPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const documentId = params.id

  // ---------- フォーム状態 ----------
  const [title, setTitle] = useState('')
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({})
  const [originalDoc, setOriginalDoc] = useState<LocalDocument | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // ---------- 差戻し情報 ----------
  const [returnInfo, setReturnInfo] = useState<{
    returnerName: string
    comment: string
    returnedAt: string
  } | null>(null)

  // ---------- UI状態 ----------
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // ---------- テンプレート変数（簡易版） ----------
  const templateVariables = useMemo<TemplateVariable[]>(() => {
    // ストアの values キーからテンプレート変数を復元する
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
  // 文書データの読み込み
  // ============================================================
  useEffect(() => {
    setIsLoading(true)
    try {
      // 文書本体を取得
      const doc = getDocument(documentId)
      if (!doc) {
        router.push('/documents')
        return
      }

      // 差戻し状態でなければ詳細ページへリダイレクト
      if (doc.status !== DOCUMENT_STATUS.RETURNED) {
        router.push(`/documents/${documentId}`)
        return
      }

      setOriginalDoc(doc)
      setTitle(doc.title)
      setFormValues({ ...doc.values })
      setOriginalValues({ ...doc.values })

      // 差戻し理由の取得（最新の rejection レコード）
      const approvals = getApprovalRecords(documentId)
      const returnRecord = approvals
        .filter((a) => a.action === 'returned' || a.action === 'rejected')
        .sort((a, b) => new Date(b.acted_at).getTime() - new Date(a.acted_at).getTime())[0]

      if (returnRecord) {
        setReturnInfo({
          returnerName: returnRecord.approver_name,
          comment: returnRecord.comment || '差戻し理由の記載なし',
          returnedAt: new Date(returnRecord.acted_at).toLocaleString('ja-JP'),
        })
      }
    } catch (error) {
      // エラー時はドキュメント一覧へ遷移
      router.push('/documents')
    } finally {
      setIsLoading(false)
    }
  }, [documentId, router])

  // ============================================================
  // フィールド変更・バリデーション
  // ============================================================
  const handleFieldChange = useCallback((name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
    setHasUnsavedChanges(true)
  }, [])

  const validateField = useCallback((variable: TemplateVariable, value: string) => {
    if (variable.required && !value.trim()) {
      setFieldErrors((prev) => ({ ...prev, [variable.name]: `${variable.label}は必須項目です` }))
      return false
    }
    setFieldErrors((prev) => ({ ...prev, [variable.name]: '' }))
    return true
  }, [])

  // ============================================================
  // 下書き保存
  // ============================================================
  const saveDraft = useCallback(() => {
    if (isSaving || !originalDoc) return
    setIsSaving(true)
    try {
      // localStorageに文書を保存
      saveDocument({
        ...originalDoc,
        title,
        values: { ...formValues },
        updated_at: new Date().toISOString(),
      })
      setHasUnsavedChanges(false)
    } catch (error) {
      // 保存エラー（localStorage容量超過等）
    } finally {
      setIsSaving(false)
    }
  }, [title, formValues, originalDoc, isSaving])

  // ページ離脱警告
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedChanges])

  // ============================================================
  // 再申請処理
  // ============================================================
  const handleResubmit = useCallback(() => {
    if (!originalDoc) return

    // バリデーション
    const missingFields: string[] = []
    if (!title.trim()) missingFields.push('タイトル')
    for (const v of templateVariables) {
      if (v.required && !formValues[v.name]?.trim()) {
        missingFields.push(v.label)
        setFieldErrors((prev) => ({ ...prev, [v.name]: `${v.label}は必須項目です` }))
      }
    }
    if (missingFields.length > 0) {
      alert(`以下の必須項目を入力してください:\n${missingFields.join('\n')}`)
      return
    }

    setIsSubmitting(true)
    try {
      // 文書を更新してステータスを承認待ちに変更
      const updatedDoc: LocalDocument = {
        ...originalDoc,
        title,
        values: { ...formValues },
        status: DOCUMENT_STATUS.PENDING_APPROVAL,
        updated_at: new Date().toISOString(),
      }
      saveDocument(updatedDoc)

      // 監査ログを記録
      addAuditLog({
        user_name: 'デモユーザー',
        user_role: 'creator',
        target_type: 'document',
        target_id: documentId,
        target_label: title,
        operation: 'resubmit',
        before_value: { status: DOCUMENT_STATUS.RETURNED, values: originalValues },
        after_value: { status: DOCUMENT_STATUS.PENDING_APPROVAL, values: formValues },
        success: true,
        comment: `差戻し後の再申請（${changedFields.size}項目変更）`,
      })

      setHasUnsavedChanges(false)
      router.push(`/documents/${documentId}`)
    } catch (error) {
      alert('再申請に失敗しました。')
    } finally {
      setIsSubmitting(false)
    }
  }, [title, templateVariables, formValues, originalDoc, documentId, originalValues, changedFields.size, router])

  // ============================================================
  // ローディング表示
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
              href={`/documents/${documentId}`}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              詳細へ戻る
            </Link>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-gray-900">
                文書修正（差戻し対応）
              </h1>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                修正中
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* 差戻し通知（赤いボックス） */}
          {returnInfo && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-red-800">
                    差戻し通知
                  </h3>
                  <p className="text-sm text-red-700">
                    <span className="font-medium">{returnInfo.returnerName}</span> により差し戻されました
                    <span className="ml-2 text-xs text-red-500">({returnInfo.returnedAt})</span>
                  </p>
                  <div className="mt-2 rounded border border-red-200 bg-white px-3 py-2 text-sm text-red-800">
                    {returnInfo.comment}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* タイトル入力 */}
          <div className="space-y-1.5">
            <Label htmlFor="doc-title" className="text-sm font-medium">
              文書タイトル <span className="text-red-500">*</span>
            </Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setHasUnsavedChanges(true)
              }}
              onBlur={() => {
                if (!title.trim()) setFieldErrors((prev) => ({ ...prev, title: 'タイトルは必須です' }))
                else setFieldErrors((prev) => ({ ...prev, title: '' }))
              }}
              placeholder="文書タイトルを入力"
              className={fieldErrors.title ? 'border-red-400' : ''}
            />
            {fieldErrors.title && <p className="text-xs text-red-500">{fieldErrors.title}</p>}
          </div>

          {/* 動的フォームフィールド（変更ハイライト付き） */}
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
                {/* ラベル + 変更マーカー */}
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

                {/* 入力フィールド */}
                {variable.type === 'select' && variable.options ? (
                  <Select value={value} onValueChange={(v) => handleFieldChange(variable.name, v)}>
                    <SelectTrigger className={fieldErrors[variable.name] ? 'border-red-400' : ''}>
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
                    onBlur={() => validateField(variable, value)}
                    placeholder={variable.placeholder ?? undefined}
                    className={fieldErrors[variable.name] ? 'border-red-400' : ''}
                  />
                )}

                {/* エラーメッセージ */}
                {fieldErrors[variable.name] && (
                  <p className="text-xs text-red-500">{fieldErrors[variable.name]}</p>
                )}

                {/* 変更前の値（変更されている場合のみ表示） */}
                {isChanged && originalValues[variable.name] && (
                  <p className="text-xs text-gray-400">
                    変更前: {originalValues[variable.name]}
                  </p>
                )}
              </div>
            )
          })}

          {templateVariables.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-gray-400">入力項目がありません</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* フッター（固定） */}
      <footer className="sticky bottom-0 z-30 border-t bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          <Link href={`/documents/${documentId}`}>
            <Button variant="outline" className="text-gray-500">
              キャンセル
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            {/* 変更数表示 */}
            {changedFields.size > 0 && (
              <span className="text-xs text-blue-600">
                {changedFields.size} 項目変更
              </span>
            )}

            {/* 一時保存 */}
            <Button variant="outline" onClick={saveDraft} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              一時保存
            </Button>

            {/* 再申請ボタン + 確認ダイアログ */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  再申請する
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>修正内容を再申請しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    修正した文書が承認フローに再提出されます。
                    {changedFields.size > 0 && (
                      <span className="block mt-1 text-blue-600">
                        {changedFields.size} 項目が変更されています。
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResubmit}>
                    再申請する
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
