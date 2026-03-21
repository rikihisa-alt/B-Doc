'use client'

// =============================================================================
// B-Doc 再発行申請ページ
// 発行済み文書の再発行理由を入力し、元の内容をプリフィルした新文書を作成
// 変更内容の追跡表示あり。再発行文書は通常の承認フローを経る
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
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
import { A4Preview } from '@/components/document/a4-preview'
import type { TemplateVariable, TemplateVersion } from '@/types'
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
  const supabase = createClient()

  // ---------- 再発行理由 ----------
  const [reason, setReason] = useState('')

  // ---------- フォーム状態 ----------
  const [title, setTitle] = useState('')
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([])
  const [bodyTemplate, setBodyTemplate] = useState('')
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({})
  const [originalDocNumber, setOriginalDocNumber] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [templateVersionId, setTemplateVersionId] = useState('')

  // ---------- UI状態 ----------
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [templateName, setTemplateName] = useState('')

  /** 再発行理由のバリデーション */
  const isReasonValid = reason.trim().length >= MIN_REASON_LENGTH

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
    async function loadOriginalDocument() {
      setIsLoading(true)
      try {
        // 元文書を取得
        const { data: doc } = await supabase
          .from('documents')
          .select('*, templates(name)')
          .eq('id', originalDocId)
          .single()

        if (!doc) {
          router.push('/documents')
          return
        }

        // 発行済み/送付済みでなければリダイレクト
        if (!['issued', 'sent'].includes(doc.status)) {
          router.push(`/documents/${originalDocId}`)
          return
        }

        setTitle(doc.title ?? '')
        setOriginalDocNumber(doc.document_number ?? '')
        setTemplateId(doc.template_id ?? '')
        setTemplateVersionId(doc.template_version_id ?? '')
        const tpl = (doc as Record<string, unknown>).templates as { name: string } | null
        setTemplateName(tpl?.name ?? '')

        // 入力値を取得
        const { data: docValues } = await supabase
          .from('document_values')
          .select('*')
          .eq('document_id', originalDocId)

        const restored: Record<string, string> = {}
        for (const dv of docValues ?? []) {
          const key = dv.variable_name ?? dv.variable_key
          restored[key] = dv.value ?? ''
        }
        setFormValues(restored)
        setOriginalValues({ ...restored })

        // テンプレートバージョン
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
      } catch (error) {
        console.error('[Reissue] データ読み込みエラー:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadOriginalDocument()
  }, [originalDocId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // フィールド変更
  // ============================================================
  const handleFieldChange = useCallback((name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  // ============================================================
  // 再発行申請処理
  // ============================================================
  const handleSubmit = useCallback(async () => {
    if (!isReasonValid) return

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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      // 新しい文書を作成（再発行として）
      const { data: newDoc } = await supabase
        .from('documents')
        .insert({
          organization_id: profile?.organization_id ?? '',
          template_id: templateId,
          template_version_id: templateVersionId,
          title: `[再発行] ${title}`,
          status: 'pending_confirm',
          metadata: {
            reissue_reason: reason,
            original_document_id: originalDocId,
            original_document_number: originalDocNumber,
            bodyTemplate,
            formValues,
          },
          created_by: user.id,
          updated_by: user.id,
        })
        .select('id')
        .single()

      if (!newDoc) {
        alert('再発行文書の作成に失敗しました。')
        return
      }

      // 入力値を保存
      const valuesInsert = Object.entries(formValues).map(([name, value]) => ({
        document_id: newDoc.id,
        variable_name: name,
        value,
      }))
      if (valuesInsert.length > 0) {
        await supabase.from('document_values').insert(valuesInsert)
      }

      // 元文書のステータスを「差替済み」に更新
      await supabase
        .from('documents')
        .update({
          status: 'superseded' as string,
          metadata: {
            ...(typeof (await supabase.from('documents').select('metadata').eq('id', originalDocId).single()).data?.metadata === 'object'
              ? (await supabase.from('documents').select('metadata').eq('id', originalDocId).single()).data?.metadata as Record<string, unknown>
              : {}),
            superseded_by: newDoc.id,
            superseded_reason: reason,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', originalDocId)

      router.push(`/documents/${newDoc.id}`)
    } catch (error) {
      console.error('[Reissue] 再発行エラー:', error)
      alert('再発行申請に失敗しました。')
    } finally {
      setIsSubmitting(false)
    }
  }, [
    isReasonValid, title, templateVariables, formValues, reason,
    originalDocId, originalDocNumber, templateId, templateVersionId,
    bodyTemplate, supabase, router,
  ])

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
                元文書: {originalDocNumber}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-hidden">
        <div className="grid h-full grid-cols-1 lg:grid-cols-5">
          {/* 左パネル: フォーム (40%) */}
          <div className="col-span-1 lg:col-span-2 overflow-y-auto border-r bg-gray-50/50 p-6">
            <div className="mx-auto max-w-lg space-y-6">
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
                    再発行すると元の文書は「差替済み」ステータスとなり、新しい文書が通常の承認フローを経て発行されます。
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

                    {variable.type === 'text' && (
                      <Input
                        id={variable.name}
                        value={value}
                        onChange={(e) => handleFieldChange(variable.name, e.target.value)}
                        placeholder={variable.placeholder ?? undefined}
                      />
                    )}
                    {variable.type === 'number' && (
                      <Input
                        id={variable.name}
                        type="number"
                        value={value}
                        onChange={(e) => handleFieldChange(variable.name, e.target.value)}
                      />
                    )}
                    {variable.type === 'date' && (
                      <Input
                        id={variable.name}
                        type="date"
                        value={value}
                        onChange={(e) => handleFieldChange(variable.name, e.target.value)}
                      />
                    )}
                    {variable.type === 'select' && variable.options && (
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
                        </Label>
                      </div>
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
          </div>

          {/* 右パネル: A4プレビュー (60%) */}
          <div className="col-span-1 lg:col-span-3 overflow-y-auto bg-gray-100 p-6">
            <div className="mx-auto max-w-3xl">
              <A4Preview
                bodyTemplate={bodyTemplate}
                values={formValues}
                title={`[再発行] ${title}`}
                watermark="DRAFT"
                showZoomControls
              />
            </div>
          </div>
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
                    元の文書（{originalDocNumber}）は「差替済み」となり、
                    新しい文書が通常の承認フローに提出されます。
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
