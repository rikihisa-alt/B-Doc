'use client'

// =============================================================================
// B-Doc 文書修正ページ（差戻し後の修正・再申請）
// 差戻し理由を上部に表示し、既存値をプリフィル、変更フィールドをハイライト
// 自動保存: 3分間隔 + 30秒デバウンス
// =============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import type { TemplateVariable, TemplateVersion } from '@/types'
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  Circle,
} from 'lucide-react'

/** 自動保存間隔: 3分 */
const AUTO_SAVE_INTERVAL = 3 * 60 * 1000
/** デバウンス遅延: 30秒 */
const DEBOUNCE_DELAY = 30 * 1000

export default function ReviseDocumentPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const documentId = params.id
  const supabase = createClient()

  // ---------- フォーム状態 ----------
  const [title, setTitle] = useState('')
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([])
  const [bodyTemplate, setBodyTemplate] = useState('')
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // ---------- 差戻し情報 ----------
  const [returnInfo, setReturnInfo] = useState<{
    returnerName: string
    returnerRole: string
    comment: string
    returnedAt: string
  } | null>(null)

  // ---------- UI状態 ----------
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    async function loadDocument() {
      setIsLoading(true)
      try {
        // 文書本体を取得
        const { data: doc } = await supabase
          .from('documents')
          .select('*, templates(name)')
          .eq('id', documentId)
          .single()

        if (!doc) {
          router.push('/documents')
          return
        }

        // 差戻し状態でなければ詳細ページへリダイレクト
        if (doc.status !== 'returned') {
          router.push(`/documents/${documentId}`)
          return
        }

        setTitle(doc.title ?? '')
        const tpl = (doc as Record<string, unknown>).templates as { name: string } | null
        setTemplateName(tpl?.name ?? '')

        // 入力値を取得
        const { data: docValues } = await supabase
          .from('document_values')
          .select('*')
          .eq('document_id', documentId)

        const restored: Record<string, string> = {}
        for (const dv of docValues ?? []) {
          const key = dv.variable_name ?? dv.variable_key
          restored[key] = dv.value ?? ''
        }
        setFormValues(restored)
        setOriginalValues({ ...restored })

        // テンプレートバージョンを取得
        if (doc.template_version_id) {
          const { data: version } = await supabase
            .from('template_versions')
            .select('*')
            .eq('id', doc.template_version_id)
            .single()

          if (version) {
            const tv = version as TemplateVersion
            setTemplateVariables(tv.variables ?? [])

            const bodyData = tv.body as { blocks?: { content: string; order?: number }[] } | null
            const blocks = bodyData?.blocks ?? []
            setBodyTemplate(
              blocks
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((block) => block.content)
                .join('\n\n')
            )
          }
        }

        // 差戻し理由の取得（最新レコード）
        const { data: returnRecords } = await supabase
          .from('approval_records')
          .select('*, user_profiles!approver_id(display_name, position)')
          .eq('document_id', documentId)
          .in('action', ['return', 'reject', 'returned', 'rejected'])
          .order('created_at', { ascending: false })
          .limit(1)

        if (returnRecords && returnRecords[0]) {
          const rec = returnRecords[0]
          const profile = (rec as Record<string, unknown>).user_profiles as
            | { display_name: string; position?: string }
            | null
          setReturnInfo({
            returnerName: profile?.display_name ?? rec.approver_id?.slice(0, 8) ?? '承認者',
            returnerRole: profile?.position ?? '承認者',
            comment: rec.comment ?? '差戻し理由の記載なし',
            returnedAt: new Date(rec.acted_at ?? rec.created_at).toLocaleString('ja-JP'),
          })
        }
      } catch (error) {
        console.error('[Revise] データ読み込みエラー:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadDocument()
  }, [documentId]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const saveDraft = useCallback(async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      // 文書メタデータを更新
      await supabase
        .from('documents')
        .update({
          title,
          metadata: { bodyTemplate, formValues },
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId)

      // 入力値を upsert
      for (const [name, value] of Object.entries(formValues)) {
        await supabase
          .from('document_values')
          .upsert(
            { document_id: documentId, variable_name: name, value, updated_at: new Date().toISOString() },
            { onConflict: 'document_id,variable_name' }
          )
      }

      setLastSavedAt(new Date())
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('[Revise] 保存エラー:', error)
    } finally {
      setIsSaving(false)
    }
  }, [title, bodyTemplate, formValues, documentId, isSaving, supabase])

  // 自動保存（3分間隔）
  useEffect(() => {
    if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setInterval(() => {
      if (hasUnsavedChanges) saveDraft()
    }, AUTO_SAVE_INTERVAL)
    return () => { if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current) }
  }, [hasUnsavedChanges, saveDraft])

  // デバウンス保存（30秒後）
  useEffect(() => {
    if (!hasUnsavedChanges) return
    const timer = setTimeout(() => saveDraft(), DEBOUNCE_DELAY)
    return () => clearTimeout(timer)
  }, [formValues]) // eslint-disable-line react-hooks/exhaustive-deps

  // ページ離脱警告
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (hasUnsavedChanges) e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedChanges])

  // ============================================================
  // 再申請処理
  // ============================================================
  const handleResubmit = useCallback(async () => {
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
      // まず保存
      await saveDraft()

      // ステータスを確認待ちに変更（再申請）
      await supabase
        .from('documents')
        .update({ status: 'pending_confirm', updated_at: new Date().toISOString() })
        .eq('id', documentId)

      setHasUnsavedChanges(false)
      router.push(`/documents/${documentId}`)
    } catch (error) {
      console.error('[Revise] 再申請エラー:', error)
      alert('再申請に失敗しました。')
    } finally {
      setIsSubmitting(false)
    }
  }, [title, templateVariables, formValues, saveDraft, documentId, supabase, router])

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
      {/* ================================================================ */}
      {/* ヘッダー */}
      {/* ================================================================ */}
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
                {templateName || '文書修正'}
              </h1>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                修正中
              </span>
            </div>
          </div>

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
                  {lastSavedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <Circle className="h-2 w-2 fill-amber-500 text-amber-500" />
                <span>未保存の変更あり</span>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* ================================================================ */}
      {/* 2カラムレイアウト */}
      {/* ================================================================ */}
      <main className="flex-1 overflow-hidden">
        <div className="grid h-full grid-cols-1 lg:grid-cols-5">
          {/* 左パネル: フォーム (40%) */}
          <div className="col-span-1 lg:col-span-2 overflow-y-auto border-r bg-gray-50/50 p-6">
            <div className="mx-auto max-w-lg space-y-6">
              {/* 差戻し通知（最上部に表示） */}
              {returnInfo && (
                <ReturnNotice
                  returnerName={returnInfo.returnerName}
                  returnerRole={returnInfo.returnerRole}
                  comment={returnInfo.comment}
                  returnedAt={returnInfo.returnedAt}
                />
              )}

              {/* タイトル入力 */}
              <div className="space-y-1.5">
                <Label htmlFor="doc-title" className="text-sm font-medium">
                  文書タイトル <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="doc-title"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setHasUnsavedChanges(true) }}
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
                      {variable.type !== 'boolean' && (
                        <Label htmlFor={variable.name} className="text-sm">
                          {variable.label}
                          {variable.required && <span className="text-red-500 ml-0.5">*</span>}
                        </Label>
                      )}
                      {isChanged && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          変更あり
                        </span>
                      )}
                    </div>

                    {/* 入力フィールド */}
                    {variable.type === 'text' && (
                      <Input
                        id={variable.name}
                        value={value}
                        onChange={(e) => handleFieldChange(variable.name, e.target.value)}
                        onBlur={() => validateField(variable, value)}
                        placeholder={variable.placeholder ?? undefined}
                        className={fieldErrors[variable.name] ? 'border-red-400' : ''}
                      />
                    )}
                    {variable.type === 'number' && (
                      <Input
                        id={variable.name}
                        type="number"
                        value={value}
                        onChange={(e) => handleFieldChange(variable.name, e.target.value)}
                        onBlur={() => validateField(variable, value)}
                        className={fieldErrors[variable.name] ? 'border-red-400' : ''}
                      />
                    )}
                    {variable.type === 'date' && (
                      <Input
                        id={variable.name}
                        type="date"
                        value={value}
                        onChange={(e) => handleFieldChange(variable.name, e.target.value)}
                        onBlur={() => validateField(variable, value)}
                        className={fieldErrors[variable.name] ? 'border-red-400' : ''}
                      />
                    )}
                    {variable.type === 'select' && variable.options && (
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
                    )}
                    {variable.type === 'boolean' && (
                      <div className="flex items-center gap-2">
                        <input
                          id={variable.name}
                          type="checkbox"
                          checked={value === 'true'}
                          onChange={(e) => handleFieldChange(variable.name, String(e.target.checked))}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Label htmlFor={variable.name} className="text-sm">
                          {variable.label}
                          {variable.required && <span className="text-red-500 ml-0.5">*</span>}
                        </Label>
                      </div>
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
          </div>

          {/* 右パネル: A4プレビュー (60%) */}
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
