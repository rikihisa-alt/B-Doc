'use client'

/**
 * テンプレート一覧ページ
 * テンプレートの一覧表示・作成・編集・削除を管理する
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Layers,
  Variable,
  Blocks,
  Eye,
} from 'lucide-react'
import Link from 'next/link'
import { DOCUMENT_TYPE_LABELS } from '@/types'
import { getTemplates, deleteTemplate } from '@/lib/store'
import type { LocalTemplate } from '@/lib/store'

// =============================================================================
// テンプレート一覧ページ（Client Component - ストアベース版）
// =============================================================================

/** ステータスバッジの表示 */
function TemplateStatusBadge({ isPublished }: { isPublished: boolean }) {
  if (isPublished) {
    return (
      <Badge className="border-green-200 bg-green-50 text-green-700">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
        公開中
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-slate-300 text-slate-500">
      <Pencil className="mr-1 h-3 w-3" />
      下書き
    </Badge>
  )
}

/** ブロック数を計算 */
function getBlockCount(template: LocalTemplate): number {
  return template.blocks?.length ?? 0
}

/** 変数数を計算 */
function getVariableCount(template: LocalTemplate): number {
  if (template.blocks) {
    const keys = new Set<string>()
    for (const b of template.blocks) {
      if (b.type === 'variable_line' && b.variableKey) {
        keys.add(b.variableKey)
      }
    }
    return keys.size
  }
  return template.variables.length
}

/** ミニプレビュー：テンプレートブロックの簡易サムネイル */
function TemplateMiniPreview({ template }: { template: LocalTemplate }) {
  const blocks = template.blocks ?? []
  if (blocks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-300">
        <FileText className="h-6 w-6" />
      </div>
    )
  }

  const sorted = [...blocks].sort((a, b) => a.order - b.order).slice(0, 8)
  return (
    <div className="space-y-0.5 overflow-hidden p-1.5">
      {sorted.map((block) => {
        switch (block.type) {
          case 'heading':
            return (
              <div key={block.id} className={`truncate text-[6px] font-bold ${block.align === 'center' ? 'text-center' : block.align === 'right' ? 'text-right' : 'text-left'}`}>
                {block.content || '見出し'}
              </div>
            )
          case 'paragraph':
            return <div key={block.id} className="truncate text-[5px] text-slate-500">{block.content || '本文...'}</div>
          case 'variable_line':
            return <div key={block.id} className="text-[5px] text-slate-400">{block.variableLabel}: <span className="text-amber-500">{`{{${block.variableKey}}}`}</span></div>
          case 'divider':
            return <hr key={block.id} className="border-slate-200" />
          case 'spacer':
            return <div key={block.id} style={{ height: `${Math.max(1, (block.spacerHeight ?? 5) * 0.3)}px` }} />
          case 'table':
            return <div key={block.id} className="h-2 rounded border border-slate-200 bg-slate-50" />
          case 'seal':
            return <div key={block.id} className="flex justify-end"><div className="h-3 w-3 rounded-full border border-red-300" /></div>
          case 'signature':
            return <div key={block.id} className="text-right text-[5px] text-slate-400">{block.companyName || '署名欄'}</div>
          default:
            return <div key={block.id} className="h-1 bg-slate-100" />
        }
      })}
    </div>
  )
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<LocalTemplate[]>([])
  const [loaded, setLoaded] = useState(false)

  // データ読み込み
  useEffect(() => {
    setTemplates(getTemplates())
    setLoaded(true)
  }, [])

  /** テンプレート削除 */
  const handleDelete = useCallback((id: string, name: string) => {
    if (!window.confirm(`テンプレート「${name}」を削除しますか？\nこの操作は取り消せません。`)) return
    deleteTemplate(id)
    setTemplates(getTemplates())
  }, [])

  // 集計情報
  const totalCount = templates.length
  const activeCount = templates.filter((t) => t.is_published).length
  const draftCount = templates.filter((t) => !t.is_published).length

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">テンプレート管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            文書テンプレートの作成・編集・管理を行います
          </p>
        </div>
        <Button asChild>
          <Link href="/templates/new">
            <Plus className="mr-2 h-4 w-4" />
            新規テンプレート
          </Link>
        </Button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Layers className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
              <p className="text-xs text-slate-500">全テンプレート</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
              <p className="text-xs text-slate-500">公開中</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50">
              <Pencil className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{draftCount}</p>
              <p className="text-xs text-slate-500">下書き</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* テンプレートカードグリッド */}
      {templates.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="group overflow-hidden transition-shadow hover:shadow-md">
              {/* ミニプレビュー */}
              <div className="relative h-32 border-b border-slate-100 bg-slate-50">
                <TemplateMiniPreview template={template} />
                {/* ホバー時のオーバーレイ */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/80 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button asChild size="sm" variant="outline" className="h-8">
                    <Link href={`/templates/${template.id}/edit`}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      編集
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="h-8">
                    <Link href={`/templates/${template.id}`}>
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      詳細
                    </Link>
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/templates/${template.id}/edit`}
                      className="block truncate text-sm font-semibold text-slate-900 hover:text-blue-600"
                    >
                      {template.name}
                    </Link>
                    {template.description && (
                      <p className="mt-0.5 truncate text-xs text-slate-400">{template.description}</p>
                    )}
                  </div>
                  <TemplateStatusBadge isPublished={template.is_published} />
                </div>

                {/* メタ情報 */}
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <Badge variant="secondary" className="text-[10px]">
                    {DOCUMENT_TYPE_LABELS[template.document_type] ?? template.document_type}
                  </Badge>
                  <span className="inline-flex items-center gap-0.5">
                    <Blocks className="h-3 w-3" />
                    {getBlockCount(template)}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Variable className="h-3 w-3" />
                    {getVariableCount(template)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium">
                    v{template.version}
                  </span>
                </div>

                {/* 操作ボタン */}
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-400">
                    {new Date(template.created_at).toLocaleDateString('ja-JP')}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                      <Link href={`/templates/${template.id}/edit`}>
                        <Pencil className="mr-1 h-3 w-3" />
                        編集
                      </Link>
                    </Button>
                    <button
                      onClick={() => handleDelete(template.id, template.name)}
                      className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="削除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <FileText className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">テンプレートがありません</p>
            <Button asChild>
              <Link href="/templates/new">
                <Plus className="mr-2 h-4 w-4" />
                最初のテンプレートを作成
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
