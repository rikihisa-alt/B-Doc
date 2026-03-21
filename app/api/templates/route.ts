import { createServerClient } from '@/lib/supabase/server'
import { writeAuditLog } from '@/lib/audit/log'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/templates
 * テンプレート一覧を取得する
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
    const documentType = searchParams.get('document_type')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(searchParams.get('page_size') ?? '20', 10)

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
      .from('templates')
      .select(
        `
        id,
        name,
        description,
        document_type,
        content,
        version,
        is_active,
        created_by,
        created_at,
        updated_at,
        user_profiles!templates_created_by_fkey (
          full_name,
          email
        )
      `,
        { count: 'exact' }
      )
      .eq('organization_id', profile.organization_id)
      .is('deleted_at', null)
      .eq('is_active', true)

    // フィルタ適用
    if (documentType) {
      query = query.eq('document_type', documentType)
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // ソートとページネーション
    query = query
      .order('updated_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    const { data: templates, count, error } = await query

    if (error) {
      console.error('[API] テンプレート一覧取得エラー:', error.message)
      return NextResponse.json(
        { error: 'テンプレート一覧の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      templates: templates ?? [],
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
    })
  } catch (error) {
    console.error('[API] テンプレート一覧エラー:', error)
    return NextResponse.json(
      { error: 'テンプレート一覧の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates
 * 新規テンプレートを作成する
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
    const { name, description, document_type, content } = body as {
      name: string
      description?: string
      document_type: string
      content: string
    }

    // バリデーション
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'テンプレート名は必須です' },
        { status: 400 }
      )
    }
    if (!document_type) {
      return NextResponse.json(
        { error: '文書種別は必須です' },
        { status: 400 }
      )
    }
    if (!content) {
      return NextResponse.json(
        { error: 'テンプレート内容は必須です' },
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

    // 権限チェック: admin, manager, editor のみ作成可能
    if (!['admin', 'manager', 'editor'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'テンプレートの作成権限がありません' },
        { status: 403 }
      )
    }

    // テンプレートの作成
    const { data: template, error: createError } = await supabase
      .from('templates')
      .insert({
        name: name.trim(),
        description: description?.trim() ?? null,
        document_type,
        content,
        version: 1,
        is_active: true,
        organization_id: profile.organization_id,
        created_by: user.id,
      })
      .select('*')
      .single()

    if (createError) {
      console.error('[API] テンプレート作成エラー:', createError.message)
      return NextResponse.json(
        { error: 'テンプレートの作成に失敗しました' },
        { status: 500 }
      )
    }

    // 監査ログの記録
    await writeAuditLog({
      action: 'create',
      entityType: 'template',
      entityId: template.id,
      userId: user.id,
      organizationId: profile.organization_id,
      metadata: {
        templateName: template.name,
        documentType: template.document_type,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'テンプレートを作成しました',
        template,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[API] テンプレート作成エラー:', error)
    return NextResponse.json(
      { error: 'テンプレートの作成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
