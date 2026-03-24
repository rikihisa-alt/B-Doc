'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/document/status-badge'
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS } from '@/types'
import { getDocuments, getApprovalRecords, getTemplates, getAuditLogs, getCurrentUser } from '@/lib/store'
import type { LocalDocument, LocalAuditLog } from '@/lib/store'
import {
  Plus,
  Settings,
  ChevronRight,
  AlertTriangle,
  FileText,
  Layout,
  Clock,
  Activity,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'

/** 操作種別の日本語ラベル */
const OPERATION_LABELS: Record<string, string> = {
  create: '作成', update: '更新', delete: '削除',
  status_change: 'ステータス変更', approve: '承認', reject: '却下',
  return: '差戻し', issue: '発行', send: '送付', cancel: '取消',
  download: 'ダウンロード', view: '閲覧', login: 'ログイン', logout: 'ログアウト',
  document_create: '文書作成', document_pdf_generate: 'PDF生成',
  template_submit: '承認申請', template_approve: '承認', template_reject: '差戻し',
  role_change: 'ロール変更',
}

/** 操作の色（タイムライン用） */
const OPERATION_COLORS: Record<string, string> = {
  create: 'bg-green-500', update: 'bg-blue-500', delete: 'bg-red-500',
  approve: 'bg-emerald-500', reject: 'bg-red-500', issue: 'bg-indigo-500',
  document_create: 'bg-green-500', document_pdf_generate: 'bg-indigo-500',
  template_submit: 'bg-amber-500', template_approve: 'bg-emerald-500',
  template_reject: 'bg-red-500', role_change: 'bg-purple-500',
}

/**
 * ダッシュボードページ（Client Component）
 * ストアからデータを動的に取得して表示
 */
export default function DashboardPage() {
  const [documents, setDocuments] = useState<LocalDocument[]>([])
  const [auditLogs, setAuditLogs] = useState<LocalAuditLog[]>([])
  const [loaded, setLoaded] = useState(false)
  const [templateCount, setTemplateCount] = useState(0)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    const docs = getDocuments()
    const logs = getAuditLogs()
    const templates = getTemplates()
    const user = getCurrentUser()
    setDocuments(docs)
    setAuditLogs(logs)
    setTemplateCount(templates.length)
    setUserName(user.name)
    setUserRole(user.role === 'admin' ? '管理者' : user.role === 'manager' ? '管理職' : '一般')
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
  const totalDocCount = documents.length

  // 最近の文書（updated_at降順、上位10件）
  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10)

  // 最近の操作ログ（5件）
  const recentLogs = [...auditLogs]
    .sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())
    .slice(0, 5)

  const actionItems = [
    {
      label: '承認待ち',
      count: pendingApprovalCount,
      href: '/approvals',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverBg: 'hover:bg-blue-100',
      iconBg: 'bg-blue-100',
      icon: <Clock className="h-5 w-5 text-blue-600" />,
      urgent: false,
    },
    {
      label: '差戻し',
      count: returnedCount,
      href: '/documents?status=returned',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      hoverBg: 'hover:bg-red-100',
      iconBg: 'bg-red-100',
      icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
      urgent: returnedCount > 0,
    },
    {
      label: '下書き',
      count: draftCount,
      href: '/documents?status=draft',
      color: 'text-slate-700',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      hoverBg: 'hover:bg-slate-100',
      iconBg: 'bg-slate-100',
      icon: <FileText className="h-5 w-5 text-slate-600" />,
      urgent: false,
    },
  ]

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
      {/* ウェルカムメッセージ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            おかえりなさい、{userName}さん
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {new Date().toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}
            <span className="ml-2 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {userRole}
            </span>
          </p>
        </div>
        <Link href="/documents/new/select-template">
          <Button className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            新規文書作成
          </Button>
        </Link>
      </div>

      {/* アクション待ち件数カード */}
      <div className="grid grid-cols-3 gap-4">
        {actionItems.map((item) => (
          <Link key={item.label} href={item.href}>
            <div
              className={`rounded-xl border p-5 transition-all duration-200 card-hover ${item.bgColor} ${item.borderColor} ${item.hoverBg} ${item.urgent ? 'ring-2 ring-red-200 shadow-sm' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.iconBg}`}>
                  {item.icon}
                </div>
                <div>
                  <span className={`text-xs font-medium ${item.color}`}>{item.label}</span>
                  <p className={`text-3xl font-bold tabular-nums leading-tight ${item.color}`}>
                    {item.count}<span className="ml-1 text-sm font-normal opacity-70">件</span>
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">総文書数</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{totalDocCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
            <Layout className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">テンプレート数</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{templateCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 最近の文書テーブル（2/3幅） */}
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <FileText className="h-4 w-4 text-slate-400" />
              最近の文書
            </h2>
            <Link href="/documents">
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-gray-500 hover:text-blue-600">
                すべて表示
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">文書番号</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">種別</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">タイトル</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ステータス</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">作成日</th>
                  <th className="w-16 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentDocuments.map((doc) => (
                  <tr key={doc.id} className="transition-colors duration-150 hover:bg-blue-50/40">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{doc.document_number ?? '未採番'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}</td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-xs font-medium text-gray-900">{doc.title}</td>
                    <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(doc.created_at).toLocaleDateString('ja-JP')}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/documents/${doc.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs hover:text-blue-600">
                          開く
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {recentDocuments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <FileText className="h-10 w-10 text-slate-200 empty-state-icon" />
                        <div>
                          <p className="text-sm font-medium text-slate-500">文書がまだありません</p>
                          <p className="mt-0.5 text-xs text-slate-400">新規作成から最初の文書を作成しましょう</p>
                        </div>
                        <Link href="/documents/new/select-template">
                          <Button size="sm" variant="outline" className="mt-1 gap-1.5">
                            <Plus className="h-3.5 w-3.5" />
                            最初の文書を作成
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 最近の操作タイムライン（1/3幅） */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <Activity className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-gray-900">最近の操作</h2>
          </div>
          <div className="p-4">
            {recentLogs.length > 0 ? (
              <div className="space-y-0">
                {recentLogs.map((log, idx) => (
                  <div key={log.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {/* タイムラインの縦線 */}
                    {idx < recentLogs.length - 1 && (
                      <div className="absolute left-[9px] top-5 h-full w-px bg-slate-200" />
                    )}
                    {/* ドット */}
                    <div className={`relative z-10 mt-0.5 h-[18px] w-[18px] shrink-0 rounded-full border-2 border-white shadow-sm ${OPERATION_COLORS[log.operation] ?? 'bg-slate-400'}`} />
                    {/* 内容 */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-800">
                        {OPERATION_LABELS[log.operation] ?? log.operation}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {log.target_label ?? log.target_id?.slice(0, 8)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {new Date(log.executed_at).toLocaleString('ja-JP', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Activity className="h-8 w-8 text-slate-200 empty-state-icon" />
                <p className="mt-2 text-xs text-slate-400">まだ操作がありません</p>
              </div>
            )}
            <Link href="/audit-logs" className="mt-4 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-blue-600">
              すべての操作ログ
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">クイックアクション</span>
        <div className="mx-1 h-5 w-px bg-gray-200" />
        <Link href="/documents/new/select-template">
          <Button size="sm" className="h-8 gap-1.5 shadow-sm">
            <Plus className="h-3.5 w-3.5" />
            新規文書作成
          </Button>
        </Link>
        {isAdmin && (
          <Link href="/templates">
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
