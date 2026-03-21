import { createServerClient } from '@/lib/supabase/server'
import { writeAuditLog } from '@/lib/audit/log'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/templates/[id]
 * テンプレートの詳細を取得する（バージョン情報含む）
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { data: template, error } = await supabase
      .from('templates')
      .select('*, template_versions(*)')
      .eq('id', params.id)
      .is('deleted_at', null)
      .single()

    if (error || !template) {
      return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch {
    return NextResponse.json({ error: 'テンプレートの取得に失敗しました' }, { status: 500 })
  }
}

/**
 * PUT /api/templates/[id]
 * テンプレートを更新する
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, is_published } = body

    const { data: before } = await supabase
      .from('templates')
      .select('name, is_published')
      .eq('id', params.id)
      .single()

    const { error } = await supabase
      .from('templates')
      .update({
        name,
        description,
        is_published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: 'テンプレートの更新に失敗しました' }, { status: 500 })
    }

    await writeAuditLog({
      action: 'update',
      entityType: 'template',
      entityId: params.id,
      userId: user.id,
      organizationId: '',
      metadata: {
        before: before ?? {},
        after: { name, is_published },
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'テンプレートの更新に失敗しました' }, { status: 500 })
  }
}

/**
 * DELETE /api/templates/[id]
 * テンプレートを論理削除する
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { error } = await supabase
      .from('templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: 'テンプレートの削除に失敗しました' }, { status: 500 })
    }

    await writeAuditLog({
      action: 'delete',
      entityType: 'template',
      entityId: params.id,
      userId: user.id,
      organizationId: '',
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'テンプレートの削除に失敗しました' }, { status: 500 })
  }
}
