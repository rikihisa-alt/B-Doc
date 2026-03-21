import { createServerClient } from '@/lib/supabase/server'
import type { AuditAction } from '@/types'

/** 監査ログ書き込みパラメータ */
interface WriteAuditLogParams {
  /** 実行されたアクション */
  action: AuditAction
  /** 対象エンティティの種類（例: "document", "workflow"） */
  entityType: string
  /** 対象エンティティのID */
  entityId: string
  /** 実行ユーザーID */
  userId: string
  /** 組織ID */
  organizationId: string
  /** 追加メタデータ（任意） */
  metadata?: Record<string, unknown>
  /** IPアドレス（任意） */
  ipAddress?: string
}

/**
 * 監査ログを書き込む
 * すべての重要な操作に対して呼び出し、変更履歴を記録する
 *
 * @example
 * ```ts
 * await writeAuditLog({
 *   action: 'status_change',
 *   entityType: 'document',
 *   entityId: documentId,
 *   userId: currentUser.id,
 *   organizationId: currentUser.organization_id,
 *   metadata: { from: 'draft', to: 'pending' },
 * })
 * ```
 */
export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
  const {
    action,
    entityType,
    entityId,
    userId,
    organizationId,
    metadata = null,
    ipAddress = null,
  } = params

  const supabase = await createServerClient()

  const { error } = await supabase.from('audit_logs').insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    user_id: userId,
    organization_id: organizationId,
    metadata,
    ip_address: ipAddress,
  })

  if (error) {
    // 監査ログの書き込み失敗は業務処理を止めないが、エラーログには記録する
    console.error('[AuditLog] 監査ログの書き込みに失敗しました:', {
      action,
      entityType,
      entityId,
      error: error.message,
    })
  }
}
