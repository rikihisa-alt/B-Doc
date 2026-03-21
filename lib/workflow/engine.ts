import type { SupabaseClient } from '@supabase/supabase-js'

interface ProcessApprovalResult {
  success: boolean
  message: string
  isCompleted: boolean
  nextStep: number | null
}

/**
 * 承認処理を実行する
 *
 * @param supabase - Supabaseクライアント
 * @param documentId - 文書ID
 * @param approverId - 承認者ID
 * @param action - 承認アクション（approve, reject, return）
 * @param comment - コメント（任意）
 * @returns 処理結果
 */
export async function processApproval(
  supabase: SupabaseClient,
  documentId: string,
  approverId: string,
  action: string,
  comment?: string
): Promise<ProcessApprovalResult> {
  // 文書の取得
  const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (!document) {
    return { success: false, message: '文書が見つかりません', isCompleted: false, nextStep: null }
  }

  // 承認可能なステータスかチェック
  if (!['pending_confirm', 'pending_approval'].includes(document.status)) {
    return {
      success: false,
      message: `現在のステータスでは承認操作を行えません: ${document.status}`,
      isCompleted: false,
      nextStep: null,
    }
  }

  // 現在のステップ番号を取得
  const { count: existingRecords } = await supabase
    .from('approval_records')
    .select('*', { count: 'exact', head: true })
    .eq('document_id', documentId)

  const currentStep = (existingRecords ?? 0) + 1

  // 承認レコードの作成
  const { error: recordError } = await supabase
    .from('approval_records')
    .insert({
      document_id: documentId,
      step_order: currentStep,
      approver_id: approverId,
      action: action === 'return' ? 'rejected' : action === 'approve' ? 'approved' : 'rejected',
      comment: comment ?? null,
      acted_at: new Date().toISOString(),
    })

  if (recordError) {
    return { success: false, message: '承認レコードの作成に失敗しました', isCompleted: false, nextStep: null }
  }

  // ステータスの更新
  let newStatus: string
  let isCompleted = false

  if (action === 'approve') {
    // ワークフロー定義から次のステップを確認
    const { data: workflow } = await supabase
      .from('workflow_definitions')
      .select('steps')
      .eq('document_type', document.document_type)
      .eq('is_active', true)
      .maybeSingle()

    const steps = (workflow?.steps as { stepOrder: number }[] | null) ?? []
    const hasNextStep = steps.some((s) => s.stepOrder > currentStep)

    if (hasNextStep) {
      newStatus = 'pending_approval'
      isCompleted = false
    } else {
      newStatus = 'approved'
      isCompleted = true
    }
  } else {
    // 差戻し
    newStatus = 'returned'
    isCompleted = false
  }

  await supabase
    .from('documents')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)

  const actionLabel = action === 'approve' ? '承認' : '差戻し'

  return {
    success: true,
    message: `文書を${actionLabel}しました`,
    isCompleted,
    nextStep: isCompleted ? null : currentStep + 1,
  }
}
