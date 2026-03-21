import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle2, XCircle } from 'lucide-react'

/** ステータスラベルマッピング */
const STATUS_LABELS: Record<string, string> = {
  pending: '承認待ち',
  pending_confirm: '確認待ち',
  pending_approval: '承認待ち',
  in_review: 'レビュー中',
  approved: '承認済み',
  rejected: '却下',
}

/** 文書種別ラベル */
const TYPE_LABELS: Record<string, string> = {
  procedure: '手順書',
  manual: 'マニュアル',
  regulation: '規程',
  form: '帳票',
  report: '報告書',
  minutes: '議事録',
  proposal: '企画書',
  specification: '仕様書',
  other: 'その他',
}

export default async function ApprovalsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザーに関連する承認待ち文書を取得
  // approvals テーブルから pending ステータスのものを取得し、文書情報をJOIN
  const { data: pendingApprovals, error } = await supabase
    .from('approvals')
    .select(
      `
      id,
      status,
      created_at,
      workflow_step_id,
      workflow_steps (
        id,
        step_order,
        approver_role
      ),
      documents (
        id,
        title,
        document_type,
        status,
        created_by,
        created_at,
        user_profiles!documents_created_by_fkey (
          full_name,
          email
        )
      )
    `
    )
    .eq('approver_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // 自分が作成した承認依頼中の文書も取得
  const { data: mySubmittedDocs } = await supabase
    .from('documents')
    .select('id, title, document_type, status, created_at')
    .eq('created_by', user.id)
    .in('status', ['pending', 'in_review'])
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">承認管理</h1>

      {/* 承認待ちタスク */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-yellow-600" />
            あなたの承認待ち
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-red-500">
              データの取得に失敗しました: {error.message}
            </p>
          )}

          {pendingApprovals && pendingApprovals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pr-4 font-medium">文書タイトル</th>
                    <th className="pb-3 pr-4 font-medium">文書種別</th>
                    <th className="pb-3 pr-4 font-medium">申請者</th>
                    <th className="pb-3 pr-4 font-medium">申請日</th>
                    <th className="pb-3 pr-4 font-medium">ステップ</th>
                    <th className="pb-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovals.map((approval: Record<string, unknown>) => {
                    const doc = approval.documents as Record<string, unknown> | null
                    const step = approval.workflow_steps as Record<string, unknown> | null
                    const requester = doc
                      ? (
                          doc.user_profiles as Record<string, unknown> | null
                        )
                      : null

                    return (
                      <tr
                        key={approval.id as string}
                        className="border-b last:border-0"
                      >
                        <td className="py-3 pr-4">
                          <Link
                            href={`/dashboard/documents/${doc?.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {(doc?.title as string) ?? '不明'}
                          </Link>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="secondary">
                            {TYPE_LABELS[(doc?.document_type as string) ?? ''] ??
                              (doc?.document_type as string)}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-gray-700">
                          {(requester?.full_name as string) ??
                            (requester?.email as string) ??
                            '不明'}
                        </td>
                        <td className="py-3 pr-4 text-gray-500">
                          {doc?.created_at
                            ? new Date(
                                doc.created_at as string
                              ).toLocaleDateString('ja-JP')
                            : '-'}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-gray-600">
                            ステップ {(step?.step_order as number) ?? '-'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <Link
                              href={`/dashboard/documents/${doc?.id}?action=approve`}
                              className="inline-flex h-8 items-center rounded-md bg-green-600 px-3 text-xs font-medium text-white transition-colors hover:bg-green-700"
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              承認
                            </Link>
                            <Link
                              href={`/dashboard/documents/${doc?.id}?action=reject`}
                              className="inline-flex h-8 items-center rounded-md bg-red-600 px-3 text-xs font-medium text-white transition-colors hover:bg-red-700"
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              却下
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">
              現在、承認待ちのタスクはありません。
            </p>
          )}
        </CardContent>
      </Card>

      {/* 自分が提出した文書の状況 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">提出中の文書</CardTitle>
        </CardHeader>
        <CardContent>
          {mySubmittedDocs && mySubmittedDocs.length > 0 ? (
            <div className="space-y-3">
              {mySubmittedDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/dashboard/documents/${doc.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{doc.title}</p>
                    <p className="text-sm text-gray-500">
                      {TYPE_LABELS[doc.document_type] ?? doc.document_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        doc.status === 'in_review' ? 'default' : 'secondary'
                      }
                    >
                      {STATUS_LABELS[doc.status] ?? doc.status}
                    </Badge>
                    <span className="text-sm text-gray-400">
                      {new Date(doc.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">
              提出中の文書はありません。
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
