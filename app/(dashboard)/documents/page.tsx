import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/document/status-badge'
import {
  DOCUMENT_TYPE_LABELS,
  type DocumentStatus,
} from '@/types'
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'

/** 1ページあたりの表示件数 */
const PAGE_SIZE = 20

interface SearchParams {
  q?: string
  status?: DocumentStatus
  document_type?: string
  date_from?: string
  date_to?: string
  page?: string
}

/**
 * 文書一覧ページ（Server Component）
 * 検索・フィルタリング・ページネーション付きのテーブル表示
 */
export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ページ番号の取得（1始まり）
  const currentPage = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (currentPage - 1) * PAGE_SIZE

  // クエリ構築
  let query = supabase
    .from('documents')
    .select('id, document_number, title, document_type, status, created_at', {
      count: 'exact',
    })

  // 検索フィルタ: document_number / title のキーワード検索
  if (params.q) {
    query = query.or(
      `document_number.ilike.%${params.q}%,title.ilike.%${params.q}%`
    )
  }

  // ステータスフィルタ
  if (params.status) {
    query = query.eq('status', params.status)
  }

  // 文書種別フィルタ
  if (params.document_type) {
    query = query.eq('document_type', params.document_type)
  }

  // 日付範囲フィルタ
  if (params.date_from) {
    query = query.gte('created_at', params.date_from)
  }
  if (params.date_to) {
    // date_to の終端は翌日の 00:00:00 までを含める
    query = query.lt('created_at', `${params.date_to}T23:59:59`)
  }

  // ソート・ページネーション
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const { data: documents, count } = await query

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  /**
   * フィルタパラメータ付きURLを生成するヘルパー
   * 指定ページへの遷移リンクに使用する
   */
  function buildPageUrl(page: number): string {
    const p = new URLSearchParams()
    if (params.q) p.set('q', params.q)
    if (params.status) p.set('status', params.status)
    if (params.document_type) p.set('document_type', params.document_type)
    if (params.date_from) p.set('date_from', params.date_from)
    if (params.date_to) p.set('date_to', params.date_to)
    p.set('page', String(page))
    return `/documents?${p.toString()}`
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">文書一覧</h1>
        <Link href="/documents/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      {/* 検索・フィルタ */}
      <Card>
        <CardContent className="p-4">
          <form method="get" action="/documents" className="flex flex-wrap gap-3">
            {/* キーワード検索 */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                name="q"
                placeholder="文書番号・タイトルで検索"
                defaultValue={params.q ?? ''}
                className="pl-9"
              />
            </div>

            {/* ステータスフィルタ */}
            <select
              name="status"
              defaultValue={params.status ?? ''}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">すべてのステータス</option>
              <option value="draft">下書き</option>
              <option value="pending">承認待ち</option>
              <option value="in_review">レビュー中</option>
              <option value="approved">承認済み</option>
              <option value="rejected">却下</option>
              <option value="published">公開済み</option>
              <option value="archived">アーカイブ</option>
            </select>

            {/* 文書種別フィルタ */}
            <select
              name="document_type"
              defaultValue={params.document_type ?? ''}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">すべての種別</option>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            {/* 日付範囲 */}
            <Input
              name="date_from"
              type="date"
              defaultValue={params.date_from ?? ''}
              className="w-[160px]"
              placeholder="開始日"
            />
            <Input
              name="date_to"
              type="date"
              defaultValue={params.date_to ?? ''}
              className="w-[160px]"
              placeholder="終了日"
            />

            <Button type="submit" variant="secondary">
              <Search className="mr-2 h-4 w-4" />
              検索
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 文書テーブル */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    文書番号
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    タイトル
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    種別
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    ステータス
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    作成日
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents && documents.length > 0 ? (
                  documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b transition-colors hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {doc.document_number ?? '未採番'}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {doc.title}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={doc.status as DocumentStatus}
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(doc.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/documents/${doc.id}`}>
                          <Button variant="ghost" size="sm">
                            詳細
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      文書が見つかりませんでした。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            全 {count} 件中 {offset + 1} - {Math.min(offset + PAGE_SIZE, count ?? 0)} 件を表示
          </p>
          <div className="flex items-center gap-2">
            {currentPage > 1 && (
              <Link href={buildPageUrl(currentPage - 1)}>
                <Button variant="outline" size="sm">
                  <ChevronLeft className="h-4 w-4" />
                  前へ
                </Button>
              </Link>
            )}

            {/* ページ番号ボタン（最大5ページ分表示） */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const startPage = Math.max(
                1,
                Math.min(currentPage - 2, totalPages - 4)
              )
              const page = startPage + i
              if (page > totalPages) return null
              return (
                <Link key={page} href={buildPageUrl(page)}>
                  <Button
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="sm"
                    className="w-9"
                  >
                    {page}
                  </Button>
                </Link>
              )
            })}

            {currentPage < totalPages && (
              <Link href={buildPageUrl(currentPage + 1)}>
                <Button variant="outline" size="sm">
                  次へ
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
