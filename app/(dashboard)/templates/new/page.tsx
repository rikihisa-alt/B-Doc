'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VariableEditor } from '@/components/template/variable-editor'
import { TemplatePreview } from '@/components/template/template-preview'
import type { PreviewBlock } from '@/components/template/template-preview'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from 'lucide-react'
import Link from 'next/link'
import type { TemplateVariable, TemplateLayout } from '@/types'

// ============================================================
// ブロック種別の表示ラベル（ローカル定義）
// ============================================================
type BlockType = PreviewBlock['type']

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  heading: '見出し',
  paragraph: '段落',
  list: 'リスト',
  table: 'テーブル',
  divider: '区切り線',
  variable: '変数挿入',
}

// ============================================================
// テンプレートカテゴリの選択肢
// ============================================================
const CATEGORY_OPTIONS = [
  { value: 'invoice', label: '請求書' },
  { value: 'quotation', label: '見積書' },
  { value: 'contract', label: '契約書' },
  { value: 'report', label: '報告書' },
  { value: 'certificate', label: '証明書' },
  { value: 'notice', label: '通知書' },
  { value: 'manual', label: 'マニュアル' },
  { value: 'other', label: 'その他' },
]

// ============================================================
// デフォルトレイアウト
// ============================================================
const DEFAULT_LAYOUT: TemplateLayout = {
  paper_size: 'A4',
  orientation: 'portrait',
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  header: { enabled: true, content: null, height: 20 },
  footer: { enabled: true, content: null, height: 15 },
}

// ============================================================
// テンプレート新規作成ページ（Client Component）
// フォーム入力、変数エディタ、ブロックエディタ、プレビューを提供
// ============================================================
export default function NewTemplatePage() {
  const router = useRouter()
  const supabase = createClient()

  // フォーム状態
  const [name, setName] = useState('')
  const [category, setCategory] = useState('report')
  const [description, setDescription] = useState('')
  const [variables, setVariables] = useState<TemplateVariable[]>([])
  const [blocks, setBlocks] = useState<PreviewBlock[]>([])
  const [layout, setLayout] = useState<TemplateLayout>(DEFAULT_LAYOUT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // タブ切り替え（編集 / プレビュー）
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  // ============================================================
  // ブロック操作
  // ============================================================

  /** ブロックを追加 */
  const handleAddBlock = useCallback(
    (type: BlockType) => {
      const newBlock: PreviewBlock = {
        id: `block_${Date.now()}`,
        type,
        content: type === 'divider' ? '' : '',
        order: blocks.length,
      }
      setBlocks((prev) => [...prev, newBlock])
    },
    [blocks.length]
  )

  /** ブロックを削除 */
  const handleRemoveBlock = useCallback((index: number) => {
    setBlocks((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      return updated.map((b, i) => ({ ...b, order: i }))
    })
  }, [])

  /** ブロック内容を更新 */
  const handleUpdateBlock = useCallback(
    (index: number, content: string) => {
      setBlocks((prev) =>
        prev.map((b, i) => (i === index ? { ...b, content } : b))
      )
    },
    []
  )

  /** 変数をブロックに挿入するヒント */
  const variableInsertHint =
    variables.length > 0
      ? `利用可能な変数: ${variables.map((v) => `{{${v.name}}}`).join(', ')}`
      : '変数を追加すると {{変数名}} の形式で挿入できます'

  // ============================================================
  // 保存処理
  // ============================================================
  const handleSave = useCallback(async () => {
    setError(null)

    // バリデーション
    if (!name.trim()) {
      setError('テンプレート名を入力してください')
      return
    }

    setSaving(true)
    try {
      // 現在のユーザー情報を取得
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError('ログインが必要です')
        return
      }

      // ユーザーの組織IDを取得
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        setError('ユーザー情報の取得に失敗しました')
        return
      }

      // テンプレート作成
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .insert({
          name: name.trim(),
          category,
          description: description.trim() || null,
          status: 'draft',
          variables,
          organization_id: profile.organization_id,
          created_by: user.id,
        })
        .select('id')
        .single()

      if (templateError || !template) {
        setError(`テンプレートの作成に失敗しました: ${templateError?.message}`)
        return
      }

      // 初期バージョン（v1）を作成
      const { error: versionError } = await supabase
        .from('template_versions')
        .insert({
          template_id: template.id,
          version_number: 1,
          content: JSON.stringify(blocks),
          layout,
          change_note: '初期バージョン',
          created_by: user.id,
        })

      if (versionError) {
        setError(`バージョンの作成に失敗しました: ${versionError.message}`)
        return
      }

      // 作成したテンプレートの詳細ページへ遷移
      router.push(`/templates/${template.id}`)
    } catch (err) {
      setError('予期しないエラーが発生しました')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }, [name, category, description, variables, blocks, layout, supabase, router])

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/templates">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">テンプレート新規作成</h1>
          <p className="mt-1 text-sm text-gray-500">
            新しい文書テンプレートを作成します
          </p>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* テンプレート名 */}
          <div className="space-y-2">
            <Label htmlFor="template-name">テンプレート名 *</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 月次報告書テンプレート"
            />
          </div>

          {/* カテゴリ */}
          <div className="space-y-2">
            <Label>カテゴリ *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 説明 */}
          <div className="space-y-2">
            <Label htmlFor="template-desc">説明</Label>
            <Textarea
              id="template-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="テンプレートの用途や注意事項を記入してください"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 変数定義 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">変数定義</CardTitle>
        </CardHeader>
        <CardContent>
          <VariableEditor variables={variables} onChange={setVariables} />
        </CardContent>
      </Card>

      {/* 本文エディタ / プレビュー切り替え */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">本文</CardTitle>
            <div className="flex rounded-lg border">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'edit'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-600 hover:bg-gray-50'
                } rounded-l-lg`}
              >
                編集
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-600 hover:bg-gray-50'
                } rounded-r-lg`}
              >
                プレビュー
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'edit' ? (
            <div className="space-y-4">
              {/* 変数挿入ヒント */}
              <p className="text-xs text-gray-400">{variableInsertHint}</p>

              {/* ブロック追加ボタン群 */}
              <div className="flex flex-wrap gap-2">
                {(Object.entries(BLOCK_TYPE_LABELS) as [BlockType, string][]).map(
                  ([type, label]) => (
                    <Button
                      key={type}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddBlock(type)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {label}
                    </Button>
                  )
                )}
              </div>

              {/* ブロック一覧 */}
              {blocks.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-8 border border-dashed rounded-lg">
                  上のボタンからブロックを追加してください
                </p>
              )}

              <div className="space-y-3">
                {blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className="flex items-start gap-2 rounded-lg border bg-white p-3"
                  >
                    {/* ドラッグハンドル */}
                    <div className="pt-2 text-gray-400">
                      <GripVertical className="h-4 w-4" />
                    </div>

                    <div className="flex-1 space-y-1">
                      {/* ブロック種別ラベル */}
                      <span className="text-xs font-medium text-gray-500">
                        {BLOCK_TYPE_LABELS[block.type]}
                      </span>

                      {/* ブロック内容入力 */}
                      {block.type === 'divider' ? (
                        <hr className="border-gray-300 my-2" />
                      ) : (
                        <Textarea
                          value={block.content}
                          onChange={(e) => handleUpdateBlock(index, e.target.value)}
                          placeholder={
                            block.type === 'heading'
                              ? '見出しテキストを入力'
                              : block.type === 'list'
                              ? '1行ごとにリスト項目を入力'
                              : block.type === 'table'
                              ? 'セル1|セル2|セル3（行ごとに改行、|で区切り）'
                              : block.type === 'variable'
                              ? '{{variable_name}} の形式で変数を挿入'
                              : '本文を入力。{{変数名}} で変数を挿入できます'
                          }
                          rows={block.type === 'heading' ? 1 : 3}
                          className="text-sm"
                        />
                      )}
                    </div>

                    {/* 削除ボタン */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveBlock(index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* プレビュータブ */
            <TemplatePreview
              templateName={name || '(無題)'}
              blocks={blocks}
              variables={variables}
              layout={layout}
            />
          )}
        </CardContent>
      </Card>

      {/* レイアウト設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">レイアウト設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 用紙サイズ */}
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>用紙サイズ</Label>
              <Select
                value={layout.paper_size}
                onValueChange={(val) =>
                  setLayout((prev) => ({
                    ...prev,
                    paper_size: val as TemplateLayout['paper_size'],
                  }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="A3">A3</SelectItem>
                  <SelectItem value="B4">B4</SelectItem>
                  <SelectItem value="B5">B5</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 用紙方向 */}
            <div className="space-y-2">
              <Label>用紙方向</Label>
              <Select
                value={layout.orientation}
                onValueChange={(val) =>
                  setLayout((prev) => ({
                    ...prev,
                    orientation: val as 'portrait' | 'landscape',
                  }))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">縦（ポートレート）</SelectItem>
                  <SelectItem value="landscape">横（ランドスケープ）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* マージン設定 */}
          <div className="space-y-2">
            <Label>マージン (mm)</Label>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {(['top', 'bottom', 'left', 'right'] as const).map((side) => {
                const labels = { top: '上', bottom: '下', left: '左', right: '右' }
                return (
                  <div key={side} className="space-y-1">
                    <Label className="text-xs text-gray-500">{labels[side]}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={layout.margins[side]}
                      onChange={(e) =>
                        setLayout((prev) => ({
                          ...prev,
                          margins: { ...prev.margins, [side]: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* ヘッダー/フッター */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={layout.header.enabled}
                onChange={(e) =>
                  setLayout((prev) => ({
                    ...prev,
                    header: { ...prev.header, enabled: e.target.checked },
                  }))
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              ヘッダーを表示
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={layout.footer.enabled}
                onChange={(e) =>
                  setLayout((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, enabled: e.target.checked },
                  }))
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              フッターを表示
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 保存ボタン */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Button asChild variant="outline">
          <Link href="/templates">キャンセル</Link>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? '保存中...' : 'テンプレートを作成'}
        </Button>
      </div>
    </div>
  )
}
