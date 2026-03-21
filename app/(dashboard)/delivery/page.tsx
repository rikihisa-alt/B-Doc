import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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
// 送付管理ページ（Server Component）
// - 発行済み文書の送付状況一覧
// - メール送信 / 郵送記録
// - 受領確認トラッキング
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

export default async function DeliveryPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 発行済み・送付済みの文書を取得
  const { data: documents, error } = await supabase
    .from('documents')
    .select(
      `
      id,
      document_number,
      title,
      status,
      issued_date,
      recipient,
      created_at,
      updated_at,
      templates (
        document_type
      ),
      user_profiles!documents_created_by_fkey (
        display_name,
        email
      )
    `
    )
    .in('status', ['issued', 'sent'])
    .order('updated_at', { ascending: false })
    .limit(50)

  // 集計
  const pendingCount =
    documents?.filter((d: Record<string, unknown>) => d.status === 'issued')
      .length ?? 0
  const sentCount =
    documents?.filter((d: Record<string, unknown>) => d.status === 'sent')
      .length ?? 0
  const totalCount = documents?.length ?? 0

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

      {/* エラー表示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-red-700">
              データの取得に失敗しました: {error.message}
            </p>
          </CardContent>
        </Card>
      )}

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
