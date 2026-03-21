'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
import { DocumentForm } from '@/components/document/document-form'
import { DocumentPreview } from '@/components/document/document-preview'
import type {
  Template,
  TemplateVariable,
  TemplateVersion,
} from '@/types'
import { Save, Send, Loader2 } from 'lucide-react'

/** 自動保存間隔（3分） */
const AUTO_SAVE_INTERVAL = 3 * 60 * 1000

/**
 * 新規文書作成ページ（Client Component）
 * 左カラム: テンプレート選択 + 動的フォーム
 * 右カラム: A4 プレビュー（リアルタイム変数置換）
 */
export default function NewDocumentPage() {
  const router = useRouter()
  const supabase = createClient()

  // フォーム状態
  const [title, setTitle] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([])
  const [bodyTemplate, setBodyTemplate] = useState('')
  const [formValues, setFormValues] = useState<Record<string, string>>({})

  // UI状態
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 自動保存タイマーref
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
  const handleTemplateChange = useCallback(
    async (templateId: string) => {
      setSelectedTemplateId(templateId)
      setFormValues({})

      if (!templateId) {
        setTemplateVariables([])
        setBodyTemplate('')
        return
      }

      // テンプレートの最新バージョンを取得
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
        // テンプレートブロックを結合して本文テンプレートにする
        const bodyData = tv.body as { blocks?: { content: string; order?: number }[] } | null
        const blocks = bodyData?.blocks ?? []
        const bodyText = blocks
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((block) => block.content)
          .join('\n\n')
        setBodyTemplate(bodyText)

        // デフォルト値をフォームに設定
        const defaults: Record<string, string> = {}
        for (const v of tv.variables ?? []) {
          if (v.default_value) {
            defaults[v.name] = v.default_value
          }
        }
        setFormValues(defaults)
      }
    },
    [supabase]
  )

  // ============================================================
  // フォーム値の変更追跡
  // ============================================================
  const handleFormChange = useCallback((values: Record<string, string>) => {
    setFormValues(values)
    setHasUnsavedChanges(true)
  }, [])

  // ============================================================
  // 下書き保存
  // ============================================================
  const saveDraft = useCallback(async () => {
    if (!title.trim()) return

    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // プロフィールから organization_id を取得
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      const documentData = {
        title,
        document_type: templates.find((t) => t.id === selectedTemplateId)?.document_type ?? 'other',
        status: 'draft' as const,
        content: JSON.stringify({ bodyTemplate, formValues }),
        organization_id: profile?.organization_id ?? '',
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }

      if (draftId) {
        // 既存の下書きを更新
        await supabase
          .from('documents')
          .update(documentData)
          .eq('id', draftId)
      } else {
        // 新規下書きを作成
        const { data: newDoc } = await supabase
          .from('documents')
          .insert({
            ...documentData,
            created_by: user.id,
            version: 1,
          })
          .select('id')
          .single()

        if (newDoc) {
          setDraftId(newDoc.id)
        }
      }

      setLastSavedAt(new Date())
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('[NewDocument] 下書き保存エラー:', error)
    } finally {
      setIsSaving(false)
    }
  }, [title, selectedTemplateId, bodyTemplate, formValues, draftId, supabase, templates])

  // ============================================================
  // 自動保存（3分間隔）
  // ============================================================
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setInterval(() => {
      if (hasUnsavedChanges && title.trim()) {
        saveDraft()
      }
    }, AUTO_SAVE_INTERVAL)

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [hasUnsavedChanges, title, saveDraft])

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
  // 承認申請
  // ============================================================
  const handleSubmitForApproval = async () => {
    // 必須フィールドのバリデーション
    const missingFields = templateVariables
      .filter((v) => v.required && !formValues[v.name]?.trim())
      .map((v) => v.label)

    if (missingFields.length > 0) {
      alert(`以下の必須項目を入力してください:\n${missingFields.join('\n')}`)
      return
    }

    if (!title.trim()) {
      alert('タイトルを入力してください。')
      return
    }

    setIsSubmitting(true)
    try {
      // まず下書き保存
      await saveDraft()

      if (!draftId) {
        alert('文書の保存に失敗しました。')
        return
      }

      // ステータスを承認待ちに変更
      await supabase
        .from('documents')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', draftId)

      router.push(`/documents/${draftId}`)
    } catch (error) {
      console.error('[NewDocument] 承認申請エラー:', error)
      alert('承認申請に失敗しました。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">新規文書作成</h1>
        {lastSavedAt && (
          <p className="text-xs text-gray-400">
            最終保存: {lastSavedAt.toLocaleTimeString('ja-JP')}
          </p>
        )}
      </div>

      {/* 2カラムレイアウト */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 左カラム: テンプレート選択 + フォーム */}
        <div className="space-y-4">
          {/* タイトル入力 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">
                  タイトル <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    setHasUnsavedChanges(true)
                  }}
                  placeholder="文書タイトルを入力"
                />
              </div>

              {/* テンプレート選択 */}
              <div className="space-y-1.5">
                <Label>テンプレート</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={handleTemplateChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="テンプレートを選択" />
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
            </CardContent>
          </Card>

          {/* 動的フォーム */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">入力項目</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentForm
                variables={templateVariables}
                values={formValues}
                onChange={handleFormChange}
              />
            </CardContent>
          </Card>
        </div>

        {/* 右カラム: A4 プレビュー */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">プレビュー</CardTitle>
            </CardHeader>
            <CardContent className="bg-gray-100 p-4">
              <DocumentPreview
                bodyTemplate={bodyTemplate}
                values={formValues}
                title={title}
                status="draft"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* フッター: 保存・申請ボタン */}
      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-white py-4">
        <Button
          variant="outline"
          onClick={saveDraft}
          disabled={isSaving || !title.trim()}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          下書き保存
        </Button>
        <Button
          onClick={handleSubmitForApproval}
          disabled={isSubmitting || !title.trim()}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          承認申請
        </Button>
      </div>
    </div>
  )
}
