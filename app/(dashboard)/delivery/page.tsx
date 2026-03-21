// TODO: Supabase接続後にDBからデータ取得に切り替え
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
import { DOCUMENT_TYPE_LABELS, STATUS_BADGE_MAP } from '@/types'

// =============================================================================
// 送付管理ページ（デモデータ版）
// =============================================================================

/** 送付ステータスの判定 */
function getDeliveryStatus(
  docStatus: string
): 'pending_delivery' | 'sent' | 'delivered' {
  if (docStatus === 'sent') return 'sent'
  if (docStatus === 'issued') return 'pending_delivery'
  return 'delivered'
}

/** 送付ステータスバッジ */
function DeliveryStatusBadge({ status }: { status: string }) {
  const deliveryStatus = getDeliveryStatus(status)

  switch (deliveryStatus) {
    case 'pending_delivery':
      return (
        <Badge className="border-amber-200 bg-amber-50 text-amber-700">
          <Clock className="mr-1 h-3 w-3" />
          送付待ち
        </Badge>
      )
    case 'sent':
      return (
        <Badge className="border-blue-200 bg-blue-50 text-blue-700">
          <Send className="mr-1 h-3 w-3" />
          送付済み
        </Badge>
      )
    case 'delivered':
      return (
        <Badge className="border-green-200 bg-green-50 text-green-700">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          受領確認済み
        </Badge>
      )
  }
}

// ---------- デモデータ ----------
const demoDocuments = [
  {
    id: 'doc-001',
    document_number: 'DOC-2024-0001',
    title: '在職証明書（田中 太郎）',
    status: 'issued',
    issued_date: '2024-12-18T10:00:00Z',
    recipient: { name: '田中 太郎', email: 'tanaka@example.com' },
    created_at: '2024-12-15T10:00:00Z',
    updated_at: '2024-12-18T10:00:00Z',
    templates: { document_type: 'employment_certificate' },
    user_profiles: { display_name: '管理者 太郎', email: 'admin@example.com' },
  },
  {
    id: 'doc-002',
    document_number: 'DOC-2024-0006',
    title: '在職証明書（渡辺 真理）',
    status: 'sent',
    issued_date: '2024-12-16T14:00:00Z',
    recipient: { name: '渡辺 真理', email: 'watanabe@example.com' },
    created_at: '2024-12-14T09:00:00Z',
    updated_at: '2024-12-17T11:00:00Z',
    templates: { document_type: 'employment_certificate' },
    user_profiles: { display_name: '管理者 太郎', email: 'admin@example.com' },
  },
  {
    id: 'doc-003',
    document_number: 'DOC-2024-0005',
    title: '給与証明書（高橋 翔太）',
    status: 'issued',
    issued_date: '2024-12-19T16:00:00Z',
    recipient: { name: '高橋 翔太', email: 'takahashi@example.com' },
    created_at: '2024-12-17T13:00:00Z',
    updated_at: '2024-12-19T16:00:00Z',
    templates: { document_type: 'salary_certificate' },
    user_profiles: { display_name: '総務部 花子', email: 'hanako@example.com' },
  },
  {
    id: 'doc-004',
    document_number: 'DOC-2024-0008',
    title: '退職証明書（伊藤 大輔）',
    status: 'sent',
    issued_date: '2024-12-15T09:00:00Z',
    recipient: { name: '伊藤 大輔', email: 'ito@example.com' },
    created_at: '2024-12-12T10:00:00Z',
    updated_at: '2024-12-16T15:30:00Z',
    templates: { document_type: 'retirement_certificate' },
    user_profiles: { display_name: '人事部 次郎', email: 'jiro@example.com' },
  },
]

export default function DeliveryPage() {
  const documents = demoDocuments

  // 集計
  const pendingCount = documents.filter(
    (d: Record<string, unknown>) => d.status === 'issued'
  ).length
  const sentCount = documents.filter(
    (d: Record<string, unknown>) => d.status === 'sent'
  ).length
  const totalCount = documents.length

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
              <p className="text-2xl font-bold text-slate-900">
                {pendingCount}
              </p>
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
          {documents && documents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      文書番号
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      タイトル
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      種別
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      宛先
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      送付状態
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      発行日
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((doc: Record<string, unknown>) => {
                    const template = doc.templates as Record<
                      string,
                      unknown
                    > | null
                    const recipient = doc.recipient as Record<
                      string,
                      unknown
                    > | null
                    const docType =
                      (template?.document_type as string) ?? ''

                    return (
                      <tr
                        key={doc.id as string}
                        className="transition-colors hover:bg-slate-50"
                      >
                        {/* 文書番号 */}
                        <td className="px-6 py-3.5">
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-600">
                            {(doc.document_number as string) ?? '--'}
                          </code>
                        </td>

                        {/* タイトル */}
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/dashboard/documents/${doc.id}`}
                            className="font-medium text-slate-900 hover:text-blue-600 hover:underline"
                          >
                            {doc.title as string}
                          </Link>
                        </td>

                        {/* 種別 */}
                        <td className="px-4 py-3.5">
                          <Badge variant="secondary" className="text-xs">
                            {DOCUMENT_TYPE_LABELS[docType] ?? docType}
                          </Badge>
                        </td>

                        {/* 宛先 */}
                        <td className="px-4 py-3.5 text-sm text-slate-600">
                          {recipient ? (
                            <div>
                              <p className="text-slate-700">
                                {(recipient.name as string) ?? '--'}
                              </p>
                              {recipient.email ? (
                                <p className="text-xs text-slate-400">
                                  {String(recipient.email)}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-slate-400">--</span>
                          )}
                        </td>

                        {/* 送付状態 */}
                        <td className="px-4 py-3.5">
                          <DeliveryStatusBadge
                            status={doc.status as string}
                          />
                        </td>

                        {/* 発行日 */}
                        <td className="px-4 py-3.5 text-sm text-slate-500">
                          {doc.issued_date
                            ? new Date(
                                doc.issued_date as string
                              ).toLocaleDateString('ja-JP')
                            : '--'}
                        </td>

                        {/* 操作 */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {doc.status === 'issued' && (
                              <>
                                {/* メール送付 */}
                                <form
                                  action={`/api/documents/${doc.id}/send`}
                                  method="POST"
                                >
                                  <input
                                    type="hidden"
                                    name="method"
                                    value="email"
                                  />
                                  <Button
                                    type="submit"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs"
                                  >
                                    <Mail className="mr-1 h-3.5 w-3.5" />
                                    メール
                                  </Button>
                                </form>

                                {/* 郵送記録 */}
                                <form
                                  action={`/api/documents/${doc.id}/send`}
                                  method="POST"
                                >
                                  <input
                                    type="hidden"
                                    name="method"
                                    value="post"
                                  />
                                  <Button
                                    type="submit"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs"
                                  >
                                    <Truck className="mr-1 h-3.5 w-3.5" />
                                    郵送記録
                                  </Button>
                                </form>
                              </>
                            )}

                            {doc.status === 'sent' && (
                              <form
                                action={`/api/documents/${doc.id}/confirm-receipt`}
                                method="POST"
                              >
                                <Button
                                  type="submit"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs text-green-600 hover:text-green-700"
                                >
                                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                  受領確認
                                </Button>
                              </form>
                            )}

                            {/* 詳細リンク */}
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                            >
                              <Link
                                href={`/dashboard/documents/${doc.id}`}
                              >
                                詳細
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Package className="mb-3 h-10 w-10 text-slate-200" />
              <p className="text-sm text-slate-500">
                送付対象の文書はありません
              </p>
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
