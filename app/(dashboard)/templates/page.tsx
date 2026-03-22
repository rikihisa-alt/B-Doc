'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Plus,
  Pencil,
  Copy,
  Archive,
  Layers,
} from 'lucide-react'
import Link from 'next/link'
import { DOCUMENT_TYPE_LABELS } from '@/types'
import { getTemplates } from '@/lib/store'
import type { LocalTemplate } from '@/lib/store'

// =============================================================================
// テンプレート一覧ページ（Client Component - ストアベース版）
// =============================================================================

/** ステータスバッジの表示 */
function TemplateStatusBadge({ isPublished }: { isPublished: boolean }) {
  if (isPublished) {
    return (
      <Badge className="border-green-200 bg-green-50 text-green-700">
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
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

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<LocalTemplate[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setTemplates(getTemplates())
    setLoaded(true)
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
          <Link href="/dashboard/templates/new">
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

      {/* テンプレート一覧テーブル */}
      {templates.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">テンプレート名</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">文書種別</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">ステータス</th>
                    <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">バージョン</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">作成日</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {templates.map((template) => (
                    <tr key={template.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/templates/${template.id}`}
                          className="font-medium text-slate-900 hover:text-blue-600 hover:underline"
                        >
                          {template.name}
                        </Link>
                        {template.description && (
                          <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">
                            {template.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="secondary" className="text-xs">
                          {DOCUMENT_TYPE_LABELS[template.document_type] ?? template.document_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <TemplateStatusBadge isPublished={template.is_published} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-medium text-slate-600">
                          v{template.version}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500">
                        {new Date(template.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="sm" className="h-8 px-2" title="編集">
                            <Link href={`/dashboard/templates/${template.id}/edit`}>
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              編集
                            </Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm" className="h-8 px-2" title="新バージョン作成">
                            <Link href={`/dashboard/templates/${template.id}/edit?new_version=true`}>
                              <Copy className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
