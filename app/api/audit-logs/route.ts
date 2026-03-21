import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/audit-logs
 * 監査ログ一覧を取得する（admin / manager のみ）
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

    // ユーザープロフィール・権限チェック
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

    // admin / manager のみアクセス可能
    if (!['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json(
        { error: '監査ログの閲覧権限がありません' },
        { status: 403 }
      )
    }

    // クエリパラメータの取得
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entity_type')
    const action = searchParams.get('action')
    const userId = searchParams.get('user_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(searchParams.get('page_size') ?? '50', 10)

    const offset = (page - 1) * pageSize

    // クエリ構築
    let query = supabase
      .from('audit_logs')
      .select(
        `
        id,
        action,
        entity_type,
        entity_id,
        user_id,
        metadata,
        ip_address,
        created_at,
        user_profiles (
          full_name,
          email
        )
      `,
        { count: 'exact' }
      )
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    // フィルタ適用
    if (entityType) {
      query = query.eq('entity_type', entityType)
    }
    if (action) {
      query = query.eq('action', action)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59`)
    }

    // ページネーション
    query = query.range(offset, offset + pageSize - 1)

    const { data: logs, count, error } = await query

    if (error) {
      console.error('[API] 監査ログ取得エラー:', error.message)
      return NextResponse.json(
        { error: '監査ログの取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      logs: logs ?? [],
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
    })
  } catch (error) {
    console.error('[API] 監査ログエラー:', error)
    return NextResponse.json(
      { error: '監査ログの取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
