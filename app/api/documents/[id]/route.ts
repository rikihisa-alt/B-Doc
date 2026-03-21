import { createServerClient } from '@/lib/supabase/server'
import { writeAuditLog } from '@/lib/audit/log'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/documents/[id]
 * 文書の詳細を取得する（関連データ含む）
 */
export async function GET(
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

    // 文書の取得（作成者情報・承認情報を含む）
    const { data: document, error } = await supabase
      .from('documents')
      .select(
        `
        *,
        user_profiles!documents_created_by_fkey (
          id,
          full_name,
          email,
          role
        ),
        approvals (
          id,
          status,
          comment,
          approver_id,
          decided_at,
          created_at,
          workflow_steps (
            id,
            step_order,
            approver_role
          )
        )
      `
      )
      .eq('id', documentId)
      .is('deleted_at', null)
      .single()

    if (error || !document) {
      return NextResponse.json(
        { error: '文書が見つかりません' },
        { status: 404 }
      )
    }

    // 組織所属チェック
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.organization_id !== document.organization_id) {
      return NextResponse.json(
        { error: 'この文書の閲覧権限がありません' },
        { status: 403 }
      )
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error('[API] 文書取得エラー:', error)
    return NextResponse.json(
      { error: '文書の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/documents/[id]
 * 文書を更新する（下書きステータスのみ）
 */
export async function PUT(
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

    // 文書の存在確認
    const { data: existingDoc, error: fetchError } = await supabase
      .from('documents')
      .select('id, status, organization_id, created_by')
      .eq('id', documentId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingDoc) {
      return NextResponse.json(
        { error: '文書が見つかりません' },
        { status: 404 }
      )
    }

    // ステータスチェック: draft のみ編集可能
    if (existingDoc.status !== 'draft') {
      return NextResponse.json(
        {
          error: '下書きステータスの文書のみ編集できます',
        },
        { status: 400 }
      )
    }

    // 権限チェック: 作成者または admin のみ編集可能
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.organization_id !== existingDoc.organization_id) {
      return NextResponse.json(
        { error: 'この文書の編集権限がありません' },
        { status: 403 }
      )
    }

    if (existingDoc.created_by !== user.id && profile.role !== 'admin') {
      return NextResponse.json(
        { error: '自分が作成した文書のみ編集できます' },
        { status: 403 }
      )
    }

    // リクエストボディの取得
    const body = await request.json()
    const { title, content, document_type } = body as {
      title?: string
      content?: string
      document_type?: string
    }

    // 更新データの構築
    const updateData: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }
    if (title !== undefined) updateData.title = title.trim()
    if (content !== undefined) updateData.content = content
    if (document_type !== undefined) updateData.document_type = document_type

    // 文書の更新
    const { data: updatedDocument, error: updateError } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .select('*')
      .single()

    if (updateError) {
      console.error('[API] 文書更新エラー:', updateError.message)
      return NextResponse.json(
        { error: '文書の更新に失敗しました' },
        { status: 500 }
      )
    }

    // 監査ログの記録
    await writeAuditLog({
      action: 'update',
      entityType: 'document',
      entityId: documentId,
      userId: user.id,
      organizationId: existingDoc.organization_id,
      metadata: {
        updatedFields: Object.keys(body),
      },
    })

    return NextResponse.json({
      success: true,
      message: '文書を更新しました',
      document: updatedDocument,
    })
  } catch (error) {
    console.error('[API] 文書更新エラー:', error)
    return NextResponse.json(
      { error: '文書の更新中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/documents/[id]
 * 文書を論理削除する
 */
export async function DELETE(
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

    // 文書の存在確認
    const { data: existingDoc, error: fetchError } = await supabase
      .from('documents')
      .select('id, title, status, organization_id, created_by')
      .eq('id', documentId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingDoc) {
      return NextResponse.json(
        { error: '文書が見つかりません' },
        { status: 404 }
      )
    }

    // 権限チェック
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.organization_id !== existingDoc.organization_id) {
      return NextResponse.json(
        { error: 'この文書の削除権限がありません' },
        { status: 403 }
      )
    }

    // admin 以外は自分が作成した draft 文書のみ削除可能
    if (profile.role !== 'admin') {
      if (existingDoc.created_by !== user.id) {
        return NextResponse.json(
          { error: '自分が作成した文書のみ削除できます' },
          { status: 403 }
        )
      }
      if (existingDoc.status !== 'draft') {
        return NextResponse.json(
          { error: '下書きステータスの文書のみ削除できます' },
          { status: 400 }
        )
      }
    }

    // 論理削除
    const { error: deleteError } = await supabase
      .from('documents')
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', documentId)

    if (deleteError) {
      console.error('[API] 文書削除エラー:', deleteError.message)
      return NextResponse.json(
        { error: '文書の削除に失敗しました' },
        { status: 500 }
      )
    }

    // 監査ログの記録
    await writeAuditLog({
      action: 'delete',
      entityType: 'document',
      entityId: documentId,
      userId: user.id,
      organizationId: existingDoc.organization_id,
      metadata: {
        documentTitle: existingDoc.title,
        previousStatus: existingDoc.status,
      },
    })

    return NextResponse.json({
      success: true,
      message: '文書を削除しました',
    })
  } catch (error) {
    console.error('[API] 文書削除エラー:', error)
    return NextResponse.json(
      { error: '文書の削除中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
