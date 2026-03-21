'use client'

// =============================================================================
// B-Doc 新規文書作成ページ（S-C02 準拠）
// 左カラム: 入力フォーム（40%）
// 右カラム: A4プレビュー（60%）
// 自動保存: 3分間隔 + 30秒デバウンス
// =============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
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
import type {
  Template,
  TemplateVariable,
  TemplateVersion,
  ValidationError,
} from '@/types'
import {
  ArrowLeft,
  Save,
  Send,
  Trash2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ArrowDown,
  Circle,
} from 'lucide-react'

// =============================================================================
// 定数
// =============================================================================

/** 自動保存間隔: 3分 */
const AUTO_SAVE_INTERVAL = 3 * 60 * 1000
/** デバウンス遅延: 30秒 */
const DEBOUNCE_DELAY = 30 * 1000

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
  variables: TemplateVariable[]
}

/** テンプレート変数をセクションごとにグループ化する */
function groupVariablesBySection(variables: TemplateVariable[]): VariableSection[] {
  // 変数名のプレフィックスからセクションを推定する
  const sectionMap: Record<string, string> = {
    target_: '対象者情報',
    recipient_: '宛先情報',
    company_: '会社情報',
    date_: '日付情報',
    amount_: '金額情報',
    detail_: '詳細情報',
  }

  const sections: Record<string, TemplateVariable[]> = {}
  const general: TemplateVariable[] = []

  for (const v of variables) {
    let matched = false
    for (const [prefix, sectionTitle] of Object.entries(sectionMap)) {
      if (v.name.startsWith(prefix)) {
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
  const supabase = createClient()

  // URL パラメータからテンプレートIDと差戻し文書IDを取得
  const initialTemplateId = searchParams.get('template_id') ?? ''
  const returnedDocId = searchParams.get('returned_from') ?? null

  // ---------- フォーム状態 ----------
  const [title, setTitle] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId)
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([])
  const [bodyTemplate, setBodyTemplate] = useState('')
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})

  // ---------- 差戻し情報（ReturnNotice の props に合わせる） ----------
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

  // ---------- Refs ----------
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    async function fetchTemplates() {
      const { data } = await supabase
        .from('templates')
        .select('*')
        .eq('is_published', true)
        .order('name')

      if (data) {
        setTemplates(data)
      }
    }
    fetchTemplates()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // テンプレート選択時: 変数定義と本文テンプレートを取得
  // ============================================================
  const loadTemplateVersion = useCallback(
    async (templateId: string) => {
      if (!templateId) {
        setTemplateVariables([])
        setBodyTemplate('')
        return
      }

      const { data: version } = await supabase
        .from('template_versions')
        .select('*')
        .eq('template_id', templateId)
        .eq('is_draft', false)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (version) {
        const tv = version as TemplateVersion
        setTemplateVariables(tv.variables ?? [])

        const bodyData = tv.body as { blocks?: { content: string; order?: number }[] } | null
        const blocks = bodyData?.blocks ?? []
        const bodyText = blocks
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((block) => block.content)
          .join('\n\n')
        setBodyTemplate(bodyText)

        // デフォルト値を設定（既存フォーム値がない場合のみ）
        const defaults: Record<string, string> = {}
        for (const v of tv.variables ?? []) {
          if (v.default_value) {
            defaults[v.name] = v.default_value
          }
        }
        setFormValues((prev) =>
          Object.keys(prev).length > 0 ? prev : defaults
        )
      }
    },
    [supabase]
  )

  // ============================================================
  // 差戻し文書の読み込み
  // ============================================================
  useEffect(() => {
    async function loadReturnedDocument() {
      if (!returnedDocId) return

      const { data: doc } = await supabase
        .from('documents')
        .select('*')
        .eq('id', returnedDocId)
        .single()

      if (!doc) return

      setTitle(doc.title ?? '')
      setSelectedTemplateId(doc.template_id ?? '')

      // 入力値の復元
      const { data: docValues } = await supabase
        .from('document_values')
        .select('*')
        .eq('document_id', returnedDocId)

      if (docValues) {
        const restored: Record<string, string> = {}
        for (const dv of docValues) {
          restored[dv.variable_name] = dv.value
        }
        setFormValues(restored)
      }

      // 差戻し理由の取得（最新の差戻しレコード）
      const { data: returnRecord } = await supabase
        .from('approval_records')
        .select('*, user_profiles!approver_id(display_name)')
        .eq('document_id', returnedDocId)
        .in('action', ['return', 'reject'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (returnRecord) {
        setReturnComment(returnRecord.comment ?? '理由の記載なし')
        const profile = (returnRecord as Record<string, unknown>).user_profiles as
          | { display_name: string }
          | null
        setReturnerName(profile?.display_name ?? '不明')
        setReturnerRole('承認者')
        setReturnedAt(
          returnRecord.acted_at
            ? new Date(returnRecord.acted_at).toLocaleString('ja-JP')
            : new Date(returnRecord.created_at).toLocaleString('ja-JP')
        )
      }

      // テンプレート変数をロード
      if (doc.template_id) {
        await loadTemplateVersion(doc.template_id)
      }
    }
    loadReturnedDocument()
  }, [returnedDocId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // テンプレート変更ハンドラ
  // ============================================================
  const handleTemplateChange = useCallback(
    async (templateId: string) => {
      setSelectedTemplateId(templateId)
      setFormValues({})
      setFieldErrors({})
      await loadTemplateVersion(templateId)
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
  // フィールド変更ハンドラ（デバウンス付き自動保存トリガー）
  // ============================================================
  const handleFieldChange = useCallback((name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
    setHasUnsavedChanges(true)

    // デバウンスタイマーをリセット
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      // 30秒後に自動保存を実行（saveDraft は次のレンダーで最新のstateを参照）
    }, DEBOUNCE_DELAY)
  }, [])

  // ============================================================
  // onBlur バリデーション
  // ============================================================
  const validateField = useCallback(
    (variable: TemplateVariable, value: string) => {
      const errors: string[] = []

      // 必須チェック
      if (variable.required && !value.trim()) {
        errors.push(`${variable.label}は必須項目です`)
      }

      // バリデーションルールのチェック
      if (value && variable.validation) {
        const v = variable.validation
        if (v.min_length && value.length < v.min_length) {
          errors.push(v.message ?? `${v.min_length}文字以上で入力してください`)
        }
        if (v.max_length && value.length > v.max_length) {
          errors.push(v.message ?? `${v.max_length}文字以内で入力してください`)
        }
        if (v.pattern && !new RegExp(v.pattern).test(value)) {
          errors.push(v.message ?? '入力形式が正しくありません')
        }
        if (variable.type === 'number' && value) {
          const num = Number(value)
          if (v.min !== null && v.min !== undefined && num < v.min) {
            errors.push(v.message ?? `${v.min}以上の値を入力してください`)
          }
          if (v.max !== null && v.max !== undefined && num > v.max) {
            errors.push(v.message ?? `${v.max}以下の値を入力してください`)
          }
        }
      }

      setFieldErrors((prev) => ({
        ...prev,
        [variable.name]: errors[0] ?? '',
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
      const value = formValues[variable.name] ?? ''
      if (variable.required && !value.trim()) {
        errors.push({
          field: variable.name,
          message: `${variable.label}は必須項目です`,
          type: 'required',
        })
      }
    }

    // フィールドエラーも更新
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
  // 下書き保存（バリデーションなし）
  // ============================================================
  const saveDraft = useCallback(async () => {
    if (isSaving) return

    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      const documentData = {
        title: title || '無題の文書',
        template_id: selectedTemplateId || null,
        status: 'draft' as const,
        metadata: { bodyTemplate, formValues },
        organization_id: profile?.organization_id ?? '',
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }

      if (draftId) {
        await supabase
          .from('documents')
          .update(documentData)
          .eq('id', draftId)

        // 入力値を更新
        for (const [name, value] of Object.entries(formValues)) {
          await supabase
            .from('document_values')
            .upsert(
              {
                document_id: draftId,
                variable_name: name,
                value,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'document_id,variable_name' }
            )
        }
      } else {
        const { data: newDoc } = await supabase
          .from('documents')
          .insert({
            ...documentData,
            created_by: user.id,
            document_number: null,
          })
          .select('id')
          .single()

        if (newDoc) {
          setDraftId(newDoc.id)

          // 入力値の保存
          const valuesInsert = Object.entries(formValues).map(([name, value]) => ({
            document_id: newDoc.id,
            variable_name: name,
            value,
          }))
          if (valuesInsert.length > 0) {
            await supabase.from('document_values').insert(valuesInsert)
          }
        }
      }

      setLastSavedAt(new Date())
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('[NewDocument] 下書き保存エラー:', error)
    } finally {
      setIsSaving(false)
    }
  }, [title, selectedTemplateId, bodyTemplate, formValues, draftId, isSaving, supabase])

  // ============================================================
  // 自動保存（3分間隔）
  // ============================================================
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setInterval(() => {
      if (hasUnsavedChanges) {
        saveDraft()
      }
    }, AUTO_SAVE_INTERVAL)

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
    }
  }, [hasUnsavedChanges, saveDraft])

  // デバウンス後の自動保存
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const timer = setTimeout(() => {
      saveDraft()
    }, DEBOUNCE_DELAY)

    return () => clearTimeout(timer)
  }, [formValues]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const handleDiscard = useCallback(async () => {
    setIsDiscarding(true)
    try {
      if (draftId) {
        // 下書きを削除
        await supabase.from('document_values').delete().eq('document_id', draftId)
        await supabase.from('documents').delete().eq('id', draftId)
      }
      setHasUnsavedChanges(false)
      router.push('/documents')
    } catch (error) {
      console.error('[NewDocument] 破棄エラー:', error)
    } finally {
      setIsDiscarding(false)
    }
  }, [draftId, supabase, router])

  // ============================================================
  // 申請処理
  // ============================================================
  const handleSubmit = useCallback(async () => {
    // バリデーション
    const errors = validateAllFields()
    if (errors.length > 0) {
      setShowSubmitConfirm(false)
      return
    }

    // チェックリスト確認
    if (!isChecklistComplete) {
      setShowSubmitConfirm(false)
      return
    }

    setIsSubmitting(true)
    try {
      // まず下書き保存
      await saveDraft()

      const currentDraftId = draftId
      if (!currentDraftId) {
        alert('文書の保存に失敗しました。')
        return
      }

      // ステータスを確認待ちに変更
      await supabase
        .from('documents')
        .update({
          status: 'pending_confirm',
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentDraftId)

      setHasUnsavedChanges(false)
      router.push(`/documents/${currentDraftId}`)
    } catch (error) {
      console.error('[NewDocument] 申請エラー:', error)
      alert('申請に失敗しました。再度お試しください。')
    } finally {
      setIsSubmitting(false)
      setShowSubmitConfirm(false)
    }
  }, [validateAllFields, isChecklistComplete, saveDraft, draftId, supabase, router])

  // ============================================================
  // 差戻し理由スクロール
  // ============================================================
  const scrollToReturnNotice = useCallback(() => {
    returnNoticeRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // ============================================================
  // レンダリング
  // ============================================================
  return (
    <div className="flex min-h-screen flex-col">
      {/* ================================================================ */}
      {/* ヘッダー */}
      {/* ================================================================ */}
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          {/* 左側: 戻るボタン + テンプレート名 */}
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

          {/* 右側: 自動保存表示 + テンプレート変更 */}
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
                    自動保存:{' '}
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

            {/* 差戻し警告ボタン */}
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

      {/* ================================================================ */}
      {/* メインコンテンツ: 2カラムレイアウト */}
      {/* ================================================================ */}
      <main className="flex-1 overflow-hidden">
        <div className="grid h-full grid-cols-1 lg:grid-cols-5">
          {/* ============================================ */}
          {/* 左パネル: 入力フォーム (40% = 2/5) */}
          {/* ============================================ */}
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
                        key={variable.name}
                        variable={variable}
                        value={formValues[variable.name] ?? variable.default_value ?? ''}
                        error={fieldErrors[variable.name]}
                        onChange={(val) => handleFieldChange(variable.name, val)}
                        onBlur={() =>
                          validateField(variable, formValues[variable.name] ?? '')
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

          {/* ============================================ */}
          {/* 右パネル: A4プレビュー (60% = 3/5) */}
          {/* ============================================ */}
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

      {/* ================================================================ */}
      {/* フッター（固定） */}
      {/* ================================================================ */}
      <footer className="sticky bottom-0 z-30 border-t bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          {/* 左側: 破棄ボタン */}
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

          {/* 右側: 保存・申請ボタン */}
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

            {/* 申請ボタン + 確認ダイアログ */}
            <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={isSubmitting || !selectedTemplateId}
                  onClick={() => {
                    // 事前バリデーション
                    const errors = validateAllFields()
                    if (errors.length > 0) {
                      return
                    }
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
// フィールド入力コンポーネント（onBlur バリデーション対応）
// =============================================================================

interface FieldInputProps {
  variable: TemplateVariable
  value: string
  error?: string
  onChange: (value: string) => void
  onBlur: () => void
}

function FieldInput({ variable, value, error, onChange, onBlur }: FieldInputProps) {
  const { name, label, type, required, placeholder, options, help_text } = variable

  const errorClass = error ? 'border-red-400 focus-visible:ring-red-400' : ''

  return (
    <div className="space-y-1.5">
      {/* ラベル */}
      {type !== 'boolean' && (
        <Label htmlFor={name} className="flex items-center gap-1 text-sm">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}

      {/* テキスト入力 */}
      {type === 'text' && (
        <Input
          id={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder ?? undefined}
          className={errorClass}
        />
      )}

      {/* 数値入力 */}
      {type === 'number' && (
        <Input
          id={name}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder ?? undefined}
          className={errorClass}
        />
      )}

      {/* 日付入力 */}
      {type === 'date' && (
        <Input
          id={name}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={errorClass}
        />
      )}

      {/* セレクト */}
      {type === 'select' && options && (
        <Select value={value} onValueChange={(v) => { onChange(v); onBlur() }}>
          <SelectTrigger id={name} className={errorClass}>
            <SelectValue placeholder={placeholder ?? '選択してください'} />
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

      {/* チェックボックス */}
      {type === 'boolean' && (
        <div className="flex items-center gap-2">
          <input
            id={name}
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => { onChange(String(e.target.checked)); onBlur() }}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <Label htmlFor={name} className="flex items-center gap-1 text-sm">
            {label}
            {required && <span className="text-red-500">*</span>}
          </Label>
        </div>
      )}

      {/* ヘルプテキスト */}
      {help_text && !error && (
        <p className="text-xs text-gray-400">{help_text}</p>
      )}

      {/* エラーメッセージ */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
