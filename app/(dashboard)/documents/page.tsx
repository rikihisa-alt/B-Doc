'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/document/status-badge'
import {
  DOCUMENT_TYPE_LABELS,
  STATUS_BADGE_MAP,
  type DocumentStatus,
} from '@/types'
import { getDocuments } from '@/lib/store'
import type { LocalDocument } from '@/lib/store'
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  FileText,
} from 'lucide-react'

// ページあたりの表示件数
const PAGE_SIZE = 20

/**
 * 文書一覧ページ（Client Component）
 * ストアからデータ取得、フィルタ・ページネーション付き
 */
export default function DocumentsPage() {
  const router = useRouter()

  // ストアデータ
  const [allDocuments, setAllDocuments] = useState<LocalDocument[]>([])
  const [loaded, setLoaded] = useState(false)

  // フィルタ状態
  const [filterDocNumber, setFilterDocNumber] = useState('')
  const [filterDocType, setFilterDocType] = useState('')
  const [filterKeyword, setFilterKeyword] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  // ページネーション
  const [currentPage, setCurrentPage] = useState(1)

  // ソート
  const [sortField, setSortField] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    setAllDocuments(getDocuments())
    setLoaded(true)
  }, [])

  // フィルタ適用済みの文書
  const filteredDocuments = useMemo(() => {
    let docs = [...allDocuments]

    if (filterDocNumber) {
      docs = docs.filter((d) =>
        d.document_number?.toLowerCase().includes(filterDocNumber.toLowerCase())
      )
    }
    if (filterDocType) {
      docs = docs.filter((d) => d.document_type === filterDocType)
    }
    if (filterKeyword) {
      const kw = filterKeyword.toLowerCase()
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(kw) ||
          (d.document_number?.toLowerCase().includes(kw) ?? false)
      )
    }
    if (filterStatus) {
      docs = docs.filter((d) => d.status === filterStatus)
    }
    if (filterDateFrom) {
      docs = docs.filter((d) => d.created_at >= filterDateFrom)
    }
    if (filterDateTo) {
      docs = docs.filter((d) => d.created_at <= filterDateTo + 'T23:59:59Z')
    }

    // ソート
    docs.sort((a, b) => {
      const aObj = a as unknown as Record<string, string | null>
      const bObj = b as unknown as Record<string, string | null>
      const aVal = aObj[sortField] ?? ''
      const bVal = bObj[sortField] ?? ''
      const cmp = aVal.localeCompare(bVal)
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return docs
  }, [allDocuments, filterDocNumber, filterDocType, filterKeyword, filterStatus, filterDateFrom, filterDateTo, sortField, sortOrder])

  const totalCount = filteredDocuments.length
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const offset = (currentPage - 1) * PAGE_SIZE
  const pageDocuments = filteredDocuments.slice(offset, offset + PAGE_SIZE)

  const rangeStart = totalCount > 0 ? offset + 1 : 0
  const rangeEnd = Math.min(offset + PAGE_SIZE, totalCount)

  const hasFilters = !!(filterDocNumber || filterKeyword || filterStatus || filterDocType || filterDateFrom || filterDateTo)

  // 検索実行
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
  }

  // フィルタクリア
  const handleClear = () => {
    setFilterDocNumber('')
    setFilterDocType('')
    setFilterKeyword('')
    setFilterStatus('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setCurrentPage(1)
  }

  // ソートトグル
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  const sortIndicator = (field: string): string => {
    if (sortField !== field && !(field === 'created_at' && sortField === 'created_at')) return ''
    if (sortField !== field) return ''
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }

  // PDF ダウンロード
  const handleDownloadPdf = async (doc: LocalDocument) => {
    try {
      let body = doc.body_template
      for (const [key, value] of Object.entries(doc.values)) {
        body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
      }

      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: doc.title,
          document_number: doc.document_number,
          document_type: doc.document_type,
          values: doc.values,
          body_template: doc.body_template,
          issued_at: doc.issued_at || new Date().toISOString(),
        }),
      })

      if (!res.ok) throw new Error('PDF生成に失敗しました')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc.document_number || doc.title}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      alert('PDF生成エラー: ' + (error instanceof Error ? error.message : '不明なエラー'))
    }
  }

  // ステータスオプション
  const statusOptions = Object.entries(STATUS_BADGE_MAP).map(
    ([value, info]) => ({ value, label: info.label })
  )

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">文書一覧</h1>
          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-600 tabular-nums">
            {totalCount}<span className="ml-0.5 text-xs font-normal text-slate-400">件</span>
          </span>
        </div>
        <Link href="/documents/new/select-template">
          <Button size="sm" className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      {/* フィルタバー */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-5 shadow-sm">
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-7">
            {/* 文書番号 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                文書番号
              </label>
              <Input
                placeholder="EMP-2026..."
                value={filterDocNumber}
                onChange={(e) => setFilterDocNumber(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            {/* 種別 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                種別
              </label>
              <select
                value={filterDocType}
                onChange={(e) => setFilterDocType(e.target.value)}
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

            {/* キーワード検索 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                タイトル / 文書番号
              </label>
              <Input
                placeholder="キーワード検索..."
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* ステータス */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                ステータス
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
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
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="h-8 text-xs"
                />
                <span className="text-xs text-gray-400">~</span>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* 検索・クリアボタン */}
            <div className="flex items-end gap-2 lg:col-span-2 xl:col-span-2">
              <Button type="submit" size="sm" className="h-8 px-3">
                <Search className="mr-1 h-3.5 w-3.5" />
                検索
              </Button>
              {hasFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-gray-500"
                  onClick={handleClear}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  クリア
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* 文書テーブル */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-zebra">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {/* 文書番号 */}
                <th className="px-3 py-2.5 text-left">
                  <button
                    type="button"
                    onClick={() => handleSort('document_number')}
                    className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900"
                  >
                    文書番号{sortIndicator('document_number')}
                  </button>
                </th>
                {/* 種別 */}
                <th className="px-3 py-2.5 text-left">
                  <button
                    type="button"
                    onClick={() => handleSort('document_type')}
                    className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900"
                  >
                    種別{sortIndicator('document_type')}
                  </button>
                </th>
                {/* タイトル */}
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  タイトル
                </th>
                {/* ステータス */}
                <th className="px-3 py-2.5 text-left">
                  <button
                    type="button"
                    onClick={() => handleSort('status')}
                    className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900"
                  >
                    ステータス{sortIndicator('status')}
                  </button>
                </th>
                {/* 作成日 */}
                <th className="px-3 py-2.5 text-left">
                  <button
                    type="button"
                    onClick={() => handleSort('created_at')}
                    className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900"
                  >
                    作成日{sortIndicator('created_at')}
                  </button>
                </th>
                {/* 操作 */}
                <th className="w-32 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageDocuments.length > 0 ? (
                pageDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className="transition-colors duration-150 hover:bg-blue-50/40 cursor-pointer"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                      {doc.document_number ?? '未採番'}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">
                      {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                    </td>
                    <td className="max-w-[240px] truncate px-3 py-2.5 text-xs font-medium text-gray-900">
                      {doc.title}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={doc.status as DocumentStatus} />
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/documents/${doc.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs">
                            開く
                          </Button>
                        </Link>
                        {doc.status === 'issued' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleDownloadPdf(doc)}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-20 text-center"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="h-12 w-12 text-slate-200 empty-state-icon" />
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          {hasFilters ? '条件に一致する文書がありません' : '文書がまだありません'}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {hasFilters ? 'フィルタを変更してお試しください' : '新規作成から最初の文書を作成しましょう'}
                        </p>
                      </div>
                      {!hasFilters && (
                        <Link href="/documents/new/select-template">
                          <Button size="sm" variant="outline" className="mt-2 gap-1.5">
                            <Plus className="h-3.5 w-3.5" />
                            最初の文書を作成
                          </Button>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ページネーション */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm shadow-sm">
        <p className="text-gray-500">
          全 <span className="font-bold text-gray-800">{totalCount}</span>
          件中&ensp;
          <span className="font-semibold text-gray-700">{rangeStart}〜{rangeEnd}</span>件表示
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {(() => {
              const maxVisible = 7
              let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
              const endPage = Math.min(totalPages, startPage + maxVisible - 1)
              if (endPage - startPage + 1 < maxVisible) {
                startPage = Math.max(1, endPage - maxVisible + 1)
              }
              const pages: number[] = []
              for (let i = startPage; i <= endPage; i++) {
                pages.push(i)
              }
              return pages.map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))
            })()}

            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
