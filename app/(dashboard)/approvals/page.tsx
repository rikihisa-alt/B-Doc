'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CheckSquare,
  AlertTriangle,
  Clock,
  ChevronRight,
} from 'lucide-react'
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS } from '@/types'
import { getDocuments } from '@/lib/store'
import type { LocalDocument } from '@/lib/store'

/**
 * 承認一覧ページ（Client Component）
 * ストアから承認待ち文書を取得して表示
 */
export default function ApprovalsPage() {
  const [pendingDocs, setPendingDocs] = useState<LocalDocument[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const docs = getDocuments()
    const pending = docs.filter(
      (d) =>
        d.status === DOCUMENT_STATUS.PENDING_APPROVAL ||
        d.status === DOCUMENT_STATUS.PENDING_CONFIRM
    )
    setPendingDocs(pending)
    setLoaded(true)
  }, [])

  const pendingCount = pendingDocs.length

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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">承認一覧</h1>
          {pendingCount > 0 && (
            <Badge className="h-7 min-w-[28px] justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {pendingCount}
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-500">
          あなたに割り当てられた承認待ちタスク
        </p>
      </div>

      {/* 承認待ちテーブル */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            承認待ちタスク
            <span className="text-sm font-normal text-slate-500">
              ({pendingCount}件)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingDocs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      文書タイトル
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      種別
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      作成者
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      作成日
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      ステータス
                    </th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {/* 矢印 */}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingDocs.map((doc) => (
                    <tr
                      key={doc.id}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                    >
                      <td className="py-3.5 pr-4">
                        <Link href={`/dashboard/approvals/${doc.id}`} className="block">
                          <p className="font-medium text-slate-900">{doc.title}</p>
                          {doc.document_number && (
                            <p className="mt-0.5 text-xs text-slate-400">{doc.document_number}</p>
                          )}
                        </Link>
                      </td>
                      <td className="py-3.5 pr-4">
                        <Badge variant="secondary" className="text-xs">
                          {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                        </Badge>
                      </td>
                      <td className="py-3.5 pr-4 text-sm text-slate-700">
                        {doc.created_by}
                      </td>
                      <td className="py-3.5 pr-4 text-sm text-slate-500">
                        {new Date(doc.created_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 pr-4">
                        <Badge className={doc.status === 'pending_approval' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-yellow-200 bg-yellow-50 text-yellow-700'}>
                          {doc.status === 'pending_approval' ? '承認待ち' : '確認待ち'}
                        </Badge>
                      </td>
                      <td className="py-3.5">
                        <Link
                          href={`/dashboard/approvals/${doc.id}`}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <CheckSquare className="mb-3 h-12 w-12 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">
                承認待ちのタスクはありません
              </p>
              <p className="mt-1 text-xs text-slate-400">
                新しい承認依頼が届くとここに表示されます
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
