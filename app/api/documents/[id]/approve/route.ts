import { createServerClient } from '@/lib/supabase/server'
import { writeAuditLog } from '@/lib/audit/log'
import { processApproval } from '@/lib/workflow/engine'
import { NextRequest, NextResponse } from 'next/server'
type ApprovalAction = 'approve' | 'reject' | 'return'

/**
 * POST /api/documents/[id]/approve
 * 文書の承認・却下・差戻しを処理する
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

    // リクエストボディの取得
    const body = await request.json()
    const { action, comment } = body as {
      action: ApprovalAction
      comment?: string
    }

    // アクションのバリデーション
    if (!action || !['approve', 'reject', 'return'].includes(action)) {
      return NextResponse.json(
        { error: '有効なアクション（approve, reject, return）を指定してください' },
        { status: 400 }
      )
    }

    // 文書の存在確認とステータスチェック
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, status, organization_id, created_by')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: '文書が見つかりません' },
        { status: 404 }
      )
    }

    // 承認可能なステータスかチェック
    const approvableStatuses = ['pending', 'in_review']
    if (!approvableStatuses.includes(document.status)) {
      return NextResponse.json(
        {
          error: `現在のステータス「${document.status}」では承認操作を行えません`,
        },
        { status: 400 }
      )
    }

    // ユーザープロフィール取得（組織IDの検証）
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
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
        { error: 'この文書の承認権限がありません' },
        { status: 403 }
      )
    }

    // 承認処理の実行
    const result = await processApproval(
      supabase,
      documentId,
      user.id,
      action,
      comment
    )

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    // 監査ログの記録
    await writeAuditLog({
      action: action as 'approve' | 'reject' | 'return',
      entityType: 'document',
      entityId: documentId,
      userId: user.id,
      organizationId: document.organization_id,
      metadata: {
        documentTitle: document.title,
        previousStatus: document.status,
        approvalAction: action,
        comment: comment ?? null,
        isCompleted: result.isCompleted,
      },
    })

    // 更新後の文書を取得
    const { data: updatedDocument } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    return NextResponse.json({
      success: true,
      message: result.message,
      document: updatedDocument,
      isCompleted: result.isCompleted,
      nextStep: result.nextStep,
    })
  } catch (error) {
    console.error('[API] 承認処理エラー:', error)
    return NextResponse.json(
      { error: '承認処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
