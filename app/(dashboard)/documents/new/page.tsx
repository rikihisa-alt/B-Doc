'use client'

// =============================================================================
// B-Doc 新規文書作成ページ（ストアベース版）
// 左カラム: 入力フォーム（40%）
// 右カラム: A4プレビュー（60%）
// =============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
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
import { ReturnNotice } from '@/components/document/return-notice'
import { A4Preview } from '@/components/document/a4-preview'
import type { TemplateVariable, ValidationError } from '@/types'
import {
  getTemplates,
  getTemplate,
  createDocument,
  saveDocument as storeDocSave,
  getDocument,
  getApprovalRecords,
  addAuditLog,
} from '@/lib/store'
import type { LocalTemplate, LocalDocument } from '@/lib/store'
import {
  ArrowLeft,
  Save,
  Send,
  Trash2,
  Loader2,
  AlertTriangle,
  ArrowDown,
  Circle,
} from 'lucide-react'

// =============================================================================
// 定数
// =============================================================================

/** 提出前チェックリスト項目 */
const PRE_SUBMIT_CHECKLIST = [
  { key: 'name_check', label: '氏名に誤字がないことを確認しました' },
  { key: 'date_check', label: '日付が正確であることを確認しました' },
  { key: 'content_check', label: '文書内容に誤りがないことを確認しました' },
  { key: 'recipient_check', label: '宛先情報が正しいことを確認しました' },
] as const

// =============================================================================
// テンプレート変数をセクション分割するヘルパー
// =============================================================================

interface VariableSection {
  title: string
  variables: LocalTemplate['variables']
}

/** テンプレート変数をセクションごとにグループ化する */
function groupVariablesBySection(variables: LocalTemplate['variables']): VariableSection[] {
  const sectionMap: Record<string, string> = {
    target_: '対象者情報',
    recipient_: '宛先情報',
    company_: '会社情報',
    date_: '日付情報',
    amount_: '金額情報',
    detail_: '詳細情報',
  }

  const sections: Record<string, LocalTemplate['variables']> = {}
  const general: LocalTemplate['variables'] = []

  for (const v of variables) {
    let matched = false
    for (const [prefix, sectionTitle] of Object.entries(sectionMap)) {
      if (v.key.startsWith(prefix)) {
        if (!sections[sectionTitle]) sections[sectionTitle] = []
        sections[sectionTitle].push(v)
        matched = true
        break
      }
    }
    if (!matched) {
      general.push(v)
    }
  }

  const result: VariableSection[] = []
  if (general.length > 0) {
    result.push({ title: '基本情報', variables: general })
  }
  for (const [title, vars] of Object.entries(sections)) {
    result.push({ title, variables: vars })
  }
  return result
}

// =============================================================================
// メインコンポーネント
// =============================================================================

export default function NewDocumentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL パラメータからテンプレートIDと差戻し文書IDを取得
  const initialTemplateId = searchParams.get('template_id') ?? ''
  const returnedDocId = searchParams.get('returned_from') ?? null

  // ---------- フォーム状態 ----------
  const [title, setTitle] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId)
  const [templates, setTemplates] = useState<LocalTemplate[]>([])
  const [templateVariables, setTemplateVariables] = useState<LocalTemplate['variables']>([])
  const [bodyTemplate, setBodyTemplate] = useState('')
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})

  // ---------- 差戻し情報 ----------
  const [returnComment, setReturnComment] = useState<string | null>(null)
  const [returnerName, setReturnerName] = useState<string>('')
  const [returnerRole, setReturnerRole] = useState<string>('')
  const [returnedAt, setReturnedAt] = useState<string>('')

  // ---------- UI状態 ----------
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDiscarding, setIsDiscarding] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [draftId, setDraftId] = useState<string | null>(returnedDocId)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)

  const returnNoticeRef = useRef<HTMLDivElement>(null)

  // 現在のテンプレート名
  const selectedTemplateName = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId)?.name ?? '',
    [templates, selectedTemplateId]
  )

  // セクション分割された変数
  const variableSections = useMemo(
    () => groupVariablesBySection(templateVariables),
    [templateVariables]
  )

  // チェックリスト全完了判定
  const isChecklistComplete = useMemo(
    () => PRE_SUBMIT_CHECKLIST.every((item) => checklist[item.key]),
    [checklist]
  )

  // ============================================================
  // テンプレート一覧の取得
  // ============================================================
  useEffect(() => {
    const allTemplates = getTemplates()
    setTemplates(allTemplates.filter((t) => t.is_published))
  }, [])

  // ============================================================
  // テンプレート選択時: 変数定義と本文テンプレートを取得
  // ============================================================
  const loadTemplateVersion = useCallback((templateId: string) => {
    if (!templateId) {
      setTemplateVariables([])
      setBodyTemplate('')
      return
    }

    const tpl = getTemplate(templateId)
    if (tpl) {
      setTemplateVariables(tpl.variables)
      setBodyTemplate(tpl.body_template)

      // デフォルト値を設定（既存フォーム値がない場合のみ）
      setFormValues((prev) => {
        if (Object.keys(prev).length > 0) return prev
        const defaults: Record<string, string> = {}
        for (const v of tpl.variables) {
          if (v.options && v.options.length > 0) {
            // selectタイプの場合、最初のオプションをデフォルト値にはしない
          }
        }
        return defaults
      })
    }
  }, [])

  // ============================================================
  // 差戻し文書の読み込み
  // ============================================================
  useEffect(() => {
    if (!returnedDocId) return

    const doc = getDocument(returnedDocId)
    if (!doc) return

    setTitle(doc.title)
    setSelectedTemplateId(doc.template_id ?? '')
    setFormValues(doc.values)

    // 差戻し理由の取得
    const records = getApprovalRecords(returnedDocId)
    const returnRecord = records
      .filter((r) => r.action === 'returned' || r.action === 'rejected')
      .sort((a, b) => new Date(b.acted_at).getTime() - new Date(a.acted_at).getTime())[0]

    if (returnRecord) {
      setReturnComment(returnRecord.comment || '理由の記載なし')
      setReturnerName(returnRecord.approver_name)
      setReturnerRole('承認者')
      setReturnedAt(new Date(returnRecord.acted_at).toLocaleString('ja-JP'))
    }

    // テンプレート変数をロード
    if (doc.template_id) {
      loadTemplateVersion(doc.template_id)
    }
  }, [returnedDocId, loadTemplateVersion])

  // ============================================================
  // テンプレート変更ハンドラ
  // ============================================================
  const handleTemplateChange = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId)
      setFormValues({})
      setFieldErrors({})
      loadTemplateVersion(templateId)
      setHasUnsavedChanges(true)
    },
    [loadTemplateVersion]
  )

  // ============================================================
  // 初期テンプレートの自動ロード
  // ============================================================
  useEffect(() => {
    if (initialTemplateId && !returnedDocId) {
      loadTemplateVersion(initialTemplateId)
    }
  }, [initialTemplateId, returnedDocId, loadTemplateVersion])

  // ============================================================
  // フィールド変更ハンドラ
  // ============================================================
  const handleFieldChange = useCallback((name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
    setHasUnsavedChanges(true)
  }, [])

  // ============================================================
  // onBlur バリデーション
  // ============================================================
  const validateField = useCallback(
    (variable: LocalTemplate['variables'][0], value: string) => {
      const errors: string[] = []

      if (variable.required && !value.trim()) {
        errors.push(`${variable.label}は必須項目です`)
      }

      setFieldErrors((prev) => ({
        ...prev,
        [variable.key]: errors[0] ?? '',
      }))

      return errors.length === 0
    },
    []
  )

  // ============================================================
  // 全フィールドバリデーション
  // ============================================================
  const validateAllFields = useCallback((): ValidationError[] => {
    const errors: ValidationError[] = []

    if (!title.trim()) {
      errors.push({ field: 'title', message: 'タイトルは必須です', type: 'required' })
    }

    if (!selectedTemplateId) {
      errors.push({ field: 'template_id', message: 'テンプレートを選択してください', type: 'required' })
    }

    for (const variable of templateVariables) {
      const value = formValues[variable.key] ?? ''
      if (variable.required && !value.trim()) {
        errors.push({
          field: variable.key,
          message: `${variable.label}は必須項目です`,
          type: 'required',
        })
      }
    }

    const newFieldErrors: Record<string, string> = {}
    for (const err of errors) {
      if (err.field !== 'title' && err.field !== 'template_id') {
        newFieldErrors[err.field] = err.message
      }
    }
    setFieldErrors(newFieldErrors)

    return errors
  }, [title, selectedTemplateId, templateVariables, formValues])

  // ============================================================
  // 下書き保存
  // ============================================================
  const saveDraft = useCallback(() => {
    if (isSaving) return

    setIsSaving(true)
    try {
      const tpl = selectedTemplateId ? getTemplate(selectedTemplateId) : null

      if (draftId) {
        // 既存文書を更新
        const existing = getDocument(draftId)
        if (existing) {
          storeDocSave({
            ...existing,
            title: title || '無題の文書',
            template_id: selectedTemplateId || null,
            values: formValues,
            body_template: bodyTemplate,
            document_type: tpl?.document_type ?? existing.document_type,
          })
        }
      } else {
        // 新規文書を作成
        const newDoc = createDocument({
          title: title || '無題の文書',
          template_id: selectedTemplateId || null,
          document_type: tpl?.document_type ?? 'employment_cert',
          values: formValues,
          body_template: bodyTemplate,
        })
        setDraftId(newDoc.id)
      }

      setLastSavedAt(new Date())
      setHasUnsavedChanges(false)
    } finally {
      setIsSaving(false)
    }
  }, [title, selectedTemplateId, bodyTemplate, formValues, draftId, isSaving])

  // ============================================================
  // ページ離脱警告
  // ============================================================
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // ============================================================
  // 破棄処理
  // ============================================================
  const handleDiscard = useCallback(() => {
    setIsDiscarding(true)
    try {
      setHasUnsavedChanges(false)
      router.push('/documents')
    } finally {
      setIsDiscarding(false)
    }
  }, [router])

  // ============================================================
  // 申請処理
  // ============================================================
  const handleSubmit = useCallback(() => {
    const errors = validateAllFields()
    if (errors.length > 0) {
      setShowSubmitConfirm(false)
      return
    }

    if (!isChecklistComplete) {
      setShowSubmitConfirm(false)
      return
    }

    setIsSubmitting(true)
    try {
      // まず下書き保存
      saveDraft()

      const currentDraftId = draftId
      if (!currentDraftId) {
        alert('文書の保存に失敗しました。')
        return
      }

      // ステータスを承認待ちに変更
      const existing = getDocument(currentDraftId)
      if (existing) {
        storeDocSave({
          ...existing,
          status: 'pending_approval',
        })

        // 監査ログ追加
        addAuditLog({
          user_name: 'デモユーザー',
          user_role: 'creator',
          target_type: 'document',
          target_id: currentDraftId,
          target_label: existing.title,
          operation: 'status_change',
          before_value: { status: 'draft' },
          after_value: { status: 'pending_approval' },
          success: true,
          comment: null,
        })
      }

      setHasUnsavedChanges(false)
      router.push(`/documents/${currentDraftId}`)
    } catch {
      alert('申請に失敗しました。再度お試しください。')
    } finally {
      setIsSubmitting(false)
      setShowSubmitConfirm(false)
    }
  }, [validateAllFields, isChecklistComplete, saveDraft, draftId, router])

  // 差戻し理由スクロール
  const scrollToReturnNotice = useCallback(() => {
    returnNoticeRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

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
              href="/documents"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              一覧へ
            </Link>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-gray-900">
                {selectedTemplateName || '新規文書'}
              </h1>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                作成中
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 自動保存インジケーター */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                  <span>保存中...</span>
                </>
              ) : lastSavedAt ? (
                <>
                  <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                  <span>
                    保存済み:{' '}
                    {lastSavedAt.toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <Circle className="h-2 w-2 fill-amber-500 text-amber-500" />
                  <span>未保存の変更あり</span>
                </>
              ) : null}
            </div>

            {/* テンプレート変更ボタン */}
            {!returnedDocId && (
              <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                <SelectTrigger className="h-8 w-[200px] text-xs">
                  <SelectValue placeholder="テンプレートを変更" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {returnComment && (
              <Button
                variant="outline"
                size="sm"
                className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                onClick={scrollToReturnNotice}
              >
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                差戻し理由を確認する
                <ArrowDown className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* メインコンテンツ: 2カラムレイアウト */}
      <main className="flex-1 overflow-hidden">
        <div className="grid h-full grid-cols-1 lg:grid-cols-5">
          {/* 左パネル: 入力フォーム (40% = 2/5) */}
          <div className="col-span-1 lg:col-span-2 overflow-y-auto border-r bg-gray-50/50 p-6">
            <div className="mx-auto max-w-lg space-y-6">
              {/* 差戻し通知 */}
              {returnComment && (
                <div ref={returnNoticeRef}>
                  <ReturnNotice
                    returnerName={returnerName}
                    returnerRole={returnerRole}
                    comment={returnComment}
                    returnedAt={returnedAt}
                  />
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
                    if (!title.trim()) {
                      setFieldErrors((prev) => ({ ...prev, title: 'タイトルは必須です' }))
                    } else {
                      setFieldErrors((prev) => ({ ...prev, title: '' }))
                    }
                  }}
                  placeholder="文書タイトルを入力"
                  className={fieldErrors.title ? 'border-red-400 focus-visible:ring-red-400' : ''}
                />
                {fieldErrors.title && (
                  <p className="text-xs text-red-500">{fieldErrors.title}</p>
                )}
              </div>

              {/* テンプレート選択（差戻し時は非表示） */}
              {!returnedDocId && !selectedTemplateId && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    テンプレート <span className="text-red-500">*</span>
                  </Label>
                  <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="テンプレートを選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* セクション別入力フォーム */}
              {variableSections.map((section) => (
                <Card key={section.title}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-700">
                      セクション: {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {section.variables.map((variable) => (
                      <FieldInput
                        key={variable.key}
                        variable={variable}
                        value={formValues[variable.key] ?? ''}
                        error={fieldErrors[variable.key]}
                        onChange={(val) => handleFieldChange(variable.key, val)}
                        onBlur={() =>
                          validateField(variable, formValues[variable.key] ?? '')
                        }
                      />
                    ))}
                  </CardContent>
                </Card>
              ))}

              {templateVariables.length === 0 && selectedTemplateId && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-gray-500">
                      このテンプレートには入力項目がありません。
                    </p>
                  </CardContent>
                </Card>
              )}

              {!selectedTemplateId && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-sm text-gray-400">
                      テンプレートを選択すると入力フォームが表示されます
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* 提出前チェックリスト */}
              {templateVariables.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-700">
                      提出前チェックリスト
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {PRE_SUBMIT_CHECKLIST.map((item) => (
                      <label
                        key={item.key}
                        className="flex items-start gap-2.5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checklist[item.key] ?? false}
                          onChange={(e) =>
                            setChecklist((prev) => ({
                              ...prev,
                              [item.key]: e.target.checked,
                            }))
                          }
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* 右パネル: A4プレビュー (60% = 3/5) */}
          <div className="col-span-1 lg:col-span-3 overflow-y-auto bg-gray-100 p-6">
            <div className="mx-auto max-w-3xl">
              <A4Preview
                bodyTemplate={bodyTemplate}
                values={formValues}
                title={title}
                watermark="DRAFT"
                showZoomControls
              />
            </div>
          </div>
        </div>
      </main>

      {/* フッター（固定） */}
      <footer className="sticky bottom-0 z-30 border-t bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="text-gray-500 hover:text-red-600 hover:border-red-300"
                disabled={isDiscarding}
              >
                {isDiscarding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                破棄
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>文書を破棄しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  入力内容はすべて削除されます。この操作は元に戻せません。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDiscard}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  破棄する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              一時保存
            </Button>

            <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={isSubmitting || !selectedTemplateId}
                  onClick={() => {
                    const errors = validateAllFields()
                    if (errors.length > 0) return
                    if (!isChecklistComplete) {
                      alert('提出前チェックリストをすべて確認してください。')
                      return
                    }
                    setShowSubmitConfirm(true)
                  }}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  申請する
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>文書を申請しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    承認フローに提出されます。提出後は編集できなくなります。
                    申請を取り下げるには承認者への依頼が必要です。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>
                    申請する
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

// =============================================================================
// フィールド入力コンポーネント（LocalTemplate変数対応）
// =============================================================================

interface FieldInputProps {
  variable: LocalTemplate['variables'][0]
  value: string
  error?: string
  onChange: (value: string) => void
  onBlur: () => void
}

function FieldInput({ variable, value, error, onChange, onBlur }: FieldInputProps) {
  const { key, label, type, required, options } = variable

  const errorClass = error ? 'border-red-400 focus-visible:ring-red-400' : ''

  return (
    <div className="space-y-1.5">
      <Label htmlFor={key} className="flex items-center gap-1 text-sm">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>

      {/* テキスト入力 */}
      {type === 'text' && (
        <Input
          id={key}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={errorClass}
        />
      )}

      {/* 日付入力 */}
      {type === 'date' && (
        <Input
          id={key}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={errorClass}
        />
      )}

      {/* セレクト */}
      {type === 'select' && options && options.length > 0 && (
        <Select value={value} onValueChange={(v) => { onChange(v); onBlur() }}>
          <SelectTrigger id={key} className={errorClass}>
            <SelectValue placeholder="選択してください" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* エラーメッセージ */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
