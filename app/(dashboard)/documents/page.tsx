// TODO: Supabase接続後にDBからデータ取得に切り替え
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/document/status-badge'
import {
  DOCUMENT_TYPE_LABELS,
  STATUS_BADGE_MAP,
  type DocumentStatus,
} from '@/types'
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  X,
} from 'lucide-react'

// ページあたりの表示件数
const PAGE_SIZE = 20

/** 検索パラメータの型定義 */
interface SearchParams {
  doc_number?: string
  document_type?: string
  q?: string
  status?: string
  date_from?: string
  date_to?: string
  created_by?: string
  page?: string
  sort?: string
  order?: 'asc' | 'desc'
}

// ---------- デモデータ ----------
const demoDocuments = [
  {
    id: 'demo-001',
    document_number: 'DOC-2024-0001',
    title: '在職証明書（田中 太郎）',
    document_type: 'employment_certificate',
    status: 'issued' as DocumentStatus,
    created_at: '2024-12-01T10:00:00Z',
    created_by: 'user-001',
    recipient: { name: '田中 太郎' },
  },
  {
    id: 'demo-002',
    document_number: 'DOC-2024-0002',
    title: '給与証明書（鈴木 花子）',
    document_type: 'salary_certificate',
    status: 'pending_approval' as DocumentStatus,
    created_at: '2024-12-05T14:30:00Z',
    created_by: 'user-002',
    recipient: { name: '鈴木 花子' },
  },
  {
    id: 'demo-003',
    document_number: 'DOC-2024-0003',
    title: '退職証明書（佐藤 健一）',
    document_type: 'retirement_certificate',
    status: 'draft' as DocumentStatus,
    created_at: '2024-12-10T09:15:00Z',
    created_by: 'user-001',
    recipient: { name: '佐藤 健一' },
  },
  {
    id: 'demo-004',
    document_number: 'DOC-2024-0004',
    title: '在職証明書（山田 美咲）',
    document_type: 'employment_certificate',
    status: 'pending_confirm' as DocumentStatus,
    created_at: '2024-12-12T11:00:00Z',
    created_by: 'user-003',
    recipient: { name: '山田 美咲' },
  },
  {
    id: 'demo-005',
    document_number: 'DOC-2024-0005',
    title: '給与証明書（高橋 翔太）',
    document_type: 'salary_certificate',
    status: 'returned' as DocumentStatus,
    created_at: '2024-12-15T16:45:00Z',
    created_by: 'user-002',
    recipient: { name: '高橋 翔太' },
  },
  {
    id: 'demo-006',
    document_number: 'DOC-2024-0006',
    title: '在職証明書（渡辺 真理）',
    document_type: 'employment_certificate',
    status: 'sent' as DocumentStatus,
    created_at: '2024-12-18T08:30:00Z',
    created_by: 'user-001',
    recipient: { name: '渡辺 真理' },
  },
  {
    id: 'demo-007',
    document_number: 'DOC-2024-0007',
    title: '退職証明書（伊藤 大輔）',
    document_type: 'retirement_certificate',
    status: 'approved' as DocumentStatus,
    created_at: '2024-12-20T13:20:00Z',
    created_by: 'user-003',
    recipient: { name: '伊藤 大輔' },
  },
]

const demoOrgUsers = [
  { id: 'user-001', display_name: '管理者 太郎' },
  { id: 'user-002', display_name: '総務部 花子' },
  { id: 'user-003', display_name: '人事部 次郎' },
]

/**
 * 文書一覧ページ（Server Component）
 * フィルタバー・一括操作・ソータブルテーブル・ページネーション
 */
export default function DocumentsPage({
  searchParams: _searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params: SearchParams = {}
  const documents = demoDocuments
  const orgUsers = demoOrgUsers

  // ページ番号（1始まり）
  const currentPage = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (currentPage - 1) * PAGE_SIZE

  // ソートカラム
  const sortField = params.sort ?? 'created_at'
  const sortOrder = params.order ?? 'desc'

  const totalCount = documents.length
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // 作成者名のマッピング
  const userMap = new Map(
    (orgUsers ?? []).map((u) => [u.id, u.display_name])
  )

  // ---------- URL構築ヘルパー ----------
  /** フィルタパラメータを保持したままページ遷移URLを生成 */
  function buildUrl(overrides: Record<string, string | undefined>): string {
    const p = new URLSearchParams()
    const merged = { ...params, ...overrides }
    for (const [key, val] of Object.entries(merged)) {
      if (val && val !== '') p.set(key, val)
    }
    return `/documents?${p.toString()}`
  }

  /** ソートリンク用URL生成 */
  function sortUrl(field: string): string {
    const newOrder =
      params.sort === field && sortOrder === 'asc' ? 'desc' : 'asc'
    return buildUrl({ sort: field, order: newOrder, page: '1' })
  }

  /** ソート方向インジケータ */
  function sortIndicator(field: string): string {
    if (params.sort !== field && !(field === 'created_at' && !params.sort))
      return ''
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }

  // ステータスオプション（STATUS_BADGE_MAPから生成）
  const statusOptions = Object.entries(STATUS_BADGE_MAP).map(
    ([value, info]) => ({ value, label: info.label })
  )

  // 表示範囲テキスト
  const rangeStart = totalCount > 0 ? offset + 1 : 0
  const rangeEnd = Math.min(offset + PAGE_SIZE, totalCount)

  // フィルタが何か適用されているか判定
  const hasFilters = !!(
    params.doc_number ||
    params.q ||
    params.status ||
    params.document_type ||
    params.date_from ||
    params.date_to ||
    params.created_by
  )

  return (
    <div className="space-y-4">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">文書一覧</h1>
        <Link href="/documents/new/select-template">
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      {/* ====== フィルタバー（常時表示・折りたたみ不可） ====== */}
      <div className="rounded-lg border bg-white p-4">
        <form method="get" action="/documents">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-7">
            {/* 文書番号 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                文書番号
              </label>
              <Input
                name="doc_number"
                placeholder="DOC-2024..."
                defaultValue={params.doc_number ?? ''}
                className="h-8 text-xs font-mono"
              />
            </div>

            {/* 種別 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                種別
              </label>
              <select
                name="document_type"
                defaultValue={params.document_type ?? ''}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">全種別</option>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* 名前・会社名 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                対象者名 / 会社名
              </label>
              <Input
                name="q"
                placeholder="山田太郎 / 株式会社..."
                defaultValue={params.q ?? ''}
                className="h-8 text-xs"
              />
            </div>

            {/* ステータス */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                ステータス
              </label>
              <select
                name="status"
                defaultValue={params.status ?? ''}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">全ステータス</option>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 日付範囲 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                作成日
              </label>
              <div className="flex items-center gap-1">
                <Input
                  name="date_from"
                  type="date"
                  defaultValue={params.date_from ?? ''}
                  className="h-8 text-xs"
                />
                <span className="text-xs text-gray-400">~</span>
                <Input
                  name="date_to"
                  type="date"
                  defaultValue={params.date_to ?? ''}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* 作成者 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                作成者
              </label>
              <select
                name="created_by"
                defaultValue={params.created_by ?? ''}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">全員</option>
                {(orgUsers ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* 検索・クリアボタン */}
            <div className="flex items-end gap-2">
              <Button type="submit" size="sm" className="h-8 px-3">
                <Search className="mr-1 h-3.5 w-3.5" />
                検索
              </Button>
              {hasFilters && (
                <Link href="/documents">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-gray-500"
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    クリア
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* ====== 一括操作バー（JS制御のため data属性で管理） ====== */}
      <div
        id="bulk-actions-bar"
        className="hidden items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2"
      >
        <span className="text-sm font-medium text-blue-700">
          <span id="selected-count">0</span>件選択中
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Download className="mr-1 h-3 w-3" />
            PDF一括DL
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <RefreshCw className="mr-1 h-3 w-3" />
            ステータス更新
          </Button>
        </div>
      </div>

      {/* ====== 文書テーブル ====== */}
      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/80">
                {/* チェックボックス列 */}
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-gray-300"
                    aria-label="すべて選択"
                  />
                </th>
                {/* 文書番号 */}
                <th className="px-3 py-2.5 text-left">
                  <Link
                    href={sortUrl('document_number')}
                    className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900"
                  >
                    文書番号{sortIndicator('document_number')}
                  </Link>
                </th>
                {/* 種別 */}
                <th className="px-3 py-2.5 text-left">
                  <Link
                    href={sortUrl('document_type')}
                    className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900"
                  >
                    種別{sortIndicator('document_type')}
                  </Link>
                </th>
                {/* 対象者 */}
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  対象者
                </th>
                {/* ステータス */}
                <th className="px-3 py-2.5 text-left">
                  <Link
                    href={sortUrl('status')}
                    className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900"
                  >
                    ステータス{sortIndicator('status')}
                  </Link>
                </th>
                {/* 作成日 */}
                <th className="px-3 py-2.5 text-left">
                  <Link
                    href={sortUrl('created_at')}
                    className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900"
                  >
                    作成日{sortIndicator('created_at')}
                  </Link>
                </th>
                {/* 操作 */}
                <th className="w-20 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents && documents.length > 0 ? (
                documents.map((doc) => {
                  // recipientからの対象者名取得
                  const recipient = doc.recipient as {
                    name?: string
                  } | null
                  const recipientName =
                    recipient?.name ?? doc.title ?? '-'

                  return (
                    <tr
                      key={doc.id}
                      className="transition-colors hover:bg-gray-50/60"
                    >
                      {/* チェックボックス */}
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          value={doc.id}
                          className="doc-checkbox h-3.5 w-3.5 rounded border-gray-300"
                          aria-label={`${doc.document_number ?? '未採番'} を選択`}
                        />
                      </td>
                      {/* 文書番号 */}
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                        {doc.document_number ?? '未採番'}
                      </td>
                      {/* 種別 */}
                      <td className="px-3 py-2.5 text-xs text-gray-600">
                        {DOCUMENT_TYPE_LABELS[doc.document_type] ??
                          doc.document_type}
                      </td>
                      {/* 対象者 */}
                      <td className="px-3 py-2.5 text-xs text-gray-900">
                        {recipientName}
                      </td>
                      {/* ステータスバッジ */}
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          status={doc.status as DocumentStatus}
                        />
                      </td>
                      {/* 作成日 */}
                      <td className="px-3 py-2.5 text-xs text-gray-500">
                        {new Date(doc.created_at).toLocaleDateString(
                          'ja-JP'
                        )}
                      </td>
                      {/* 操作 */}
                      <td className="px-3 py-2.5 text-center">
                        <Link href={`/documents/${doc.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                          >
                            開く
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-sm text-gray-400"
                  >
                    {hasFilters
                      ? '条件に一致する文書はありません。フィルタを変更してください。'
                      : '文書がまだありません。'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====== ページネーション ====== */}
      <div className="flex items-center justify-between text-sm">
        {/* 件数表示 */}
        <p className="text-gray-500">
          全 <span className="font-semibold text-gray-700">{totalCount}</span>
          件&ensp;
          {rangeStart}〜{rangeEnd}件表示
        </p>

        {/* ページナビゲーション */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {/* 前へ */}
            {currentPage > 1 ? (
              <Link href={buildUrl({ page: String(currentPage - 1) })}>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}

            {/* ページ番号ボタン（最大7ページ分） */}
            {(() => {
              const maxVisible = 7
              let startPage = Math.max(
                1,
                currentPage - Math.floor(maxVisible / 2)
              )
              const endPage = Math.min(totalPages, startPage + maxVisible - 1)
              if (endPage - startPage + 1 < maxVisible) {
                startPage = Math.max(1, endPage - maxVisible + 1)
              }

              const pages: number[] = []
              for (let i = startPage; i <= endPage; i++) {
                pages.push(i)
              }

              return pages.map((page) => (
                <Link key={page} href={buildUrl({ page: String(page) })}>
                  <Button
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0 text-xs"
                  >
                    {page}
                  </Button>
                </Link>
              ))
            })()}

            {/* 次へ */}
            {currentPage < totalPages ? (
              <Link href={buildUrl({ page: String(currentPage + 1) })}>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ====== チェックボックス一括操作のインラインスクリプト ====== */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var bar = document.getElementById('bulk-actions-bar');
              var countEl = document.getElementById('selected-count');
              var headerCb = document.querySelector('thead input[type="checkbox"]');
              function update() {
                var checked = document.querySelectorAll('.doc-checkbox:checked');
                if (checked.length > 0) {
                  bar.classList.remove('hidden');
                  bar.classList.add('flex');
                } else {
                  bar.classList.add('hidden');
                  bar.classList.remove('flex');
                }
                countEl.textContent = checked.length;
              }
              document.addEventListener('change', function(e) {
                if (e.target === headerCb) {
                  var cbs = document.querySelectorAll('.doc-checkbox');
                  cbs.forEach(function(cb) { cb.checked = headerCb.checked; });
                }
                update();
              });
            })();
          `,
        }}
      />
    </div>
  )
}
