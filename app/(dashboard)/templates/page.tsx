import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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
// テンプレート一覧ページ（Server Component）
// プロフェッショナルなテーブルレイアウト:
// - カラム: テンプレート名、文書種別、ステータス(draft/active/archived)、
//   バージョン数、作成日
// - 操作: 編集、新バージョン、アーカイブ
// - 「新規テンプレート」ボタン
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

export default async function TemplatesPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // テンプレート一覧を取得
  const { data: templates, error } = await supabase
    .from('templates')
    .select(
      'id, name, document_type, description, is_published, created_by, created_at, updated_at, deleted_at'
    )
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  // 各テンプレートのバージョン数を取得
  const templateIds = (templates ?? []).map((t: { id: string }) => t.id)
  const { data: versionRows } =
    templateIds.length > 0
      ? await supabase
          .from('template_versions')
          .select('template_id')
          .in('template_id', templateIds)
      : { data: [] }

  // テンプレートIDごとのバージョン数を集計
  const versionCountMap: Record<string, number> = {}
  ;(versionRows ?? []).forEach((v: { template_id: string }) => {
    versionCountMap[v.template_id] = (versionCountMap[v.template_id] ?? 0) + 1
  })

  /** ステータスを判定: is_published + deleted_at から推定 */
  const getStatus = (template: Record<string, unknown>): string => {
    if (template.deleted_at) return 'archived'
    if (template.is_published) return 'active'
    return 'draft'
  }

  // 集計情報
  const totalCount = templates?.length ?? 0
  const activeCount =
    templates?.filter(
      (t: Record<string, unknown>) => getStatus(t) === 'active'
    ).length ?? 0
  const draftCount =
    templates?.filter(
      (t: Record<string, unknown>) => getStatus(t) === 'draft'
    ).length ?? 0

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

      {/* エラー表示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-red-700">
              テンプレートの取得に失敗しました: {error.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* テンプレートが無い場合 */}
      {!error && (!templates || templates.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-4 h-12 w-12 text-slate-200" />
            <p className="text-sm font-medium text-slate-500">
              テンプレートがまだありません
            </p>
            <p className="mt-1 text-xs text-slate-400">
              最初のテンプレートを作成して文書発行を開始しましょう
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/dashboard/templates/new">
                <Plus className="mr-2 h-4 w-4" />
                最初のテンプレートを作成
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

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
