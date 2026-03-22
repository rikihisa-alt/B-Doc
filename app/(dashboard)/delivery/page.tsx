'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Send,
  Mail,
  Truck,
  CheckCircle2,
  Clock,
  FileText,
  Package,
} from 'lucide-react'
import Link from 'next/link'
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS } from '@/types'
import { getDocuments } from '@/lib/store'
import type { LocalDocument } from '@/lib/store'

// =============================================================================
// 送付管理ページ（Client Component - ストアベース版）
// =============================================================================

/** 送付ステータスバッジ */
function DeliveryStatusBadge({ status }: { status: string }) {
  if (status === 'issued') {
    return (
      <Badge className="border-amber-200 bg-amber-50 text-amber-700">
        <Clock className="mr-1 h-3 w-3" />
        送付待ち
      </Badge>
    )
  }
  if (status === 'sent') {
    return (
      <Badge className="border-blue-200 bg-blue-50 text-blue-700">
        <Send className="mr-1 h-3 w-3" />
        送付済み
      </Badge>
    )
  }
  return (
    <Badge className="border-green-200 bg-green-50 text-green-700">
      <CheckCircle2 className="mr-1 h-3 w-3" />
      受領確認済み
    </Badge>
  )
}

export default function DeliveryPage() {
  const [documents, setDocuments] = useState<LocalDocument[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const allDocs = getDocuments()
    // 発行済みまたは送付済みの文書のみ表示
    const deliveryDocs = allDocs.filter(
      (d) => d.status === DOCUMENT_STATUS.ISSUED || d.status === DOCUMENT_STATUS.SENT
    )
    setDocuments(deliveryDocs)
    setLoaded(true)
  }, [])

  // 集計
  const pendingCount = documents.filter((d) => d.status === 'issued').length
  const sentCount = documents.filter((d) => d.status === 'sent').length
  const totalCount = documents.length

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
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Send className="h-6 w-6 text-indigo-600" />
          送付管理
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          発行済み文書の送付と受領確認を管理します
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
              <p className="text-xs text-slate-500">送付待ち</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Send className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{sentCount}</p>
              <p className="text-xs text-slate-500">送付済み</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50">
              <FileText className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
              <p className="text-xs text-slate-500">全件</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 文書テーブル */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">送付対象文書</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {documents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">文書番号</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">タイトル</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">種別</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">送付状態</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">発行日</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-3.5">
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-600">
                          {doc.document_number ?? '--'}
                        </code>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/documents/${doc.id}`}
                          className="font-medium text-slate-900 hover:text-blue-600 hover:underline"
                        >
                          {doc.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="secondary" className="text-xs">
                          {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <DeliveryStatusBadge status={doc.status} />
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">
                        {doc.issued_at
                          ? new Date(doc.issued_at).toLocaleDateString('ja-JP')
                          : '--'}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                            <Link href={`/documents/${doc.id}`}>
                              詳細
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Package className="mb-3 h-10 w-10 text-slate-200" />
              <p className="text-sm text-slate-500">送付対象の文書はありません</p>
              <p className="mt-1 text-xs text-slate-400">
                文書が発行されるとここに表示されます
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
