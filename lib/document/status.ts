import type { SupabaseClient } from '@supabase/supabase-js'
import { type DocumentStatus, canTransition } from '@/types'

/** ステータス遷移結果 */
interface TransitionResult {
  success: boolean
  message: string
}

/**
 * 文書のステータスを遷移させる
 * 遷移が許可されていない場合はエラーを返す
 */
export async function transitionDocument(
  supabase: SupabaseClient,
  documentId: string,
  newStatus: DocumentStatus,
  _userId: string
): Promise<TransitionResult> {
  // 現在の文書を取得
  const { data: document, error: fetchError } = await supabase
    .from('documents')
    .select('id, status')
    .eq('id', documentId)
    .single()

  if (fetchError || !document) {
    return { success: false, message: '文書が見つかりません' }
  }

  const currentStatus = document.status as DocumentStatus

  // 遷移可能か検証
  if (!canTransition(currentStatus, newStatus)) {
    return {
      success: false,
      message: `ステータスを「${currentStatus}」から「${newStatus}」に変更できません`,
    }
  }

  // ステータスを更新
  const { error: updateError } = await supabase
    .from('documents')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)

  if (updateError) {
    return { success: false, message: 'ステータスの更新に失敗しました' }
  }

  return { success: true, message: `ステータスを「${newStatus}」に変更しました` }
}
