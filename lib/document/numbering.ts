import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 文書種別ごとの採番プレフィックス
 */
const TYPE_PREFIX_MAP: Record<string, string> = {
  employment_cert: 'EMP',
  invoice: 'INV',
  quotation: 'QUO',
  resignation: 'RES',
  contract: 'CON',
  report: 'RPT',
  notification: 'NTF',
  certificate: 'CRT',
}

/**
 * 文書番号を生成する
 * 形式: {文書種別コード}-{年度}-{連番5桁}
 * 例: EMP-2026-00001
 *
 * @param supabase - Supabaseクライアント
 * @param organizationId - 組織ID
 * @param documentType - 文書種別
 * @returns 生成された文書番号
 */
export async function generateDocumentNumber(
  supabase: SupabaseClient,
  organizationId: string,
  documentType: string
): Promise<string> {
  // RPCが利用可能な場合はそちらを使用
  try {
    const { data, error } = await supabase.rpc('assign_document_number', {
      p_document_id: null,
      p_document_type: documentType,
      p_fiscal_year: new Date().getFullYear(),
    })

    if (!error && data) {
      return data as string
    }
  } catch {
    // RPCが利用できない場合はフォールバック
  }

  // フォールバック: クライアントサイドで採番
  const prefix = TYPE_PREFIX_MAP[documentType] ?? documentType.substring(0, 3).toUpperCase()
  const year = new Date().getFullYear()

  const { count } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .like('document_number', `${prefix}-${year}-%`)
    .eq('organization_id', organizationId)

  const nextSeq = (count ?? 0) + 1
  return `${prefix}-${year}-${String(nextSeq).padStart(5, '0')}`
}
