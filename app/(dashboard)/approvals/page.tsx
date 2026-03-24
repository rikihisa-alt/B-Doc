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
  FileText,
  CalendarClock,
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

  /** 作成日からの経過日数を計算 */
  const getDaysAgo = (dateStr: string): number => {
    const created = new Date(dateStr)
    const now = new Date()
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm text-gray-400">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">承認一覧</h1>
          {pendingCount > 0 && (
            <Badge className="h-7 min-w-[28px] justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
              {pendingCount}
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-500">
          あなたに割り当てられた承認待ちタスク
        </p>
      </div>

      {/* 承認待ちカードリスト */}
      {pendingDocs.length > 0 ? (
        <div className="space-y-3">
          {pendingDocs.map((doc) => {
            const daysAgo = getDaysAgo(doc.created_at)
            const isUrgent = daysAgo >= 3
            return (
              <Link key={doc.id} href={`/approvals/${doc.id}`} className="block">
                <Card className={`group transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${isUrgent ? 'border-l-4 border-l-red-400 ring-1 ring-red-100' : 'border-l-4 border-l-blue-400 hover:border-l-blue-500'}`}>
                  <CardContent className="flex items-center gap-5 p-5">
                    {/* アイコン */}
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isUrgent ? 'bg-red-50' : 'bg-blue-50'}`}>
                      {isUrgent ? (
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                      ) : (
                        <FileText className="h-6 w-6 text-blue-500" />
                      )}
                    </div>

                    {/* メイン情報 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {doc.title}
                        </p>
                        {isUrgent && (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                            <CalendarClock className="h-3 w-3" />
                            {daysAgo}日経過
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        {doc.document_number && (
                          <span className="font-mono">{doc.document_number}</span>
                        )}
                        <span className="text-slate-300">|</span>
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                        </Badge>
                        <span className="text-slate-300">|</span>
                        <span>作成者: {doc.created_by}</span>
                      </div>
                      {/* ステータスタイムライン */}
                      <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                        <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          作成済み
                        </div>
                        <div className="h-px w-3 bg-slate-300" />
                        <div className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                          {doc.status === 'pending_approval' ? '承認待ち' : '確認待ち'}
                        </div>
                        <div className="h-px w-3 bg-slate-200" />
                        <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-400">
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                          発行
                        </div>
                      </div>
                    </div>

                    {/* 日付と矢印 */}
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-slate-500">
                        {new Date(doc.created_at).toLocaleDateString('ja-JP', {
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </p>
                      <ChevronRight className="mt-1 ml-auto h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="rounded-2xl bg-green-50 p-5">
              <CheckSquare className="h-12 w-12 text-green-300 empty-state-icon" />
            </div>
            <p className="mt-4 text-base font-medium text-slate-600">
              承認待ちのタスクはありません
            </p>
            <p className="mt-1 text-sm text-slate-400">
              新しい承認依頼が届くとここに表示されます
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
