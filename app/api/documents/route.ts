import { createServerClient } from '@/lib/supabase/server'
import { writeAuditLog } from '@/lib/audit/log'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/documents
 * 文書一覧を取得する（フィルタ・ページネーション対応）
 */
export async function GET(request: NextRequest) {
  try {
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

    // クエリパラメータの取得
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const documentType = searchParams.get('document_type')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(searchParams.get('page_size') ?? '20', 10)
    const sortBy = searchParams.get('sort_by') ?? 'created_at'
    const sortOrder = searchParams.get('sort_order') === 'asc'

    const offset = (page - 1) * pageSize

    // ユーザーの組織IDを取得
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    // クエリ構築
    let query = supabase
      .from('documents')
      .select(
        `
        id,
        document_number,
        title,
        document_type,
        status,
        version,
        content,
        created_by,
        updated_by,
        created_at,
        updated_at,
        user_profiles!documents_created_by_fkey (
          full_name,
          email
        )
      `,
        { count: 'exact' }
      )
      .eq('organization_id', profile.organization_id)
      .is('deleted_at', null)

    // フィルタ適用
    if (status) {
      query = query.eq('status', status)
    }
    if (documentType) {
      query = query.eq('document_type', documentType)
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,document_number.ilike.%${search}%`)
    }

    // ソートとページネーション
    query = query
      .order(sortBy, { ascending: sortOrder })
      .range(offset, offset + pageSize - 1)

    const { data: documents, count, error } = await query

    if (error) {
      console.error('[API] 文書一覧取得エラー:', error.message)
      return NextResponse.json(
        { error: '文書一覧の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      documents: documents ?? [],
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
    })
  } catch (error) {
    console.error('[API] 文書一覧エラー:', error)
    return NextResponse.json(
      { error: '文書一覧の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/documents
 * 新規文書を作成する
 */
export async function POST(request: NextRequest) {
  try {
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
    const { title, document_type, content, template_id } = body as {
      title: string
      document_type: string
      content?: string
      template_id?: string
    }

    // バリデーション
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'タイトルは必須です' },
        { status: 400 }
      )
    }
    if (!document_type) {
      return NextResponse.json(
        { error: '文書種別は必須です' },
        { status: 400 }
      )
    }

    // ユーザープロフィール取得
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

    // 権限チェック: viewer は文書作成不可
    if (profile.role === 'viewer') {
      return NextResponse.json(
        { error: '文書の作成権限がありません' },
        { status: 403 }
      )
    }

    // テンプレートからコンテンツを取得（指定されている場合）
    let initialContent = content ?? null
    if (template_id && !content) {
      const { data: template } = await supabase
        .from('templates')
        .select('content')
        .eq('id', template_id)
        .single()

      if (template) {
        initialContent = template.content
      }
    }

    // 文書の作成
    const { data: document, error: createError } = await supabase
      .from('documents')
      .insert({
        title: title.trim(),
        document_type,
        content: initialContent,
        status: 'draft',
        version: 1,
        organization_id: profile.organization_id,
        created_by: user.id,
        updated_by: user.id,
      })
      .select('*')
      .single()

    if (createError) {
      console.error('[API] 文書作成エラー:', createError.message)
      return NextResponse.json(
        { error: '文書の作成に失敗しました' },
        { status: 500 }
      )
    }

    // 監査ログの記録
    await writeAuditLog({
      action: 'create',
      entityType: 'document',
      entityId: document.id,
      userId: user.id,
      organizationId: profile.organization_id,
      metadata: {
        title: document.title,
        documentType: document.document_type,
        templateId: template_id ?? null,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: '文書を作成しました',
        document,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[API] 文書作成エラー:', error)
    return NextResponse.json(
      { error: '文書の作成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
