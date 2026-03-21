import { createServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Plus, Pencil, Copy, Trash2 } from 'lucide-react'
import Link from 'next/link'

// ============================================================
// テンプレート一覧ページ（Server Component）
// テンプレートの名前、カテゴリ、ステータス、バージョン数、作成日を表示し
// 編集・新バージョン作成・削除の操作を提供する
// ============================================================
export default async function TemplatesPage() {
  const supabase = await createServerClient()

  // テンプレート一覧を取得
  const { data: templates, error } = await supabase
    .from('templates')
    .select('id, name, category, description, status, created_by, created_at, updated_at')
    .order('updated_at', { ascending: false })

  // 各テンプレートのバージョン数を取得
  const templateIds = (templates ?? []).map((t: { id: string }) => t.id)
  const { data: versionRows } = templateIds.length > 0
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

  /** ステータスのバッジ表示マッピング */
  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            公開中
          </Badge>
        )
      case 'archived':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
            アーカイブ
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-gray-500">
            下書き
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">テンプレート管理</h1>
          <p className="mt-1 text-sm text-gray-500">
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

      {/* エラー表示 */}
      {error && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-red-600">
              テンプレートの取得に失敗しました: {error.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* テンプレートが無い場合 */}
      {!error && (!templates || templates.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 mb-4">
              テンプレートがまだありません
            </p>
            <Button asChild variant="outline">
              <Link href="/templates/new">
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
          <CardHeader>
            <CardTitle className="text-lg">テンプレート一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pr-4 font-medium">テンプレート名</th>
                    <th className="pb-3 pr-4 font-medium">カテゴリ</th>
                    <th className="pb-3 pr-4 font-medium">ステータス</th>
                    <th className="pb-3 pr-4 font-medium text-center">バージョン数</th>
                    <th className="pb-3 pr-4 font-medium">作成日</th>
                    <th className="pb-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr
                      key={template.id}
                      className="border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                    >
                      {/* テンプレート名 */}
                      <td className="py-3 pr-4">
                        <Link
                          href={`/templates/${template.id}`}
                          className="font-medium text-gray-900 hover:text-primary hover:underline"
                        >
                          {template.name}
                        </Link>
                        {template.description && (
                          <p className="mt-0.5 text-xs text-gray-400 truncate max-w-xs">
                            {template.description}
                          </p>
                        )}
                      </td>

                      {/* カテゴリ */}
                      <td className="py-3 pr-4 text-gray-700">
                        {template.category}
                      </td>

                      {/* ステータス */}
                      <td className="py-3 pr-4">
                        {statusBadge(template.status)}
                      </td>

                      {/* バージョン数 */}
                      <td className="py-3 pr-4 text-center text-gray-600">
                        {versionCountMap[template.id] ?? 0}
                      </td>

                      {/* 作成日 */}
                      <td className="py-3 pr-4 text-gray-500">
                        {new Date(template.created_at).toLocaleDateString('ja-JP')}
                      </td>

                      {/* 操作ボタン */}
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* 編集 */}
                          <Button asChild variant="ghost" size="icon" title="編集">
                            <Link href={`/templates/${template.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>

                          {/* 新バージョン作成 */}
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            title="新バージョン作成"
                          >
                            <Link href={`/templates/${template.id}?action=new-version`}>
                              <Copy className="h-4 w-4" />
                            </Link>
                          </Button>

                          {/* 削除（ソフトデリート） */}
                          <form action={`/api/templates/${template.id}/delete`} method="POST">
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon"
                              title="削除"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </form>
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
