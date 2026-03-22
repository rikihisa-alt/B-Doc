'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VariableEditor } from '@/components/template/variable-editor'
import { ArrowLeft, Save, Upload } from 'lucide-react'
import type { TemplateVariable } from '@/types'

interface TemplateVersionData {
  id: string
  version: number
  body: { blocks: { type: string; content: string }[] }
  variables: TemplateVariable[]
  layout: Record<string, unknown>
  is_draft: boolean
  created_at: string
}

interface TemplateData {
  id: string
  name: string
  document_type: string
  description: string | null
  is_published: boolean
  template_versions: TemplateVersionData[]
}

export default function TemplateDetailPage() {
  const router = useRouter()
  const params = useParams()
  const templateId = params.id as string

  const [template, setTemplate] = useState<TemplateData | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [variables, setVariables] = useState<TemplateVariable[]>([])
  const [bodyBlocks, setBodyBlocks] = useState<{ type: string; content: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchTemplate = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('templates')
      .select('*, template_versions(*)')
      .eq('id', templateId)
      .single()

    if (data) {
      const t = data as TemplateData
      setTemplate(t)
      setName(t.name)
      setDescription(t.description ?? '')

      const versions = t.template_versions ?? []
      const latestDraft = versions
        .filter((v) => v.is_draft)
        .sort((a, b) => b.version - a.version)[0]

      if (latestDraft) {
        setVariables(latestDraft.variables ?? [])
        setBodyBlocks(latestDraft.body?.blocks ?? [])
      }
    }
    setLoading(false)
  }, [templateId])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`/api/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })

      const supabase = createClient()
      const versions = template?.template_versions ?? []
      const latestDraft = versions
        .filter((v) => v.is_draft)
        .sort((a, b) => b.version - a.version)[0]

      if (latestDraft) {
        await supabase
          .from('template_versions')
          .update({ variables, body: { blocks: bodyBlocks } })
          .eq('id', latestDraft.id)
      }
    } catch {
      // エラー処理
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const supabase = createClient()
      const versions = template?.template_versions ?? []
      const latestDraft = versions
        .filter((v) => v.is_draft)
        .sort((a, b) => b.version - a.version)[0]

      if (latestDraft) {
        await supabase
          .from('template_versions')
          .update({ is_draft: false })
          .eq('id', latestDraft.id)

        await fetch(`/api/templates/${templateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, is_published: true }),
        })
      }
      await fetchTemplate()
    } catch {
      // エラー処理
    } finally {
      setPublishing(false)
    }
  }

  const addBlock = () => {
    setBodyBlocks([...bodyBlocks, { type: 'text', content: '' }])
  }

  const updateBlock = (index: number, content: string) => {
    const updated = [...bodyBlocks]
    updated[index] = { ...updated[index], content }
    setBodyBlocks(updated)
  }

  const removeBlock = (index: number) => {
    setBodyBlocks(bodyBlocks.filter((_, i) => i !== index))
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-gray-500">読み込み中...</p></div>
  }

  if (!template) {
    return <div className="flex items-center justify-center py-20"><p className="text-gray-500">テンプレートが見つかりません</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/templates')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">テンプレート編集</h1>
            <p className="text-sm text-gray-500">{template.document_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={template.is_published ? 'default' : 'secondary'}>
            {template.is_published ? '公開中' : '非公開'}
          </Badge>
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? '保存中...' : '保存'}
          </Button>
          <Button onClick={handlePublish} disabled={publishing}>
            <Upload className="mr-2 h-4 w-4" />
            {publishing ? '公開中...' : '公開'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">基本情報</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>テンプレート名</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>説明</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">変数定義</CardTitle></CardHeader>
          <CardContent>
            <VariableEditor variables={variables} onChange={setVariables} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">テンプレート本文</CardTitle>
              <Button variant="outline" size="sm" onClick={addBlock}>ブロック追加</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {bodyBlocks.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">ブロックを追加してテンプレートを作成してください</p>
            ) : (
              bodyBlocks.map((block, index) => (
                <div key={index} className="flex gap-2">
                  <Textarea
                    value={block.content}
                    onChange={(e) => updateBlock(index, e.target.value)}
                    placeholder={`ブロック ${index + 1}: テキストを入力（変数は {{変数名}} で挿入）`}
                    rows={3}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeBlock(index)} className="text-red-500 hover:text-red-700">
                    削除
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">バージョン履歴</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(template.template_versions ?? [])
                .sort((a, b) => b.version - a.version)
                .map((ver) => (
                  <div key={ver.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <span className="font-medium">v{ver.version}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {new Date(ver.created_at).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <Badge variant={ver.is_draft ? 'secondary' : 'default'}>
                      {ver.is_draft ? '下書き' : '公開済み'}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
