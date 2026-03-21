import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/document/status-badge'
import {
  DOCUMENT_TYPE_LABELS,
  type DocumentStatus,
} from '@/types'
import {
  Plus,
  Settings,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'

/**
 * ダッシュボードページ（Server Component）
 * 業務ERP風の情報密度の高いレイアウト
 * - 上段: アクション待ち件数（承認待ち・差戻し・下書き）
 * - 中段: 最近の文書テーブル（直近10件）
 * - 下段: クイックアクション
 */
export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ユーザープロフィール取得（ロール判定用）
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, roles, display_name')
    .eq('id', user?.id ?? '')
    .single()

  const isAdmin =
    profile?.roles?.includes('system_admin') ||
    profile?.roles?.includes('template_manager') ||
    false

  // ---------- 統計情報の一括取得 ----------
  const [
    { count: pendingApprovalCount },
    { count: returnedCount },
    { count: draftCount },
  ] = await Promise.all([
    // 承認待ち件数（自分が承認者として割り当てられている or 組織全体）
    supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending_confirm', 'pending_approval']),
    // 差戻し件数（自分が作成した文書のうち差戻し状態）
    supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'returned')
      .eq('created_by', user?.id ?? ''),
    // 下書き件数（自分の下書き）
    supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft')
      .eq('created_by', user?.id ?? ''),
  ])

  // ---------- 最近の文書（直近10件） ----------
  const { data: recentDocuments } = await supabase
    .from('documents')
    .select(
      'id, document_number, title, document_type, status, created_at, recipient'
    )
    .eq('created_by', user?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(10)

  // アクション待ちアイテム
  const actionItems = [
    {
      label: '承認待ち',
      count: pendingApprovalCount ?? 0,
      href: '/approvals',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverBg: 'hover:bg-blue-100',
      urgent: false,
    },
    {
      label: '差戻し',
      count: returnedCount ?? 0,
      href: '/documents?status=returned',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      hoverBg: 'hover:bg-red-100',
      urgent: (returnedCount ?? 0) > 0,
    },
    {
      label: '下書き',
      count: draftCount ?? 0,
      href: '/documents?status=draft',
      color: 'text-gray-700',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      hoverBg: 'hover:bg-gray-100',
      urgent: false,
    },
  ]

  return (
    <div className="space-y-5">
      {/* ページヘッダー */}
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

      {/* ====== 上段: アクション待ち件数 ====== */}
      <div className="grid grid-cols-3 gap-3">
        {actionItems.map((item) => (
          <Link key={item.label} href={item.href}>
            <div
              className={`
                rounded-lg border p-4 transition-colors
                ${item.bgColor} ${item.borderColor} ${item.hoverBg}
                ${item.urgent ? 'ring-1 ring-red-300' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${item.color}`}>
                  {item.label}
                </span>
                {item.urgent && (
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                )}
              </div>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${item.color}`}>
                {item.count}
                <span className="ml-0.5 text-sm font-normal">件</span>
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* ====== 中段: 最近の文書テーブル ====== */}
      <div className="rounded-lg border bg-white">
        {/* テーブルヘッダー */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            最近の文書
          </h2>
          <Link href="/documents">
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-gray-500">
              すべて表示
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* テーブル本体 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/60">
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  文書番号
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  種別
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  タイトル
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  ステータス
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  作成日
                </th>
                <th className="w-16 px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentDocuments && recentDocuments.length > 0 ? (
                recentDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className="transition-colors hover:bg-gray-50/60"
                  >
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">
                      {doc.document_number ?? '未採番'}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {DOCUMENT_TYPE_LABELS[doc.document_type] ??
                        doc.document_type}
                    </td>
                    <td className="max-w-[240px] truncate px-4 py-2 text-xs font-medium text-gray-900">
                      {doc.title}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge
                        status={doc.status as DocumentStatus}
                      />
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/documents/${doc.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                        >
                          開く
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-xs text-gray-400"
                  >
                    作成した文書はまだありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====== 下段: クイックアクション ====== */}
      <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          クイックアクション
        </span>
        <div className="mx-2 h-4 w-px bg-gray-200" />

        <Link href="/documents/new/select-template">
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            新規文書作成
          </Button>
        </Link>

        {/* 管理者のみ: テンプレート管理 */}
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
