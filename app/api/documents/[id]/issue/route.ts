import { createServerClient } from '@/lib/supabase/server'
import { writeAuditLog } from '@/lib/audit/log'
import { generateDocumentNumber } from '@/lib/document/numbering'
import { NextRequest, NextResponse } from 'next/server'
// 文書種別は文字列として扱う

/**
 * POST /api/documents/[id]/issue
 * 承認済み文書を正式に発行する
 * - 文書番号を採番
 * - PDF生成（プレースホルダー）
 * - ステータスを published に更新
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params
    const supabase = await createServerClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 文書の取得
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: '文書が見つかりません' },
        { status: 404 }
      )
    }

    // ステータスチェック: approved のみ発行可能
    if (document.status !== 'approved') {
      return NextResponse.json(
        {
          error: `発行には「承認済み」ステータスが必要です。現在のステータス: ${document.status}`,
        },
        { status: 400 }
      )
    }

    // ユーザープロフィール取得
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, role, full_name')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    // 同一組織チェック
    if (profile.organization_id !== document.organization_id) {
      return NextResponse.json(
        { error: 'この文書の発行権限がありません' },
        { status: 403 }
      )
    }

    // 権限チェック: admin または manager のみ発行可能
    if (!['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json(
        { error: '文書の発行には管理者またはマネージャーの権限が必要です' },
        { status: 403 }
      )
    }

    // 文書番号の採番
    const documentNumber = await generateDocumentNumber(
      supabase,
      document.organization_id,
      document.document_type
    )

    // PDF生成（プレースホルダー）
    // 実際のPDF生成は generatePdf を使用するが、サーバーサイドでの
    // React PDF レンダリングは別途実装が必要なため、ここではURLのみ記録
    const pdfUrl = null // TODO: PDF生成の実装後に置き換え

    // 文書の更新: ステータスを published に、文書番号を設定
    const { data: updatedDocument, error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'published',
        document_number: documentNumber,
        pdf_url: pdfUrl,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select('*')
      .single()

    if (updateError) {
      console.error('[API] 文書発行更新エラー:', updateError.message)
      return NextResponse.json(
        { error: '文書の発行に失敗しました' },
        { status: 500 }
      )
    }

    // 監査ログの記録
    await writeAuditLog({
      action: 'issue' as const,
      entityType: 'document',
      entityId: documentId,
      userId: user.id,
      organizationId: document.organization_id,
      metadata: {
        documentTitle: document.title,
        documentNumber,
        previousStatus: 'approved',
        newStatus: 'published',
        issuedBy: profile.full_name,
      },
    })

    return NextResponse.json({
      success: true,
      message: `文書「${document.title}」を発行しました。文書番号: ${documentNumber}`,
      document: updatedDocument,
      documentNumber,
    })
  } catch (error) {
    console.error('[API] 文書発行エラー:', error)
    return NextResponse.json(
      { error: '文書の発行中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
