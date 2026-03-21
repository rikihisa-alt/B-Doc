import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DOCUMENT_TYPE_LABELS, STATUS_BADGE_MAP, type DocumentStatus } from '@/types'
import { ArrowLeft, FileText, CheckCircle, XCircle } from 'lucide-react'
import { DocumentActions } from '@/components/document/document-actions'

/**
 * 文書詳細ページ（Server Component）
 */
export default async function DocumentDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 文書データ取得
  const { data: document, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !document) {
    notFound()
  }

  // 入力値の取得
  const { data: docValues } = await supabase
    .from('document_values')
    .select('*')
    .eq('document_id', params.id)

  // 承認履歴の取得
  const { data: approvals } = await supabase
    .from('approval_records')
    .select('*')
    .eq('document_id', params.id)
    .order('created_at', { ascending: true })

  const status = document.status as DocumentStatus
  const badgeInfo = STATUS_BADGE_MAP[status]
  const isOwner = user?.id === document.created_by

  return (
    <div className="space-y-6">
      {/* 戻るリンク */}
      <Link
        href="/dashboard/documents"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        文書一覧に戻る
      </Link>

      {/* 文書ヘッダー */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-mono text-gray-500">
                {document.document_number ?? '未採番'}
              </p>
              <CardTitle className="text-xl">{document.title}</CardTitle>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>種別: {DOCUMENT_TYPE_LABELS[document.document_type] ?? document.document_type}</span>
                <span>作成日: {new Date(document.created_at).toLocaleDateString('ja-JP')}</span>
                {document.issued_at && (
                  <span>発行日: {new Date(document.issued_at).toLocaleDateString('ja-JP')}</span>
                )}
              </div>
            </div>
            {badgeInfo && (
              <Badge className={`bg-${badgeInfo.color}-100 text-${badgeInfo.color}-800`}>
                {badgeInfo.label}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* 文書本文プレビュー */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            文書内容
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mx-auto max-w-[210mm] rounded border bg-white p-8 shadow-sm min-h-[297mm]">
            {/* 下書き透かし */}
            {status === 'draft' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="select-none text-[60px] font-bold uppercase tracking-widest text-gray-200 opacity-50 -rotate-[30deg]">
                  DRAFT
                </span>
              </div>
            )}

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center">{document.title}</h2>
              {(docValues ?? []).map((val) => (
                <div key={val.id} className="flex gap-4 border-b pb-2">
                  <span className="font-medium text-gray-600 w-40">{val.variable_key}</span>
                  <span className="text-gray-900">{val.value ?? '-'}</span>
                </div>
              ))}
              {document.rendered_html && (
                <div
                  className="prose prose-sm max-w-none mt-6"
                  dangerouslySetInnerHTML={{ __html: document.rendered_html }}
                />
              )}
            </div>

            {/* フッター */}
            {document.document_number && (
              <div className="absolute bottom-8 left-8 right-8 text-center text-xs text-gray-400 border-t pt-2">
                文書番号: {document.document_number}
                {document.issued_at && ` | 発行日: ${new Date(document.issued_at).toLocaleDateString('ja-JP')}`}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 承認履歴 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">承認履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {approvals && approvals.length > 0 ? (
            <div className="space-y-4">
              {approvals.map((approval) => (
                <div key={approval.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
                  <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    approval.action === 'approved' ? 'bg-green-100 text-green-600' :
                    approval.action === 'rejected' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {approval.action === 'approved' ? <CheckCircle className="h-4 w-4" /> :
                     approval.action === 'rejected' ? <XCircle className="h-4 w-4" /> :
                     <div className="h-2 w-2 rounded-full bg-current" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        ステップ {approval.step_order}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {approval.action === 'approved' ? '承認' :
                         approval.action === 'rejected' ? '差戻し' :
                         approval.action === 'delegated' ? '委任' : approval.action}
                      </Badge>
                    </div>
                    {approval.comment && (
                      <p className="mt-1 text-sm text-gray-600">{approval.comment}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      {approval.acted_at
                        ? new Date(approval.acted_at).toLocaleString('ja-JP')
                        : '未処理'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500 py-6">承認履歴はありません</p>
          )}
        </CardContent>
      </Card>

      {/* アクションボタン */}
      <DocumentActions
        documentId={params.id}
        status={status}
        isOwner={isOwner}
      />
    </div>
  )
}
