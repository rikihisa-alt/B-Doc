'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Type,
  Variable,
  GitBranch,
  Repeat,
  FileSignature,
  SeparatorHorizontal,
  AlertTriangle,
  FileText,
  GripVertical,
  Plus,
  Trash2,
  Save,
  Eye,
  Loader2,
  ChevronLeft,
  Settings2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { TemplateVariable, TemplateLayout } from '@/types'
import { TemplatePreview, type PreviewBlock } from '@/components/template/template-preview'

// =============================================================================
// テンプレートエディタ（Client Component）
// S-M02 仕様準拠の3カラムレイアウト:
// - 左パネル（narrow）: ブロック種別パレット
// - 中央パネル: ブロックエディタ（ドラッグ＆ドロップ）
// - 右パネル: ライブA4プレビュー + サンプルデータ
// - フッター: 変数一覧サマリー
// =============================================================================

/** テンプレートブロック型定義 */
type BlockType =
  | 'fixed_text'
  | 'variable'
  | 'conditional'
  | 'repeat'
  | 'signature'
  | 'page_break'
  | 'notice'
  | 'header'
  | 'footer'

/** エディタ上のブロック */
interface EditorBlock {
  /** ブロック固有ID */
  id: string
  /** ブロック種別 */
  type: BlockType
  /** ブロック内容 */
  content: string
  /** 表示順 */
  order: number
  /** 変数名（variable/conditional ブロック用） */
  variableName?: string
}

/** ブロック種別パレットの定義 */
const BLOCK_PALETTE: {
  type: BlockType
  label: string
  icon: typeof Type
  description: string
}[] = [
  {
    type: 'fixed_text',
    label: '固定文言',
    icon: Type,
    description: '変更されない固定テキスト',
  },
  {
    type: 'variable',
    label: '変数',
    icon: Variable,
    description: '入力値で置換されるフィールド',
  },
  {
    type: 'conditional',
    label: '条件分岐',
    icon: GitBranch,
    description: '条件に応じて表示/非表示',
  },
  {
    type: 'repeat',
    label: '繰り返し',
    icon: Repeat,
    description: 'リスト項目の繰り返し',
  },
  {
    type: 'page_break',
    label: '改ページ',
    icon: SeparatorHorizontal,
    description: '改ページ挿入',
  },
  {
    type: 'notice',
    label: '注意書き',
    icon: AlertTriangle,
    description: '注意事項テキスト',
  },
  {
    type: 'signature',
    label: '署名欄',
    icon: FileSignature,
    description: '署名・捺印欄',
  },
]

/** 一意のIDを生成するヘルパー */
function generateId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** ブロック種別のデフォルトコンテンツ */
function getDefaultContent(type: BlockType): string {
  switch (type) {
    case 'fixed_text':
      return 'テキストを入力してください'
    case 'variable':
      return '{{variable_name}}'
    case 'conditional':
      return '{{#if condition}}\n表示内容\n{{/if}}'
    case 'repeat':
      return '{{#each items}}\n繰り返し内容\n{{/each}}'
    case 'page_break':
      return '--- 改ページ ---'
    case 'notice':
      return '※ 注意事項を入力してください'
    case 'signature':
      return '署名: ________________\n日付: ____年__月__日'
    case 'header':
      return 'ヘッダー内容'
    case 'footer':
      return 'フッター内容'
    default:
      return ''
  }
}

/** EditorBlock → PreviewBlock 変換 */
function toPreviewBlock(block: EditorBlock): PreviewBlock {
  const typeMap: Record<BlockType, PreviewBlock['type']> = {
    fixed_text: 'paragraph',
    variable: 'variable',
    conditional: 'paragraph',
    repeat: 'list',
    signature: 'paragraph',
    page_break: 'divider',
    notice: 'paragraph',
    header: 'heading',
    footer: 'paragraph',
  }

  return {
    id: block.id,
    type: typeMap[block.type] ?? 'paragraph',
    content: block.content,
    order: block.order,
  }
}

export default function TemplateEditorPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const templateId = params.id as string
  const isNewVersion = searchParams.get('new_version') === 'true'
  const supabase = createClient()

  // テンプレート基本情報
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [documentType, setDocumentType] = useState('')

  // ブロックエディタ状態
  const [blocks, setBlocks] = useState<EditorBlock[]>([])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  // 変数定義
  const [variables, setVariables] = useState<TemplateVariable[]>([])

  // レイアウト設定
  const [layout, setLayout] = useState<TemplateLayout>({
    paper_size: 'A4',
    orientation: 'portrait',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    header: { enabled: true, content: null, height: 20 },
    footer: { enabled: true, content: null, height: 15 },
  })

  // UI状態
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // テンプレートデータを読み込み
  useEffect(() => {
    async function loadTemplate() {
      try {
        // テンプレート基本情報
        const { data: template, error: tErr } = await supabase
          .from('templates')
          .select('*')
          .eq('id', templateId)
          .single()

        if (tErr || !template) {
          setError('テンプレートの読み込みに失敗しました')
          setIsLoading(false)
          return
        }

        setTemplateName(template.name ?? '')
        setTemplateDescription(template.description ?? '')
        setDocumentType(template.document_type ?? '')

        // 最新バージョンの読み込み
        const { data: version } = await supabase
          .from('template_versions')
          .select('*')
          .eq('template_id', templateId)
          .order('version', { ascending: false })
          .limit(1)
          .single()

        if (version) {
          // 変数定義
          setVariables(version.variables ?? [])

          // レイアウト
          if (version.layout) {
            setLayout(version.layout as TemplateLayout)
          }

          // ブロック復元（body から）
          const body = version.body as Record<string, unknown>
          if (body?.blocks && Array.isArray(body.blocks)) {
            setBlocks(body.blocks as EditorBlock[])
          } else if (body?.content && typeof body.content === 'string') {
            // レガシー: 単一コンテンツの場合
            setBlocks([
              {
                id: generateId(),
                type: 'fixed_text',
                content: body.content as string,
                order: 0,
              },
            ])
          }
        }
      } catch {
        setError('テンプレートデータの読み込みに失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    loadTemplate()
  }, [templateId, supabase])

  /** ブロックを追加 */
  const addBlock = useCallback((type: BlockType) => {
    const newBlock: EditorBlock = {
      id: generateId(),
      type,
      content: getDefaultContent(type),
      order: blocks.length,
    }
    setBlocks((prev) => [...prev, newBlock])
    setSelectedBlockId(newBlock.id)
  }, [blocks.length])

  /** ブロックを削除 */
  const removeBlock = useCallback((blockId: string) => {
    setBlocks((prev) => {
      const filtered = prev.filter((b) => b.id !== blockId)
      // order を再割り当て
      return filtered.map((b, i) => ({ ...b, order: i }))
    })
    setSelectedBlockId(null)
  }, [])

  /** ブロックの内容を更新 */
  const updateBlockContent = useCallback(
    (blockId: string, content: string) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, content } : b))
      )
    },
    []
  )

  /** ブロックを上下に移動 */
  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === blockId)
      if (index < 0) return prev
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= prev.length) return prev

      const newBlocks = [...prev]
      ;[newBlocks[index], newBlocks[targetIndex]] = [
        newBlocks[targetIndex],
        newBlocks[index],
      ]
      return newBlocks.map((b, i) => ({ ...b, order: i }))
    })
  }, [])

  /** テンプレートを保存 */
  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // テンプレート基本情報の更新
      const { error: updateErr } = await supabase
        .from('templates')
        .update({
          name: templateName,
          description: templateDescription,
          document_type: documentType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)

      if (updateErr) throw updateErr

      // 新バージョンの作成
      const body = {
        blocks: blocks,
        content: blocks.map((b) => b.content).join('\n'),
      }

      if (isNewVersion) {
        // 新バージョン作成
        const { data: latestVersion } = await supabase
          .from('template_versions')
          .select('version')
          .eq('template_id', templateId)
          .order('version', { ascending: false })
          .limit(1)
          .single()

        const nextVersion = (latestVersion?.version ?? 0) + 1

        const { error: vErr } = await supabase
          .from('template_versions')
          .insert({
            template_id: templateId,
            version: nextVersion,
            body,
            variables,
            layout,
            is_draft: true,
            created_by: (await supabase.auth.getUser()).data.user?.id ?? '',
          })

        if (vErr) throw vErr
      } else {
        // 既存バージョンの更新
        const { data: latestVersion } = await supabase
          .from('template_versions')
          .select('id')
          .eq('template_id', templateId)
          .order('version', { ascending: false })
          .limit(1)
          .single()

        if (latestVersion) {
          const { error: vErr } = await supabase
            .from('template_versions')
            .update({ body, variables, layout })
            .eq('id', latestVersion.id)

          if (vErr) throw vErr
        }
      }

      router.push('/dashboard/templates')
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '保存中にエラーが発生しました'
      )
    } finally {
      setIsSaving(false)
    }
  }

  // プレビュー用ブロック
  const previewBlocks: PreviewBlock[] = blocks.map(toPreviewBlock)

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">読み込み中...</span>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* ヘッダーバー */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/templates')}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            戻る
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="テンプレート名"
            className="h-8 w-64 border-none bg-transparent text-lg font-bold focus-visible:ring-0"
          />
          {isNewVersion && (
            <Badge className="bg-blue-100 text-blue-700">新バージョン</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-600">{error}</span>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            保存
          </Button>
        </div>
      </div>

      {/* 3カラムレイアウト */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左パネル: ブロック種別パレット（narrow） */}
        <div className="w-48 shrink-0 overflow-y-auto border-r bg-slate-50 p-3">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            ブロック追加
          </h3>
          <div className="space-y-1.5">
            {BLOCK_PALETTE.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => addBlock(item.type)}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-left text-sm transition-colors hover:border-blue-300 hover:bg-blue-50"
                  title={item.description}
                >
                  <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="text-xs font-medium text-slate-700">
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* レイアウト設定 */}
          <div className="mt-6">
            <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Settings2 className="h-3.5 w-3.5" />
              レイアウト
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-slate-500">用紙サイズ</label>
                <select
                  value={layout.paper_size}
                  onChange={(e) =>
                    setLayout((prev) => ({
                      ...prev,
                      paper_size: e.target.value as TemplateLayout['paper_size'],
                    }))
                  }
                  className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="B4">B4</option>
                  <option value="B5">B5</option>
                  <option value="letter">Letter</option>
                </select>
              </div>
              <div>
                <label className="text-slate-500">向き</label>
                <select
                  value={layout.orientation}
                  onChange={(e) =>
                    setLayout((prev) => ({
                      ...prev,
                      orientation: e.target.value as 'portrait' | 'landscape',
                    }))
                  }
                  className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                >
                  <option value="portrait">縦</option>
                  <option value="landscape">横</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 中央パネル: ブロックエディタ */}
        <div className="flex-1 overflow-y-auto bg-white p-4">
          <div className="mx-auto max-w-2xl space-y-3">
            {blocks.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-16">
                <Plus className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">
                  左のパレットからブロックを追加してください
                </p>
              </div>
            )}

            {blocks
              .sort((a, b) => a.order - b.order)
              .map((block, index) => (
                <div
                  key={block.id}
                  className={`group relative rounded-lg border transition-colors ${
                    selectedBlockId === block.id
                      ? 'border-blue-400 ring-2 ring-blue-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedBlockId(block.id)}
                >
                  {/* ブロックヘッダー */}
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 cursor-grab text-slate-300" />
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-normal"
                      >
                        {BLOCK_PALETTE.find((p) => p.type === block.type)
                          ?.label ?? block.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          moveBlock(block.id, 'up')
                        }}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          moveBlock(block.id, 'down')
                        }}
                        disabled={index === blocks.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeBlock(block.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* ブロックコンテンツ編集 */}
                  <div className="p-3">
                    {block.type === 'page_break' ? (
                      <div className="flex items-center justify-center py-2">
                        <div className="h-px flex-1 bg-slate-300" />
                        <span className="px-3 text-xs text-slate-400">
                          改ページ
                        </span>
                        <div className="h-px flex-1 bg-slate-300" />
                      </div>
                    ) : (
                      <Textarea
                        value={block.content}
                        onChange={(e) =>
                          updateBlockContent(block.id, e.target.value)
                        }
                        rows={
                          block.type === 'signature'
                            ? 3
                            : block.content.split('\n').length + 1
                        }
                        className="resize-none border-none bg-transparent p-0 text-sm focus-visible:ring-0"
                        placeholder="内容を入力..."
                      />
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* 右パネル: ライブA4プレビュー */}
        <div className="w-80 shrink-0 overflow-y-auto border-l bg-slate-100 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Eye className="h-4 w-4 text-slate-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              ライブプレビュー
            </h3>
          </div>
          <TemplatePreview
            templateName={templateName}
            blocks={previewBlocks}
            variables={variables}
            layout={layout}
          />
        </div>
      </div>

      {/* フッター: 変数一覧サマリー */}
      <div className="border-t bg-white px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-slate-500">
            変数一覧 ({variables.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {variables.length === 0 ? (
              <span className="text-xs text-slate-400">
                変数が未定義です
              </span>
            ) : (
              variables.map((v) => (
                <Badge
                  key={v.name}
                  variant="secondary"
                  className="text-[10px]"
                >
                  {v.label || v.name}
                  <span className="ml-1 text-slate-400">({v.type})</span>
                  {v.required && (
                    <span className="ml-0.5 text-red-400">*</span>
                  )}
                </Badge>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
