import { createServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, CheckSquare, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 統計情報の取得
  const [
    { count: totalDocuments },
    { count: pendingApprovals },
    { count: draftDocuments },
    { count: issuedDocuments },
  ] = await Promise.all([
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('created_by', user?.id ?? ''),
    supabase.from('documents').select('*', { count: 'exact', head: true }).in('status', ['pending_confirm', 'pending_approval']),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'draft').eq('created_by', user?.id ?? ''),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'issued'),
  ])

  // 最近の文書取得
  const { data: recentDocuments } = await supabase
    .from('documents')
    .select('id, title, document_number, status, document_type, created_at')
    .eq('created_by', user?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = [
    { label: '全文書', value: totalDocuments ?? 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '承認待ち', value: pendingApprovals ?? 0, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: '下書き', value: draftDocuments ?? 0, icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-50' },
    { label: '発行済み', value: issuedDocuments ?? 0, icon: CheckSquare, color: 'text-green-600', bg: 'bg-green-50' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>

      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 最近の文書 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">最近の文書</CardTitle>
        </CardHeader>
        <CardContent>
          {recentDocuments && recentDocuments.length > 0 ? (
            <div className="space-y-3">
              {recentDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/dashboard/documents/${doc.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{doc.title}</p>
                    <p className="text-sm text-gray-500">
                      {doc.document_number ?? '未採番'} | {doc.document_type}
                    </p>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(doc.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500 py-8">
              文書がまだありません。新しい文書を作成しましょう。
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
