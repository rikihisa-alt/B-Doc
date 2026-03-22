'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/document/status-badge'
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS } from '@/types'
import { getDocuments, getApprovalRecords } from '@/lib/store'
import type { LocalDocument } from '@/lib/store'
import {
  Plus,
  Settings,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'

/**
 * ダッシュボードページ（Client Component）
 * ストアからデータを動的に取得して表示
 */
export default function DashboardPage() {
  const [documents, setDocuments] = useState<LocalDocument[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const docs = getDocuments()
    setDocuments(docs)
    setLoaded(true)
  }, [])

  const isAdmin = true

  // ストアからカウントを動的に計算
  const pendingApprovalCount = documents.filter(
    (d) => d.status === DOCUMENT_STATUS.PENDING_APPROVAL || d.status === DOCUMENT_STATUS.PENDING_CONFIRM
  ).length
  const returnedCount = documents.filter(
    (d) => d.status === DOCUMENT_STATUS.RETURNED
  ).length
  const draftCount = documents.filter(
    (d) => d.status === DOCUMENT_STATUS.DRAFT
  ).length

  // 最近の文書（updated_at降順、上位10件）
  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10)

  const actionItems = [
    {
      label: '承認待ち',
      count: pendingApprovalCount,
      href: '/dashboard/approvals',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverBg: 'hover:bg-blue-100',
      urgent: false,
    },
    {
      label: '差戻し',
      count: returnedCount,
      href: '/dashboard/documents?status=returned',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      hoverBg: 'hover:bg-red-100',
      urgent: returnedCount > 0,
    },
    {
      label: '下書き',
      count: draftCount,
      href: '/dashboard/documents?status=draft',
      color: 'text-gray-700',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      hoverBg: 'hover:bg-gray-100',
      urgent: false,
    },
  ]

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="mt-0.5 text-xs text-gray-500">
          {new Date().toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          })}
        </p>
      </div>

      {/* アクション待ち件数 */}
      <div className="grid grid-cols-3 gap-3">
        {actionItems.map((item) => (
          <Link key={item.label} href={item.href}>
            <div
              className={`rounded-lg border p-4 transition-colors ${item.bgColor} ${item.borderColor} ${item.hoverBg} ${item.urgent ? 'ring-1 ring-red-300' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${item.color}`}>{item.label}</span>
                {item.urgent && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
              </div>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${item.color}`}>
                {item.count}<span className="ml-0.5 text-sm font-normal">件</span>
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* 最近の文書テーブル */}
      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">最近の文書</h2>
          <Link href="/dashboard/documents">
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-gray-500">
              すべて表示
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/60">
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">文書番号</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">種別</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">タイトル</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ステータス</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">作成日</th>
                <th className="w-16 px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentDocuments.map((doc) => (
                <tr key={doc.id} className="transition-colors hover:bg-gray-50/60">
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">{doc.document_number ?? '未採番'}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">{DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}</td>
                  <td className="max-w-[240px] truncate px-4 py-2 text-xs font-medium text-gray-900">{doc.title}</td>
                  <td className="px-4 py-2"><StatusBadge status={doc.status} /></td>
                  <td className="px-4 py-2 text-xs text-gray-500">{new Date(doc.created_at).toLocaleDateString('ja-JP')}</td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/dashboard/documents/${doc.id}`}>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">開く</Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {recentDocuments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                    文書がまだありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">クイックアクション</span>
        <div className="mx-2 h-4 w-px bg-gray-200" />
        <Link href="/dashboard/documents/new/select-template">
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            新規文書作成
          </Button>
        </Link>
        {isAdmin && (
          <Link href="/dashboard/templates">
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              テンプレート管理
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
