// TODO: Supabase接続後にDBからデータ取得に切り替え
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Plus,
  Pencil,
  Copy,
  Archive,
  MoreHorizontal,
  Layers,
} from 'lucide-react'
import Link from 'next/link'
import { DOCUMENT_TYPE_LABELS } from '@/types'

// =============================================================================
// テンプレート一覧ページ（デモデータ版）
// =============================================================================

/** ステータスバッジの表示 */
function TemplateStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'active':
      return (
        <Badge className="border-green-200 bg-green-50 text-green-700">
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
          公開中
        </Badge>
      )
    case 'archived':
      return (
        <Badge className="border-slate-200 bg-slate-100 text-slate-500">
          <Archive className="mr-1 h-3 w-3" />
          アーカイブ
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="border-slate-300 text-slate-500">
          <Pencil className="mr-1 h-3 w-3" />
          下書き
        </Badge>
      )
  }
}

// ---------- デモデータ ----------
const demoTemplates = [
  {
    id: 'tpl-001',
    name: '在職証明書テンプレート',
    document_type: 'employment_certificate',
    description: '在職中の従業員向け証明書のテンプレートです',
    is_published: true,
    created_by: 'user-001',
    created_at: '2024-10-01T09:00:00Z',
    updated_at: '2024-12-15T14:00:00Z',
    deleted_at: null,
  },
  {
    id: 'tpl-002',
    name: '給与証明書テンプレート',
    document_type: 'salary_certificate',
    description: '給与額を証明するためのテンプレートです',
    is_published: true,
    created_by: 'user-001',
    created_at: '2024-10-05T10:00:00Z',
    updated_at: '2024-12-10T11:00:00Z',
    deleted_at: null,
  },
  {
    id: 'tpl-003',
    name: '退職証明書テンプレート',
    document_type: 'retirement_certificate',
    description: '退職者向けの退職証明書テンプレートです',
    is_published: false,
    created_by: 'user-002',
    created_at: '2024-11-20T15:00:00Z',
    updated_at: '2024-12-01T09:30:00Z',
    deleted_at: null,
  },
  {
    id: 'tpl-004',
    name: '源泉徴収票テンプレート',
    document_type: 'withholding_certificate',
    description: '年末調整用の源泉徴収票テンプレート',
    is_published: true,
    created_by: 'user-001',
    created_at: '2024-09-15T08:00:00Z',
    updated_at: '2024-11-30T16:00:00Z',
    deleted_at: null,
  },
]

const demoVersionCountMap: Record<string, number> = {
  'tpl-001': 3,
  'tpl-002': 2,
  'tpl-003': 1,
  'tpl-004': 4,
}

export default function TemplatesPage() {
  const templates = demoTemplates
  const versionCountMap = demoVersionCountMap

  /** ステータスを判定 */
  const getStatus = (template: Record<string, unknown>): string => {
    if (template.deleted_at) return 'archived'
    if (template.is_published) return 'active'
    return 'draft'
  }

  // 集計情報
  const totalCount = templates.length
  const activeCount = templates.filter(
    (t: Record<string, unknown>) => getStatus(t) === 'active'
  ).length
  const draftCount = templates.filter(
    (t: Record<string, unknown>) => getStatus(t) === 'draft'
  ).length

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            テンプレート管理
          </h1>
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
      {templates && templates.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      テンプレート名
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      文書種別
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      ステータス
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                      バージョン
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      作成日
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {templates.map((template: Record<string, unknown>) => {
                    const status = getStatus(template)
                    return (
                      <tr
                        key={template.id as string}
                        className="transition-colors hover:bg-slate-50"
                      >
                        {/* テンプレート名 */}
                        <td className="px-6 py-4">
                          <Link
                            href={`/dashboard/templates/${template.id}`}
                            className="font-medium text-slate-900 hover:text-blue-600 hover:underline"
                          >
                            {template.name as string}
                          </Link>
                          {template.description ? (
                            <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">
                              {template.description as string}
                            </p>
                          ) : null}
                        </td>

                        {/* 文書種別 */}
                        <td className="px-4 py-4">
                          <Badge variant="secondary" className="text-xs">
                            {DOCUMENT_TYPE_LABELS[
                              (template.document_type as string) ?? ''
                            ] ?? (template.document_type as string)}
                          </Badge>
                        </td>

                        {/* ステータス */}
                        <td className="px-4 py-4">
                          <TemplateStatusBadge status={status} />
                        </td>

                        {/* バージョン数 */}
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-medium text-slate-600">
                            v{versionCountMap[template.id as string] ?? 0}
                          </span>
                        </td>

                        {/* 作成日 */}
                        <td className="px-4 py-4 text-sm text-slate-500">
                          {new Date(
                            template.created_at as string
                          ).toLocaleDateString('ja-JP')}
                        </td>

                        {/* 操作ボタン */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {/* 編集 */}
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              title="編集"
                            >
                              <Link
                                href={`/dashboard/templates/${template.id}/edit`}
                              >
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                編集
                              </Link>
                            </Button>

                            {/* 新バージョン */}
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              title="新バージョン作成"
                            >
                              <Link
                                href={`/dashboard/templates/${template.id}/edit?new_version=true`}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Link>
                            </Button>

                            {/* アーカイブ */}
                            <form
                              action={`/api/templates/${template.id}`}
                              method="POST"
                            >
                              <input
                                type="hidden"
                                name="action"
                                value="archive"
                              />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-slate-400 hover:text-red-600"
                                title="アーカイブ"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
