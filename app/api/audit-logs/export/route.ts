import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/** 操作ラベル（CSV出力用） */
const ACTION_LABELS: Record<string, string> = {
  create: '作成',
  update: '更新',
  delete: '削除',
  status_change: 'ステータス変更',
  approve: '承認',
  reject: '却下',
  return: '差戻し',
  publish: '公開',
  archive: 'アーカイブ',
  download: 'ダウンロード',
  view: '閲覧',
}

/** エンティティ種別ラベル（CSV出力用） */
const ENTITY_TYPE_LABELS: Record<string, string> = {
  document: '文書',
  template: 'テンプレート',
  workflow: 'ワークフロー',
  user: 'ユーザー',
  organization: '組織',
}

/**
 * GET /api/audit-logs/export
 * 監査ログをCSVとしてエクスポートする（admin / manager のみ）
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
        { error: '監査ログのエクスポート権限がありません' },
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

    // クエリ構築（最大10,000件）
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
      `
      )
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .limit(10000)

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

    const { data: logs, error } = await query

    if (error) {
      console.error('[API] 監査ログエクスポートエラー:', error.message)
      return NextResponse.json(
        { error: '監査ログのエクスポートに失敗しました' },
        { status: 500 }
      )
    }

    // CSV生成
    const headers = [
      '日時',
      'ユーザー名',
      'メールアドレス',
      '操作',
      '対象種別',
      '対象ID',
      'IPアドレス',
      'メタデータ',
    ]
    const csvRows = [headers.join(',')]

    for (const log of logs ?? []) {
      const userProfile = log.user_profiles as unknown as Record<string, unknown> | null

      const row = [
        escapeCsvField(
          new Date(log.created_at).toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        ),
        escapeCsvField(
          (userProfile?.full_name as string) ?? ''
        ),
        escapeCsvField(
          (userProfile?.email as string) ?? ''
        ),
        escapeCsvField(
          ACTION_LABELS[log.action] ?? log.action
        ),
        escapeCsvField(
          ENTITY_TYPE_LABELS[log.entity_type] ?? log.entity_type
        ),
        escapeCsvField(log.entity_id ?? ''),
        escapeCsvField(log.ip_address ?? ''),
        escapeCsvField(
          log.metadata ? JSON.stringify(log.metadata) : ''
        ),
      ]
      csvRows.push(row.join(','))
    }

    const csv = csvRows.join('\n')
    // UTF-8 BOM を付与してExcelでの文字化けを防止
    const bom = '\uFEFF'
    const dateStr = new Date().toISOString().split('T')[0]

    return new NextResponse(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-logs-${dateStr}.csv"`,
      },
    })
  } catch (error) {
    console.error('[API] 監査ログエクスポートエラー:', error)
    return NextResponse.json(
      { error: '監査ログのエクスポート中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * CSVフィールドをエスケープする
 * ダブルクォートを含む場合やカンマを含む場合に適切にエスケープ
 */
function escapeCsvField(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
