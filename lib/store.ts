'use client'

/**
 * ローカルデータストア（localStorage ベース）
 * Supabase未接続時に全機能を動作させるためのクライアントサイドストレージ
 * TODO: Supabase接続後にDB操作に切り替え
 */

import { DOCUMENT_STATUS } from '@/types'
import type { DocumentStatus } from '@/types'

// ============================================================
// 型定義
// ============================================================

/** ローカル保存用の文書 */
export interface LocalDocument {
  id: string
  document_number: string | null
  template_id: string | null
  title: string
  document_type: string
  status: DocumentStatus
  confidentiality: string
  values: Record<string, string>
  body_template: string
  created_by: string
  created_at: string
  updated_at: string
  issued_at: string | null
  issued_by: string | null
  cancelled_at: string | null
  cancel_reason: string | null
}

/** ローカル保存用の承認レコード */
export interface LocalApprovalRecord {
  id: string
  document_id: string
  step_order: number
  approver_name: string
  action: 'approved' | 'rejected' | 'confirmed' | 'returned'
  comment: string
  acted_at: string
}

/** ローカル保存用の監査ログ */
export interface LocalAuditLog {
  id: string
  executed_at: string
  user_name: string
  user_role: string
  target_type: string
  target_id: string
  target_label: string
  operation: string
  before_value: Record<string, unknown> | null
  after_value: Record<string, unknown> | null
  success: boolean
  comment: string | null
}

// ============================================================
// ストレージ操作ユーティリティ
// ============================================================

function getStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(`bdoc_${key}`)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function setStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`bdoc_${key}`, JSON.stringify(data))
  } catch {
    // ストレージ容量超過時は古いデータを削除
  }
}

// ============================================================
// 文書ストア
// ============================================================

/** 初期デモデータ */
const INITIAL_DOCUMENTS: LocalDocument[] = [
  {
    id: 'demo-001',
    document_number: 'EMP-2026-00001',
    template_id: 'tpl-001',
    title: '在職証明書（田中太郎）',
    document_type: 'employment_cert',
    status: DOCUMENT_STATUS.ISSUED,
    confidentiality: 'internal',
    values: { employee_name: '田中太郎', department: '営業部', employment_type: '正社員', issue_date: '2026-03-15', purpose: '金融機関提出' },
    body_template: '在職証明書\n\n{{employee_name}} は当社に在籍していることを証明します。\n\n部署: {{department}}\n雇用形態: {{employment_type}}\n発行日: {{issue_date}}\n使用目的: {{purpose}}',
    created_by: 'デモユーザー',
    created_at: '2026-03-15T10:00:00Z',
    updated_at: '2026-03-15T14:00:00Z',
    issued_at: '2026-03-15T14:00:00Z',
    issued_by: 'デモユーザー',
    cancelled_at: null,
    cancel_reason: null,
  },
  {
    id: 'demo-002',
    document_number: null,
    template_id: 'tpl-002',
    title: '請求書（株式会社ABC）',
    document_type: 'invoice',
    status: DOCUMENT_STATUS.PENDING_APPROVAL,
    confidentiality: 'internal',
    values: { client_name: '株式会社ABC', amount: '500000', issue_date: '2026-03-20', due_date: '2026-04-30' },
    body_template: '請求書\n\n{{client_name}} 御中\n\n金額: ¥{{amount}}\n発行日: {{issue_date}}\n支払期限: {{due_date}}',
    created_by: 'デモユーザー',
    created_at: '2026-03-19T14:30:00Z',
    updated_at: '2026-03-20T09:00:00Z',
    issued_at: null,
    issued_by: null,
    cancelled_at: null,
    cancel_reason: null,
  },
  {
    id: 'demo-003',
    document_number: null,
    template_id: 'tpl-003',
    title: '見積書（DEF株式会社）',
    document_type: 'quotation',
    status: DOCUMENT_STATUS.DRAFT,
    confidentiality: 'internal',
    values: { client_name: 'DEF株式会社', amount: '1200000', validity: '30日間' },
    body_template: '見積書\n\n{{client_name}} 御中\n\n見積金額: ¥{{amount}}\n有効期限: {{validity}}',
    created_by: 'デモユーザー',
    created_at: '2026-03-18T09:15:00Z',
    updated_at: '2026-03-18T09:15:00Z',
    issued_at: null,
    issued_by: null,
    cancelled_at: null,
    cancel_reason: null,
  },
  {
    id: 'demo-004',
    document_number: 'EMP-2026-00002',
    template_id: 'tpl-001',
    title: '在職証明書（山田花子）',
    document_type: 'employment_cert',
    status: DOCUMENT_STATUS.RETURNED,
    confidentiality: 'internal',
    values: { employee_name: '山田花子', department: '開発部', employment_type: '正社員', issue_date: '2026-03-17', purpose: '' },
    body_template: '在職証明書\n\n{{employee_name}} は当社に在籍していることを証明します。\n\n部署: {{department}}\n雇用形態: {{employment_type}}\n発行日: {{issue_date}}\n使用目的: {{purpose}}',
    created_by: 'デモユーザー',
    created_at: '2026-03-17T16:45:00Z',
    updated_at: '2026-03-18T10:00:00Z',
    issued_at: null,
    issued_by: null,
    cancelled_at: null,
    cancel_reason: null,
  },
  {
    id: 'demo-005',
    document_number: null,
    template_id: 'tpl-001',
    title: '在職証明書（佐藤一郎）',
    document_type: 'employment_cert',
    status: DOCUMENT_STATUS.APPROVED,
    confidentiality: 'internal',
    values: { employee_name: '佐藤一郎', department: '総務部', employment_type: '正社員', issue_date: '2026-03-20', purpose: '住宅ローン申請' },
    body_template: '在職証明書\n\n{{employee_name}} は当社に在籍していることを証明します。\n\n部署: {{department}}\n雇用形態: {{employment_type}}\n発行日: {{issue_date}}\n使用目的: {{purpose}}',
    created_by: 'デモユーザー',
    created_at: '2026-03-16T11:20:00Z',
    updated_at: '2026-03-20T15:00:00Z',
    issued_at: null,
    issued_by: null,
    cancelled_at: null,
    cancel_reason: null,
  },
]

export function getDocuments(): LocalDocument[] {
  const stored = getStorage<LocalDocument[]>('documents', [])
  if (stored.length === 0) {
    setStorage('documents', INITIAL_DOCUMENTS)
    return INITIAL_DOCUMENTS
  }
  return stored
}

export function getDocument(id: string): LocalDocument | null {
  return getDocuments().find((d) => d.id === id) ?? null
}

export function saveDocument(doc: LocalDocument): void {
  const docs = getDocuments()
  const idx = docs.findIndex((d) => d.id === doc.id)
  if (idx >= 0) {
    docs[idx] = { ...doc, updated_at: new Date().toISOString() }
  } else {
    docs.unshift(doc)
  }
  setStorage('documents', docs)
}

export function createDocument(partial: Partial<LocalDocument>): LocalDocument {
  const doc: LocalDocument = {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    document_number: null,
    template_id: partial.template_id ?? null,
    title: partial.title ?? '新規文書',
    document_type: partial.document_type ?? 'employment_cert',
    status: DOCUMENT_STATUS.DRAFT,
    confidentiality: 'internal',
    values: partial.values ?? {},
    body_template: partial.body_template ?? '',
    created_by: 'デモユーザー',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    issued_at: null,
    issued_by: null,
    cancelled_at: null,
    cancel_reason: null,
    ...partial,
  }
  saveDocument(doc)
  return doc
}

/** 文書番号の採番（ローカル版） */
export function assignDocumentNumber(doc: LocalDocument): string {
  const prefixMap: Record<string, string> = {
    employment_cert: 'EMP',
    invoice: 'INV',
    quotation: 'QUO',
    resignation: 'RES',
    employment_contract: 'ECT',
    nda: 'NDA',
    outsourcing_contract: 'OSC',
    ringi: 'RNG',
    internal_notice: 'NTC',
    offer_letter: 'OFR',
    personnel_order: 'PER',
    incident_report: 'INC',
    meeting_minutes: 'MTG',
    delivery_note: 'DLV',
    receipt: 'RCP',
  }
  const prefix = prefixMap[doc.document_type] ?? 'DOC'
  const year = new Date().getFullYear()
  const docs = getDocuments()
  const existing = docs.filter((d) => d.document_number?.startsWith(`${prefix}-${year}`))
  const nextSeq = existing.length + 1
  return `${prefix}-${year}-${String(nextSeq).padStart(5, '0')}`
}

// ============================================================
// 承認レコードストア
// ============================================================

const INITIAL_APPROVALS: LocalApprovalRecord[] = [
  { id: 'apr-001', document_id: 'demo-001', step_order: 1, approver_name: '佐藤確認者', action: 'confirmed', comment: '', acted_at: '2026-03-15T11:00:00Z' },
  { id: 'apr-002', document_id: 'demo-001', step_order: 2, approver_name: '山田部長', action: 'approved', comment: '問題ありません', acted_at: '2026-03-15T13:00:00Z' },
  { id: 'apr-003', document_id: 'demo-002', step_order: 1, approver_name: '佐藤確認者', action: 'confirmed', comment: '', acted_at: '2026-03-20T08:00:00Z' },
  { id: 'apr-004', document_id: 'demo-004', step_order: 1, approver_name: '山田部長', action: 'returned', comment: '使用目的の記載が不明確です。金融機関名と提出書類名を明記してください。', acted_at: '2026-03-18T10:00:00Z' },
  { id: 'apr-005', document_id: 'demo-005', step_order: 1, approver_name: '佐藤確認者', action: 'confirmed', comment: '', acted_at: '2026-03-19T10:00:00Z' },
  { id: 'apr-006', document_id: 'demo-005', step_order: 2, approver_name: '山田部長', action: 'approved', comment: '承認します', acted_at: '2026-03-20T14:00:00Z' },
]

export function getApprovalRecords(documentId?: string): LocalApprovalRecord[] {
  const stored = getStorage<LocalApprovalRecord[]>('approvals', [])
  if (stored.length === 0) {
    setStorage('approvals', INITIAL_APPROVALS)
    const data = INITIAL_APPROVALS
    return documentId ? data.filter((a) => a.document_id === documentId) : data
  }
  return documentId ? stored.filter((a) => a.document_id === documentId) : stored
}

export function addApprovalRecord(record: Omit<LocalApprovalRecord, 'id'>): void {
  const records = getApprovalRecords()
  records.push({ ...record, id: `apr-${Date.now()}` })
  setStorage('approvals', records)
}

// ============================================================
// 監査ログストア
// ============================================================

const INITIAL_AUDIT_LOGS: LocalAuditLog[] = [
  { id: 'log-001', executed_at: '2026-03-15T10:00:00Z', user_name: 'デモユーザー', user_role: 'creator', target_type: 'document', target_id: 'demo-001', target_label: '在職証明書（田中太郎）', operation: 'create', before_value: null, after_value: { status: 'draft' }, success: true, comment: null },
  { id: 'log-002', executed_at: '2026-03-15T11:00:00Z', user_name: '佐藤確認者', user_role: 'confirmer', target_type: 'document', target_id: 'demo-001', target_label: '在職証明書（田中太郎）', operation: 'approve', before_value: { status: 'pending_confirm' }, after_value: { status: 'pending_approval' }, success: true, comment: null },
  { id: 'log-003', executed_at: '2026-03-15T13:00:00Z', user_name: '山田部長', user_role: 'approver', target_type: 'document', target_id: 'demo-001', target_label: '在職証明書（田中太郎）', operation: 'approve', before_value: { status: 'pending_approval' }, after_value: { status: 'approved' }, success: true, comment: '問題ありません' },
  { id: 'log-004', executed_at: '2026-03-15T14:00:00Z', user_name: 'デモユーザー', user_role: 'issuer', target_type: 'document', target_id: 'demo-001', target_label: '在職証明書（田中太郎）', operation: 'issue', before_value: { status: 'approved' }, after_value: { status: 'issued', document_number: 'EMP-2026-00001' }, success: true, comment: null },
]

export function getAuditLogs(): LocalAuditLog[] {
  const stored = getStorage<LocalAuditLog[]>('audit_logs', [])
  if (stored.length === 0) {
    setStorage('audit_logs', INITIAL_AUDIT_LOGS)
    return INITIAL_AUDIT_LOGS
  }
  return stored
}

export function addAuditLog(log: Omit<LocalAuditLog, 'id' | 'executed_at'>): void {
  const logs = getAuditLogs()
  logs.unshift({
    ...log,
    id: `log-${Date.now()}`,
    executed_at: new Date().toISOString(),
  })
  setStorage('audit_logs', logs)
}

// ============================================================
// テンプレートブロック型定義
// ============================================================

/** テンプレートブロックの種類 */
export type TemplateBlockType =
  | 'heading'        // 見出し
  | 'paragraph'      // 本文テキスト
  | 'variable_line'  // 変数行
  | 'table'          // 表
  | 'seal'           // 印影配置
  | 'signature'      // 署名欄
  | 'divider'        // 区切り線
  | 'spacer'         // 余白
  | 'page_break'     // 改ページ
  | 'notice'         // 注意書き
  | 'image'          // 画像プレースホルダー
  | 'date_line'      // 日付行
  | 'address_block'  // 宛名ブロック
  | 'list'           // リスト（箇条書き・番号付き）
  | 'two_column'     // 2カラムレイアウト
  | 'horizontal_items' // 横並び項目（キー:値のペア）

/** テンプレートブロックの定義 */
export interface TemplateBlock {
  id: string
  type: TemplateBlockType
  order: number
  // 共通
  content?: string
  align?: 'left' | 'center' | 'right'
  fontFamily?: string
  // 見出し
  level?: 1 | 2 | 3 | 4
  letterSpacing?: number
  // 本文
  fontSize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  lineHeight?: number
  // 変数行
  variableKey?: string
  variableLabel?: string
  variableType?: 'text' | 'number' | 'date' | 'select' | 'boolean'
  variableRequired?: boolean
  variableOptions?: { value: string; label: string }[]
  // 表
  tableRows?: number
  tableCols?: number
  tableCells?: string[][]
  tableHeaders?: string[]
  // 印影
  sealId?: string
  sealPosition?: 'left' | 'center' | 'right'
  // 署名欄
  companyName?: string
  representativeTitle?: string
  representativeName?: string
  // 区切り線
  dividerStyle?: 'solid' | 'dashed' | 'dotted'
  dividerThickness?: number
  // 余白
  spacerHeight?: number
  // 注意書き
  noticeStyle?: 'info' | 'warning' | 'bordered'
  // 宛名
  addressCompany?: string
  addressDepartment?: string
  addressName?: string
  addressSuffix?: '御中' | '様' | '殿'
  // スタイル拡張
  color?: string              // テキスト色 (hex)
  backgroundColor?: string    // 背景色 (hex)
  borderColor?: string        // 枠線色 (hex)
  borderWidth?: number        // 枠線太さ (px)
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none'
  paddingTop?: number         // 上余白 (mm)
  paddingBottom?: number      // 下余白 (mm)
  paddingLeft?: number        // 左余白 (mm)
  paddingRight?: number       // 右余白 (mm)
  indent?: number             // インデント (mm)
  listType?: 'none' | 'bullet' | 'numbered'  // リスト種別
  listItems?: string[]        // リスト項目
  // 2カラムレイアウト
  columnRatio?: string       // '50-50' | '60-40' | '40-60' | '70-30' | '30-70'
  columnLeftContent?: string
  columnRightContent?: string
  // 横並び項目
  horizontalItems?: { label: string; value: string }[]
}

// ============================================================
// テンプレートストア
// ============================================================

/** テンプレート承認ステータスの型 */
export type TemplateApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected'

export interface LocalTemplate {
  id: string
  name: string
  document_type: string
  description: string
  is_published: boolean
  version: number
  variables: { key: string; label: string; type: string; required: boolean; options?: { value: string; label: string }[] }[]
  body_template: string
  blocks?: TemplateBlock[]
  created_at: string
  /** テンプレート承認ステータス */
  status?: TemplateApprovalStatus
  /** 承認申請者名 */
  submitted_by?: string
  /** 承認申請日時 */
  submitted_at?: string
  /** 承認者名 */
  approved_by?: string
  /** 承認日時 */
  approved_at?: string
  /** 差戻し理由 */
  rejection_reason?: string
  /** 用紙サイズ */
  pageSize?: PageSize
  /** 用紙方向 */
  pageOrientation?: 'portrait' | 'landscape'
  /** ページ余白 (mm) */
  pageMargin?: { top: number; bottom: number; left: number; right: number }
}

/** 用紙サイズ定義 */
export type PageSize = 'A3' | 'A4' | 'A5' | 'A6' | 'B4' | 'B5' | 'letter' | 'legal' | 'hagaki'

/** 用紙サイズの寸法 (mm) */
export const PAGE_SIZE_DIMENSIONS: Record<PageSize, { width: number; height: number; label: string }> = {
  A3: { width: 297, height: 420, label: 'A3 (297×420mm)' },
  A4: { width: 210, height: 297, label: 'A4 (210×297mm)' },
  A5: { width: 148, height: 210, label: 'A5 (148×210mm)' },
  A6: { width: 105, height: 148, label: 'A6 (105×148mm)' },
  B4: { width: 257, height: 364, label: 'B4 (257×364mm)' },
  B5: { width: 182, height: 257, label: 'B5 (182×257mm)' },
  letter: { width: 216, height: 279, label: 'レター (216×279mm)' },
  legal: { width: 216, height: 356, label: 'リーガル (216×356mm)' },
  hagaki: { width: 100, height: 148, label: 'はがき (100×148mm)' },
}

/** テンプレートの実際のページ寸法を取得 */
export function getPageDimensions(template: LocalTemplate): { width: number; height: number } {
  const size = template.pageSize ?? 'A4'
  const dims = PAGE_SIZE_DIMENSIONS[size]
  if (template.pageOrientation === 'landscape') {
    return { width: dims.height, height: dims.width }
  }
  return { width: dims.width, height: dims.height }
}

/** テンプレートのページ余白を取得 */
export function getPageMargins(template: LocalTemplate): { top: number; bottom: number; left: number; right: number } {
  return template.pageMargin ?? { top: 20, bottom: 20, left: 20, right: 20 }
}

const INITIAL_TEMPLATES: LocalTemplate[] = [
  // ====== tpl-001: 在職証明書（改善版） ======
  {
    id: 'tpl-001',
    name: '在職証明書',
    document_type: 'employment_cert',
    description: '従業員の在職を証明する文書。金融機関提出、保育園申請、住宅ローン申請等に使用。入社日・職種も記載可能。',
    is_published: true,
    version: 3,
    variables: [
      { key: 'employee_name', label: '氏名', type: 'text', required: true },
      { key: 'department', label: '所属部署', type: 'select', required: true, options: [{ value: '営業部', label: '営業部' }, { value: '開発部', label: '開発部' }, { value: '総務部', label: '総務部' }, { value: '人事部', label: '人事部' }, { value: '経理部', label: '経理部' }, { value: '企画部', label: '企画部' }] },
      { key: 'position', label: '役職', type: 'text', required: false },
      { key: 'employment_type', label: '雇用形態', type: 'select', required: true, options: [{ value: '正社員', label: '正社員' }, { value: '契約社員', label: '契約社員' }, { value: 'パート', label: 'パート' }, { value: '嘱託社員', label: '嘱託社員' }] },
      { key: 'hire_date', label: '入社年月日', type: 'date', required: true },
      { key: 'issue_date', label: '発行日', type: 'date', required: true },
      { key: 'purpose', label: '使用目的', type: 'select', required: true, options: [{ value: '金融機関提出', label: '金融機関提出' }, { value: '保育園申請', label: '保育園申請' }, { value: '住宅ローン申請', label: '住宅ローン申請' }, { value: 'ビザ申請', label: 'ビザ申請' }, { value: 'その他', label: 'その他' }] },
    ],
    body_template: '',
    blocks: [
      { id: 'b-001', type: 'date_line', order: 0, content: '{{issue_date}}', align: 'right' },
      { id: 'b-002', type: 'heading', order: 1, content: '在 職 証 明 書', level: 1, align: 'center', letterSpacing: 16 },
      { id: 'b-003', type: 'spacer', order: 2, spacerHeight: 10 },
      { id: 'b-004', type: 'paragraph', order: 3, content: '下記の者は、当社に在籍していることを証明いたします。', align: 'left', fontSize: 12 },
      { id: 'b-005', type: 'spacer', order: 4, spacerHeight: 8 },
      { id: 'b-006', type: 'heading', order: 5, content: '記', level: 3, align: 'center' },
      { id: 'b-007', type: 'spacer', order: 6, spacerHeight: 5 },
      { id: 'b-008', type: 'variable_line', order: 7, variableLabel: '氏名', variableKey: 'employee_name', variableType: 'text', variableRequired: true },
      { id: 'b-009', type: 'variable_line', order: 8, variableLabel: '所属部署', variableKey: 'department', variableType: 'select', variableRequired: true, variableOptions: [{ value: '営業部', label: '営業部' }, { value: '開発部', label: '開発部' }, { value: '総務部', label: '総務部' }, { value: '人事部', label: '人事部' }, { value: '経理部', label: '経理部' }, { value: '企画部', label: '企画部' }] },
      { id: 'b-010', type: 'variable_line', order: 9, variableLabel: '役職', variableKey: 'position', variableType: 'text', variableRequired: false },
      { id: 'b-011', type: 'variable_line', order: 10, variableLabel: '雇用形態', variableKey: 'employment_type', variableType: 'select', variableRequired: true, variableOptions: [{ value: '正社員', label: '正社員' }, { value: '契約社員', label: '契約社員' }, { value: 'パート', label: 'パート' }, { value: '嘱託社員', label: '嘱託社員' }] },
      { id: 'b-012', type: 'variable_line', order: 11, variableLabel: '入社年月日', variableKey: 'hire_date', variableType: 'date', variableRequired: true },
      { id: 'b-013', type: 'variable_line', order: 12, variableLabel: '使用目的', variableKey: 'purpose', variableType: 'select', variableRequired: true, variableOptions: [{ value: '金融機関提出', label: '金融機関提出' }, { value: '保育園申請', label: '保育園申請' }, { value: '住宅ローン申請', label: '住宅ローン申請' }, { value: 'ビザ申請', label: 'ビザ申請' }, { value: 'その他', label: 'その他' }] },
      { id: 'b-014', type: 'spacer', order: 13, spacerHeight: 10 },
      { id: 'b-015', type: 'paragraph', order: 14, content: '以上', align: 'right', fontSize: 12 },
      { id: 'b-016', type: 'spacer', order: 15, spacerHeight: 15 },
      { id: 'b-017', type: 'signature', order: 16, companyName: 'デモ株式会社', representativeTitle: '代表取締役', representativeName: '○○ ○○' },
      { id: 'b-018', type: 'seal', order: 17, sealId: 'seal-001', sealPosition: 'right' },
    ],
    created_at: '2026-01-10T00:00:00Z',
  },
  // ====== tpl-002: 請求書（改善版） ======
  {
    id: 'tpl-002',
    name: '請求書',
    document_type: 'invoice',
    description: '取引先への請求書。インボイス制度対応、消費税計算、振込先情報、登録番号を含む。',
    is_published: true,
    version: 2,
    variables: [
      { key: 'client_name', label: '取引先名', type: 'text', required: true },
      { key: 'invoice_number', label: '請求書番号', type: 'text', required: true },
      { key: 'amount', label: '金額（税抜）', type: 'text', required: true },
      { key: 'tax_amount', label: '消費税額', type: 'text', required: true },
      { key: 'issue_date', label: '発行日', type: 'date', required: true },
      { key: 'due_date', label: '支払期限', type: 'date', required: true },
      { key: 'description', label: '摘要', type: 'text', required: false },
      { key: 'payment_method', label: '支払方法', type: 'select', required: true, options: [{ value: '銀行振込', label: '銀行振込' }, { value: '口座振替', label: '口座振替' }] },
    ],
    body_template: '',
    blocks: [
      { id: 'b-101', type: 'date_line', order: 0, content: '{{issue_date}}', align: 'right' },
      { id: 'b-102', type: 'heading', order: 1, content: '請 求 書', level: 1, align: 'center', letterSpacing: 16 },
      { id: 'b-103', type: 'spacer', order: 2, spacerHeight: 5 },
      { id: 'b-104', type: 'variable_line', order: 3, variableLabel: '請求書番号', variableKey: 'invoice_number', variableType: 'text', variableRequired: true },
      { id: 'b-105', type: 'spacer', order: 4, spacerHeight: 5 },
      { id: 'b-106', type: 'address_block', order: 5, addressCompany: '{{client_name}}', addressSuffix: '御中' },
      { id: 'b-107', type: 'spacer', order: 6, spacerHeight: 8 },
      { id: 'b-108', type: 'paragraph', order: 7, content: '下記の通りご請求申し上げます。', align: 'left', fontSize: 12 },
      { id: 'b-109', type: 'divider', order: 8, dividerStyle: 'solid', dividerThickness: 1 },
      { id: 'b-110', type: 'table', order: 9, tableRows: 4, tableCols: 4, tableHeaders: ['摘要', '数量', '単価', '金額'], tableCells: [['{{description}}', '1', '¥{{amount}}', '¥{{amount}}'], ['', '', '', ''], ['小計（税抜）', '', '', '¥{{amount}}'], ['消費税（10%）', '', '', '¥{{tax_amount}}']] },
      { id: 'b-111', type: 'spacer', order: 10, spacerHeight: 5 },
      { id: 'b-112', type: 'variable_line', order: 11, variableLabel: '支払期限', variableKey: 'due_date', variableType: 'date', variableRequired: true },
      { id: 'b-113', type: 'variable_line', order: 12, variableLabel: '支払方法', variableKey: 'payment_method', variableType: 'select', variableRequired: true, variableOptions: [{ value: '銀行振込', label: '銀行振込' }, { value: '口座振替', label: '口座振替' }] },
      { id: 'b-114', type: 'spacer', order: 13, spacerHeight: 5 },
      { id: 'b-115', type: 'notice', order: 14, content: '【振込先】\nみずほ銀行 本店営業部 普通 1234567\n口座名義: デモ株式会社\n※振込手数料はお客様のご負担でお願いいたします。', noticeStyle: 'bordered' },
      { id: 'b-116', type: 'paragraph', order: 15, content: '登録番号: T1234567890123', align: 'left', fontSize: 10 },
      { id: 'b-117', type: 'spacer', order: 16, spacerHeight: 10 },
      { id: 'b-118', type: 'signature', order: 17, companyName: 'デモ株式会社', representativeTitle: '代表取締役', representativeName: '○○ ○○' },
      { id: 'b-119', type: 'seal', order: 18, sealId: 'seal-002', sealPosition: 'right' },
    ],
    created_at: '2026-02-01T00:00:00Z',
  },
  // ====== tpl-003: 見積書（改善版） ======
  {
    id: 'tpl-003',
    name: '見積書',
    document_type: 'quotation',
    description: '取引先への見積書。有効期限、支払条件、納期を含む。複数明細行に対応。',
    is_published: true,
    version: 1,
    variables: [
      { key: 'client_name', label: '取引先名', type: 'text', required: true },
      { key: 'quotation_number', label: '見積番号', type: 'text', required: true },
      { key: 'subject', label: '件名', type: 'text', required: true },
      { key: 'amount', label: '見積金額（税抜）', type: 'text', required: true },
      { key: 'validity', label: '有効期限', type: 'text', required: true },
      { key: 'delivery_date', label: '納期', type: 'text', required: false },
      { key: 'payment_terms', label: '支払条件', type: 'select', required: true, options: [{ value: '月末締め翌月末払い', label: '月末締め翌月末払い' }, { value: '納品後30日以内', label: '納品後30日以内' }, { value: '前払い', label: '前払い' }] },
    ],
    body_template: '',
    blocks: [
      { id: 'b-201', type: 'date_line', order: 0, content: '{{issue_date}}', align: 'right' },
      { id: 'b-202', type: 'heading', order: 1, content: '見 積 書', level: 1, align: 'center', letterSpacing: 16 },
      { id: 'b-203', type: 'spacer', order: 2, spacerHeight: 5 },
      { id: 'b-204', type: 'variable_line', order: 3, variableLabel: '見積番号', variableKey: 'quotation_number', variableType: 'text', variableRequired: true },
      { id: 'b-205', type: 'spacer', order: 4, spacerHeight: 5 },
      { id: 'b-206', type: 'address_block', order: 5, addressCompany: '{{client_name}}', addressSuffix: '御中' },
      { id: 'b-207', type: 'spacer', order: 6, spacerHeight: 5 },
      { id: 'b-208', type: 'paragraph', order: 7, content: '下記の通りお見積り申し上げます。', align: 'left', fontSize: 12 },
      { id: 'b-209', type: 'variable_line', order: 8, variableLabel: '件名', variableKey: 'subject', variableType: 'text', variableRequired: true },
      { id: 'b-210', type: 'divider', order: 9, dividerStyle: 'solid', dividerThickness: 1 },
      { id: 'b-211', type: 'table', order: 10, tableRows: 3, tableCols: 4, tableHeaders: ['項目', '数量', '単価', '金額'], tableCells: [['{{subject}}', '1', '¥{{amount}}', '¥{{amount}}'], ['', '', '', ''], ['合計（税抜）', '', '', '¥{{amount}}']] },
      { id: 'b-212', type: 'spacer', order: 11, spacerHeight: 5 },
      { id: 'b-213', type: 'variable_line', order: 12, variableLabel: '有効期限', variableKey: 'validity', variableType: 'text', variableRequired: true },
      { id: 'b-214', type: 'variable_line', order: 13, variableLabel: '納期', variableKey: 'delivery_date', variableType: 'text', variableRequired: false },
      { id: 'b-215', type: 'variable_line', order: 14, variableLabel: '支払条件', variableKey: 'payment_terms', variableType: 'select', variableRequired: true, variableOptions: [{ value: '月末締め翌月末払い', label: '月末締め翌月末払い' }, { value: '納品後30日以内', label: '納品後30日以内' }, { value: '前払い', label: '前払い' }] },
      { id: 'b-216', type: 'notice', order: 15, content: '※上記金額には消費税は含まれておりません。\n※本見積書の有効期限を過ぎた場合は再見積りとなります。', noticeStyle: 'info' },
      { id: 'b-217', type: 'spacer', order: 16, spacerHeight: 10 },
      { id: 'b-218', type: 'signature', order: 17, companyName: 'デモ株式会社', representativeTitle: '代表取締役', representativeName: '○○ ○○' },
      { id: 'b-219', type: 'seal', order: 18, sealId: 'seal-002', sealPosition: 'right' },
    ],
    created_at: '2026-01-15T00:00:00Z',
  },
  // ====== tpl-004: 退職証明書（改善版） ======
  {
    id: 'tpl-004',
    name: '退職証明書',
    document_type: 'resignation',
    description: '退職した従業員に発行する退職証明書。労働基準法第22条に基づく法定記載事項を網羅。',
    is_published: true,
    version: 1,
    variables: [
      { key: 'employee_name', label: '氏名', type: 'text', required: true },
      { key: 'birth_date', label: '生年月日', type: 'date', required: true },
      { key: 'address', label: '住所', type: 'text', required: false },
      { key: 'department', label: '所属部署', type: 'text', required: true },
      { key: 'position', label: '役職', type: 'text', required: false },
      { key: 'employment_type', label: '雇用形態', type: 'select', required: true, options: [{ value: '正社員', label: '正社員' }, { value: '契約社員', label: '契約社員' }, { value: 'パート', label: 'パート' }] },
      { key: 'hire_date', label: '入社日', type: 'date', required: true },
      { key: 'resign_date', label: '退職日', type: 'date', required: true },
      { key: 'reason', label: '退職事由', type: 'select', required: true, options: [{ value: '自己都合による退職', label: '自己都合による退職' }, { value: '会社都合による退職', label: '会社都合による退職' }, { value: '契約期間満了', label: '契約期間満了' }, { value: '定年退職', label: '定年退職' }] },
      { key: 'job_description', label: '業務内容', type: 'text', required: false },
    ],
    body_template: '',
    blocks: [
      { id: 'b-301', type: 'date_line', order: 0, content: '{{resign_date}}', align: 'right' },
      { id: 'b-302', type: 'heading', order: 1, content: '退 職 証 明 書', level: 1, align: 'center', letterSpacing: 16 },
      { id: 'b-303', type: 'spacer', order: 2, spacerHeight: 10 },
      { id: 'b-304', type: 'paragraph', order: 3, content: '下記の者が当社を退職したことを証明いたします。', align: 'left', fontSize: 12 },
      { id: 'b-305', type: 'spacer', order: 4, spacerHeight: 5 },
      { id: 'b-306', type: 'heading', order: 5, content: '記', level: 3, align: 'center' },
      { id: 'b-307', type: 'spacer', order: 6, spacerHeight: 5 },
      { id: 'b-308', type: 'variable_line', order: 7, variableLabel: '氏名', variableKey: 'employee_name', variableType: 'text', variableRequired: true },
      { id: 'b-309', type: 'variable_line', order: 8, variableLabel: '生年月日', variableKey: 'birth_date', variableType: 'date', variableRequired: true },
      { id: 'b-310', type: 'variable_line', order: 9, variableLabel: '住所', variableKey: 'address', variableType: 'text', variableRequired: false },
      { id: 'b-311', type: 'variable_line', order: 10, variableLabel: '所属部署', variableKey: 'department', variableType: 'text', variableRequired: true },
      { id: 'b-312', type: 'variable_line', order: 11, variableLabel: '役職', variableKey: 'position', variableType: 'text', variableRequired: false },
      { id: 'b-313', type: 'variable_line', order: 12, variableLabel: '雇用形態', variableKey: 'employment_type', variableType: 'select', variableRequired: true, variableOptions: [{ value: '正社員', label: '正社員' }, { value: '契約社員', label: '契約社員' }, { value: 'パート', label: 'パート' }] },
      { id: 'b-314', type: 'variable_line', order: 13, variableLabel: '入社日', variableKey: 'hire_date', variableType: 'date', variableRequired: true },
      { id: 'b-315', type: 'variable_line', order: 14, variableLabel: '退職日', variableKey: 'resign_date', variableType: 'date', variableRequired: true },
      { id: 'b-316', type: 'variable_line', order: 15, variableLabel: '退職事由', variableKey: 'reason', variableType: 'select', variableRequired: true, variableOptions: [{ value: '自己都合による退職', label: '自己都合による退職' }, { value: '会社都合による退職', label: '会社都合による退職' }, { value: '契約期間満了', label: '契約期間満了' }, { value: '定年退職', label: '定年退職' }] },
      { id: 'b-317', type: 'variable_line', order: 16, variableLabel: '業務内容', variableKey: 'job_description', variableType: 'text', variableRequired: false },
      { id: 'b-318', type: 'spacer', order: 17, spacerHeight: 5 },
      { id: 'b-319', type: 'paragraph', order: 18, content: '以上', align: 'right', fontSize: 12 },
      { id: 'b-320', type: 'spacer', order: 19, spacerHeight: 10 },
      { id: 'b-321', type: 'notice', order: 20, content: '本証明書は、労働基準法第22条に基づき発行するものです。', noticeStyle: 'info' },
      { id: 'b-322', type: 'spacer', order: 21, spacerHeight: 10 },
      { id: 'b-323', type: 'signature', order: 22, companyName: 'デモ株式会社', representativeTitle: '代表取締役', representativeName: '○○ ○○' },
      { id: 'b-324', type: 'seal', order: 23, sealId: 'seal-001', sealPosition: 'right' },
    ],
    created_at: '2026-02-15T00:00:00Z',
  },
  // ====== tpl-005: 雇用契約書 ======
  {
    id: 'tpl-005',
    name: '雇用契約書',
    document_type: 'employment_contract',
    description: '従業員との雇用契約を締結するための書面。労働条件通知書を兼ねる形式。勤務時間・給与・休日等の主要条件を記載。',
    is_published: true,
    version: 1,
    variables: [
      { key: 'employee_name', label: '従業員氏名', type: 'text', required: true },
      { key: 'contract_date', label: '契約日', type: 'date', required: true },
      { key: 'start_date', label: '雇用開始日', type: 'date', required: true },
      { key: 'employment_type', label: '雇用形態', type: 'select', required: true, options: [{ value: '正社員', label: '正社員' }, { value: '契約社員', label: '契約社員' }, { value: 'パートタイム', label: 'パートタイム' }] },
      { key: 'department', label: '配属部署', type: 'text', required: true },
      { key: 'position', label: '職位', type: 'text', required: false },
      { key: 'work_location', label: '勤務地', type: 'text', required: true },
      { key: 'salary', label: '月額給与', type: 'text', required: true },
    ],
    body_template: '',
    blocks: [
      { id: 'b-501', type: 'date_line', order: 0, content: '{{contract_date}}', align: 'right' },
      { id: 'b-502', type: 'heading', order: 1, content: '雇 用 契 約 書', level: 1, align: 'center', letterSpacing: 16 },
      { id: 'b-503', type: 'spacer', order: 2, spacerHeight: 8 },
      { id: 'b-504', type: 'paragraph', order: 3, content: 'デモ株式会社（以下「甲」という）と{{employee_name}}（以下「乙」という）は、以下の条件により雇用契約を締結する。', align: 'left', fontSize: 12 },
      { id: 'b-505', type: 'spacer', order: 4, spacerHeight: 5 },
      { id: 'b-506', type: 'heading', order: 5, content: '第1条（雇用期間）', level: 3, align: 'left' },
      { id: 'b-507', type: 'paragraph', order: 6, content: '甲は乙を{{start_date}}より雇用する。雇用期間の定めは別途定めるものとする。', align: 'left', fontSize: 11 },
      { id: 'b-508', type: 'heading', order: 7, content: '第2条（就業場所・業務内容）', level: 3, align: 'left' },
      { id: 'b-509', type: 'variable_line', order: 8, variableLabel: '勤務地', variableKey: 'work_location', variableType: 'text', variableRequired: true },
      { id: 'b-510', type: 'variable_line', order: 9, variableLabel: '配属部署', variableKey: 'department', variableType: 'text', variableRequired: true },
      { id: 'b-511', type: 'variable_line', order: 10, variableLabel: '職位', variableKey: 'position', variableType: 'text', variableRequired: false },
      { id: 'b-512', type: 'heading', order: 11, content: '第3条（勤務時間・休日）', level: 3, align: 'left' },
      { id: 'b-513', type: 'paragraph', order: 12, content: '1. 始業時刻: 9:00 ／ 終業時刻: 18:00（休憩60分）\n2. 所定休日: 土曜日、日曜日、祝日、年末年始\n3. 年次有給休暇: 法定通り付与する', align: 'left', fontSize: 11 },
      { id: 'b-514', type: 'heading', order: 13, content: '第4条（給与）', level: 3, align: 'left' },
      { id: 'b-515', type: 'variable_line', order: 14, variableLabel: '雇用形態', variableKey: 'employment_type', variableType: 'select', variableRequired: true, variableOptions: [{ value: '正社員', label: '正社員' }, { value: '契約社員', label: '契約社員' }, { value: 'パートタイム', label: 'パートタイム' }] },
      { id: 'b-516', type: 'variable_line', order: 15, variableLabel: '月額給与', variableKey: 'salary', variableType: 'text', variableRequired: true },
      { id: 'b-517', type: 'paragraph', order: 16, content: '支払日: 毎月25日（当日が休日の場合は前営業日）\n支払方法: 銀行振込', align: 'left', fontSize: 11 },
      { id: 'b-518', type: 'heading', order: 17, content: '第5条（その他）', level: 3, align: 'left' },
      { id: 'b-519', type: 'paragraph', order: 18, content: '本契約に定めのない事項については、就業規則および関係法令の定めるところによる。', align: 'left', fontSize: 11 },
      { id: 'b-520', type: 'spacer', order: 19, spacerHeight: 10 },
      { id: 'b-521', type: 'paragraph', order: 20, content: '本契約の成立を証するため、本書2通を作成し、甲乙記名押印のうえ各1通を保有する。', align: 'left', fontSize: 11 },
      { id: 'b-522', type: 'spacer', order: 21, spacerHeight: 15 },
      { id: 'b-523', type: 'signature', order: 22, companyName: 'デモ株式会社', representativeTitle: '代表取締役', representativeName: '○○ ○○' },
      { id: 'b-524', type: 'seal', order: 23, sealId: 'seal-001', sealPosition: 'right' },
    ],
    created_at: '2026-02-20T00:00:00Z',
  },
  // ====== tpl-006: 秘密保持契約書（NDA） ======
  {
    id: 'tpl-006',
    name: '秘密保持契約書（NDA）',
    document_type: 'nda',
    description: '取引先・業務委託先等と締結する秘密保持契約書。機密情報の定義、使用制限、有効期間等を規定。',
    is_published: true,
    version: 1,
    variables: [
      { key: 'counterparty_name', label: '相手方名称', type: 'text', required: true },
      { key: 'counterparty_representative', label: '相手方代表者名', type: 'text', required: true },
      { key: 'contract_date', label: '契約日', type: 'date', required: true },
      { key: 'purpose', label: '目的', type: 'text', required: true },
      { key: 'valid_period', label: '有効期間', type: 'select', required: true, options: [{ value: '1年間', label: '1年間' }, { value: '2年間', label: '2年間' }, { value: '3年間', label: '3年間' }, { value: '5年間', label: '5年間' }] },
      { key: 'confidentiality_period', label: '秘密保持期間', type: 'select', required: true, options: [{ value: '契約終了後2年間', label: '契約終了後2年間' }, { value: '契約終了後3年間', label: '契約終了後3年間' }, { value: '契約終了後5年間', label: '契約終了後5年間' }] },
    ],
    body_template: '',
    blocks: [
      { id: 'b-601', type: 'date_line', order: 0, content: '{{contract_date}}', align: 'right' },
      { id: 'b-602', type: 'heading', order: 1, content: '秘密保持契約書', level: 1, align: 'center', letterSpacing: 8 },
      { id: 'b-603', type: 'spacer', order: 2, spacerHeight: 8 },
      { id: 'b-604', type: 'paragraph', order: 3, content: 'デモ株式会社（以下「甲」という）と{{counterparty_name}}（以下「乙」という）は、{{purpose}}に関連して相互に開示する秘密情報の取扱いについて、以下の通り合意する。', align: 'left', fontSize: 11 },
      { id: 'b-605', type: 'spacer', order: 4, spacerHeight: 5 },
      { id: 'b-606', type: 'heading', order: 5, content: '第1条（秘密情報の定義）', level: 3, align: 'left' },
      { id: 'b-607', type: 'paragraph', order: 6, content: '本契約における「秘密情報」とは、開示当事者が秘密である旨を明示して開示した技術上・営業上の情報をいう。ただし、以下に該当する情報は除く。\n(1) 開示時点で既に公知であった情報\n(2) 開示後、受領者の責によらず公知となった情報\n(3) 開示時点で受領者が既に保有していた情報\n(4) 正当な権限を有する第三者から秘密保持義務を負わずに取得した情報', align: 'left', fontSize: 11 },
      { id: 'b-608', type: 'heading', order: 7, content: '第2条（秘密情報の使用目的）', level: 3, align: 'left' },
      { id: 'b-609', type: 'variable_line', order: 8, variableLabel: '目的', variableKey: 'purpose', variableType: 'text', variableRequired: true },
      { id: 'b-610', type: 'heading', order: 9, content: '第3条（秘密保持義務）', level: 3, align: 'left' },
      { id: 'b-611', type: 'paragraph', order: 10, content: '受領者は、秘密情報を善良な管理者の注意義務をもって管理し、開示者の書面による事前承諾なく第三者に開示・漏洩してはならない。', align: 'left', fontSize: 11 },
      { id: 'b-612', type: 'heading', order: 11, content: '第4条（有効期間）', level: 3, align: 'left' },
      { id: 'b-613', type: 'variable_line', order: 12, variableLabel: '有効期間', variableKey: 'valid_period', variableType: 'select', variableRequired: true, variableOptions: [{ value: '1年間', label: '1年間' }, { value: '2年間', label: '2年間' }, { value: '3年間', label: '3年間' }, { value: '5年間', label: '5年間' }] },
      { id: 'b-614', type: 'variable_line', order: 13, variableLabel: '秘密保持期間', variableKey: 'confidentiality_period', variableType: 'select', variableRequired: true, variableOptions: [{ value: '契約終了後2年間', label: '契約終了後2年間' }, { value: '契約終了後3年間', label: '契約終了後3年間' }, { value: '契約終了後5年間', label: '契約終了後5年間' }] },
      { id: 'b-615', type: 'spacer', order: 14, spacerHeight: 10 },
      { id: 'b-616', type: 'paragraph', order: 15, content: '本契約の成立を証するため、本書2通を作成し、甲乙記名押印のうえ各1通を保有する。', align: 'left', fontSize: 11 },
      { id: 'b-617', type: 'spacer', order: 16, spacerHeight: 15 },
      { id: 'b-618', type: 'paragraph', order: 17, content: '甲:', align: 'left', fontSize: 11, bold: true },
      { id: 'b-619', type: 'signature', order: 18, companyName: 'デモ株式会社', representativeTitle: '代表取締役', representativeName: '○○ ○○' },
      { id: 'b-620', type: 'seal', order: 19, sealId: 'seal-001', sealPosition: 'right' },
      { id: 'b-621', type: 'spacer', order: 20, spacerHeight: 10 },
      { id: 'b-622', type: 'paragraph', order: 21, content: '乙:', align: 'left', fontSize: 11, bold: true },
      { id: 'b-623', type: 'variable_line', order: 22, variableLabel: '相手方名称', variableKey: 'counterparty_name', variableType: 'text', variableRequired: true },
      { id: 'b-624', type: 'variable_line', order: 23, variableLabel: '相手方代表者名', variableKey: 'counterparty_representative', variableType: 'text', variableRequired: true },
    ],
    created_at: '2026-02-25T00:00:00Z',
  },
  // ====== tpl-007: 業務委託契約書 ======
  {
    id: 'tpl-007',
    name: '業務委託契約書',
    document_type: 'outsourcing_contract',
    description: '外部事業者への業務委託に使用する契約書。委託内容、報酬、納期、知的財産権の帰属等を規定。',
    is_published: true,
    version: 1,
    variables: [
      { key: 'contractor_name', label: '受託者名', type: 'text', required: true },
      { key: 'contractor_representative', label: '受託者代表者名', type: 'text', required: true },
      { key: 'contract_date', label: '契約日', type: 'date', required: true },
      { key: 'work_description', label: '委託業務内容', type: 'text', required: true },
      { key: 'start_date', label: '業務開始日', type: 'date', required: true },
      { key: 'end_date', label: '業務終了日', type: 'date', required: true },
      { key: 'fee', label: '委託料', type: 'text', required: true },
      { key: 'payment_terms', label: '支払条件', type: 'select', required: true, options: [{ value: '業務完了後30日以内', label: '業務完了後30日以内' }, { value: '月末締め翌月末払い', label: '月末締め翌月末払い' }, { value: '着手金50%・完了後50%', label: '着手金50%・完了後50%' }] },
    ],
    body_template: '',
    blocks: [
      { id: 'b-701', type: 'date_line', order: 0, content: '{{contract_date}}', align: 'right' },
      { id: 'b-702', type: 'heading', order: 1, content: '業務委託契約書', level: 1, align: 'center', letterSpacing: 8 },
      { id: 'b-703', type: 'spacer', order: 2, spacerHeight: 8 },
      { id: 'b-704', type: 'paragraph', order: 3, content: 'デモ株式会社（以下「甲」という）と{{contractor_name}}（以下「乙」という）は、甲が乙に対して業務を委託することについて、以下の通り契約を締結する。', align: 'left', fontSize: 11 },
      { id: 'b-705', type: 'heading', order: 4, content: '第1条（委託業務）', level: 3, align: 'left' },
      { id: 'b-706', type: 'variable_line', order: 5, variableLabel: '委託業務内容', variableKey: 'work_description', variableType: 'text', variableRequired: true },
      { id: 'b-707', type: 'heading', order: 6, content: '第2条（契約期間）', level: 3, align: 'left' },
      { id: 'b-708', type: 'variable_line', order: 7, variableLabel: '業務開始日', variableKey: 'start_date', variableType: 'date', variableRequired: true },
      { id: 'b-709', type: 'variable_line', order: 8, variableLabel: '業務終了日', variableKey: 'end_date', variableType: 'date', variableRequired: true },
      { id: 'b-710', type: 'heading', order: 9, content: '第3条（委託料及び支払）', level: 3, align: 'left' },
      { id: 'b-711', type: 'variable_line', order: 10, variableLabel: '委託料', variableKey: 'fee', variableType: 'text', variableRequired: true },
      { id: 'b-712', type: 'variable_line', order: 11, variableLabel: '支払条件', variableKey: 'payment_terms', variableType: 'select', variableRequired: true, variableOptions: [{ value: '業務完了後30日以内', label: '業務完了後30日以内' }, { value: '月末締め翌月末払い', label: '月末締め翌月末払い' }, { value: '着手金50%・完了後50%', label: '着手金50%・完了後50%' }] },
      { id: 'b-713', type: 'heading', order: 12, content: '第4条（秘密保持）', level: 3, align: 'left' },
      { id: 'b-714', type: 'paragraph', order: 13, content: '乙は、本業務遂行に際して知り得た甲の機密情報を第三者に漏洩してはならない。', align: 'left', fontSize: 11 },
      { id: 'b-715', type: 'heading', order: 14, content: '第5条（知的財産権）', level: 3, align: 'left' },
      { id: 'b-716', type: 'paragraph', order: 15, content: '本業務の成果物に関する知的財産権は、委託料の支払完了をもって甲に帰属するものとする。', align: 'left', fontSize: 11 },
      { id: 'b-717', type: 'spacer', order: 16, spacerHeight: 10 },
      { id: 'b-718', type: 'paragraph', order: 17, content: '本契約の成立を証するため、本書2通を作成し、甲乙記名押印のうえ各1通を保有する。', align: 'left', fontSize: 11 },
      { id: 'b-719', type: 'spacer', order: 18, spacerHeight: 15 },
      { id: 'b-720', type: 'signature', order: 19, companyName: 'デモ株式会社', representativeTitle: '代表取締役', representativeName: '○○ ○○' },
      { id: 'b-721', type: 'seal', order: 20, sealId: 'seal-001', sealPosition: 'right' },
    ],
    created_at: '2026-03-01T00:00:00Z',
  },
  // ====== tpl-008: 稟議書 ======
  {
    id: 'tpl-008',
    name: '稟議書',
    document_type: 'ringi',
    description: '社内決裁を得るための稟議書。購入・契約・経費等の承認申請に使用。起案理由、金額、効果を明記。',
    is_published: true,
    version: 1,
    variables: [
      { key: 'applicant_name', label: '起案者', type: 'text', required: true },
      { key: 'applicant_department', label: '起案部署', type: 'text', required: true },
      { key: 'application_date', label: '起案日', type: 'date', required: true },
      { key: 'subject', label: '件名', type: 'text', required: true },
      { key: 'category', label: '区分', type: 'select', required: true, options: [{ value: '物品購入', label: '物品購入' }, { value: 'サービス契約', label: 'サービス契約' }, { value: '設備投資', label: '設備投資' }, { value: '経費支出', label: '経費支出' }, { value: 'その他', label: 'その他' }] },
      { key: 'amount', label: '金額', type: 'text', required: true },
      { key: 'reason', label: '起案理由', type: 'text', required: true },
      { key: 'expected_effect', label: '期待される効果', type: 'text', required: false },
    ],
    body_template: '',
    blocks: [
      { id: 'b-801', type: 'date_line', order: 0, content: '{{application_date}}', align: 'right' },
      { id: 'b-802', type: 'heading', order: 1, content: '稟 議 書', level: 1, align: 'center', letterSpacing: 16 },
      { id: 'b-803', type: 'spacer', order: 2, spacerHeight: 5 },
      { id: 'b-804', type: 'variable_line', order: 3, variableLabel: '起案者', variableKey: 'applicant_name', variableType: 'text', variableRequired: true },
      { id: 'b-805', type: 'variable_line', order: 4, variableLabel: '起案部署', variableKey: 'applicant_department', variableType: 'text', variableRequired: true },
      { id: 'b-806', type: 'divider', order: 5, dividerStyle: 'solid', dividerThickness: 1 },
      { id: 'b-807', type: 'variable_line', order: 6, variableLabel: '件名', variableKey: 'subject', variableType: 'text', variableRequired: true },
      { id: 'b-808', type: 'variable_line', order: 7, variableLabel: '区分', variableKey: 'category', variableType: 'select', variableRequired: true, variableOptions: [{ value: '物品購入', label: '物品購入' }, { value: 'サービス契約', label: 'サービス契約' }, { value: '設備投資', label: '設備投資' }, { value: '経費支出', label: '経費支出' }, { value: 'その他', label: 'その他' }] },
      { id: 'b-809', type: 'variable_line', order: 8, variableLabel: '金額', variableKey: 'amount', variableType: 'text', variableRequired: true },
      { id: 'b-810', type: 'spacer', order: 9, spacerHeight: 5 },
      { id: 'b-811', type: 'heading', order: 10, content: '起案理由', level: 3, align: 'left' },
      { id: 'b-812', type: 'variable_line', order: 11, variableLabel: '起案理由', variableKey: 'reason', variableType: 'text', variableRequired: true },
      { id: 'b-813', type: 'heading', order: 12, content: '期待される効果', level: 3, align: 'left' },
      { id: 'b-814', type: 'variable_line', order: 13, variableLabel: '期待される効果', variableKey: 'expected_effect', variableType: 'text', variableRequired: false },
      { id: 'b-815', type: 'divider', order: 14, dividerStyle: 'dashed', dividerThickness: 1 },
      { id: 'b-816', type: 'paragraph', order: 15, content: '【決裁欄】', align: 'left', fontSize: 11, bold: true },
      { id: 'b-817', type: 'table', order: 16, tableRows: 2, tableCols: 4, tableHeaders: ['部長', '本部長', '経理部長', '社長'], tableCells: [['', '', '', ''], ['  /  ', '  /  ', '  /  ', '  /  ']] },
      { id: 'b-818', type: 'spacer', order: 17, spacerHeight: 10 },
      { id: 'b-819', type: 'notice', order: 18, content: '※100万円以上の案件は取締役会承認が必要です。', noticeStyle: 'warning' },
    ],
    created_at: '2026-03-02T00:00:00Z',
  },
  // ====== tpl-009: 社内通達 ======
  {
    id: 'tpl-009',
    name: '社内通達',
    document_type: 'internal_notice',
    description: '全社員または特定部門に対して周知する社内通達文書。人事異動、制度変更、業務連絡等に使用。',
    is_published: true,
    version: 1,
    variables: [
      { key: 'notice_number', label: '通達番号', type: 'text', required: true },
      { key: 'notice_date', label: '発令日', type: 'date', required: true },
      { key: 'subject', label: '件名', type: 'text', required: true },
      { key: 'target', label: '対象', type: 'select', required: true, options: [{ value: '全社員', label: '全社員' }, { value: '管理職', label: '管理職' }, { value: '正社員', label: '正社員' }, { value: '特定部署', label: '特定部署' }] },
      { key: 'issuer_department', label: '発信元部署', type: 'text', required: true },
      { key: 'effective_date', label: '施行日', type: 'date', required: true },
    ],
    body_template: '',
    blocks: [
      { id: 'b-901', type: 'variable_line', order: 0, variableLabel: '通達番号', variableKey: 'notice_number', variableType: 'text', variableRequired: true },
      { id: 'b-902', type: 'date_line', order: 1, content: '{{notice_date}}', align: 'right' },
      { id: 'b-903', type: 'heading', order: 2, content: '社 内 通 達', level: 1, align: 'center', letterSpacing: 16 },
      { id: 'b-904', type: 'spacer', order: 3, spacerHeight: 8 },
      { id: 'b-905', type: 'variable_line', order: 4, variableLabel: '対象', variableKey: 'target', variableType: 'select', variableRequired: true, variableOptions: [{ value: '全社員', label: '全社員' }, { value: '管理職', label: '管理職' }, { value: '正社員', label: '正社員' }, { value: '特定部署', label: '特定部署' }] },
      { id: 'b-906', type: 'variable_line', order: 5, variableLabel: '件名', variableKey: 'subject', variableType: 'text', variableRequired: true },
      { id: 'b-907', type: 'divider', order: 6, dividerStyle: 'solid', dividerThickness: 1 },
      { id: 'b-908', type: 'paragraph', order: 7, content: '（ここに通達内容を記載してください）', align: 'left', fontSize: 12 },
      { id: 'b-909', type: 'spacer', order: 8, spacerHeight: 5 },
      { id: 'b-910', type: 'variable_line', order: 9, variableLabel: '施行日', variableKey: 'effective_date', variableType: 'date', variableRequired: true },
      { id: 'b-911', type: 'spacer', order: 10, spacerHeight: 10 },
      { id: 'b-912', type: 'paragraph', order: 11, content: '以上', align: 'right', fontSize: 12 },
      { id: 'b-913', type: 'spacer', order: 12, spacerHeight: 10 },
      { id: 'b-914', type: 'variable_line', order: 13, variableLabel: '発信元部署', variableKey: 'issuer_department', variableType: 'text', variableRequired: true },
      { id: 'b-915', type: 'signature', order: 14, companyName: 'デモ株式会社', representativeTitle: '代表取締役', representativeName: '○○ ○○' },
      { id: 'b-916', type: 'seal', order: 15, sealId: 'seal-002', sealPosition: 'right' },
    ],
    created_at: '2026-03-03T00:00:00Z',
  },
  // ====== tpl-010: 採用通知書 ======
  {
    id: 'tpl-010',
    name: '採用通知書',
    document_type: 'offer_letter',
    description: '採用内定者に送付する採用通知書（内定通知書）。入社日、配属先、処遇条件等を記載。',
    is_published: true,
    version: 1,
    variables: [
      { key: 'candidate_name', label: '内定者氏名', type: 'text', required: true },
      { key: 'notification_date', label: '通知日', type: 'date', required: true },
      { key: 'start_date', label: '入社予定日', type: 'date', required: true },
      { key: 'department', label: '配属予定部署', type: 'text', required: true },
      { key: 'position', label: '職種', type: 'text', required: true },
      { key: 'employment_type', label: '雇用形態', type: 'select', required: true, options: [{ value: '正社員', label: '正社員' }, { value: '契約社員', label: '契約社員' }] },
      { key: 'reply_deadline', label: '回答期限', type: 'date', required: true },
    ],
    body_template: '',
    blocks: [
      { id: 'b-1001', type: 'date_line', order: 0, content: '{{notification_date}}', align: 'right' },
      { id: 'b-1002', type: 'address_block', order: 1, addressName: '{{candidate_name}}', addressSuffix: '様' },
      { id: 'b-1003', type: 'spacer', order: 2, spacerHeight: 5 },
      { id: 'b-1004', type: 'heading', order: 3, content: '採 用 通 知 書', level: 1, align: 'center', letterSpacing: 16 },
      { id: 'b-1005', type: 'spacer', order: 4, spacerHeight: 8 },
      { id: 'b-1006', type: 'paragraph', order: 5, content: '先般は、弊社の採用選考にご応募いただき、誠にありがとうございました。\n厳正なる選考の結果、貴殿を採用することに決定いたしましたので、ここにご通知申し上げます。', align: 'left', fontSize: 12 },
      { id: 'b-1007', type: 'spacer', order: 6, spacerHeight: 5 },
      { id: 'b-1008', type: 'heading', order: 7, content: '記', level: 3, align: 'center' },
      { id: 'b-1009', type: 'variable_line', order: 8, variableLabel: '入社予定日', variableKey: 'start_date', variableType: 'date', variableRequired: true },
      { id: 'b-1010', type: 'variable_line', order: 9, variableLabel: '配属予定部署', variableKey: 'department', variableType: 'text', variableRequired: true },
      { id: 'b-1011', type: 'variable_line', order: 10, variableLabel: '職種', variableKey: 'position', variableType: 'text', variableRequired: true },
      { id: 'b-1012', type: 'variable_line', order: 11, variableLabel: '雇用形態', variableKey: 'employment_type', variableType: 'select', variableRequired: true, variableOptions: [{ value: '正社員', label: '正社員' }, { value: '契約社員', label: '契約社員' }] },
      { id: 'b-1013', type: 'spacer', order: 12, spacerHeight: 5 },
      { id: 'b-1014', type: 'paragraph', order: 13, content: 'つきましては、同封の承諾書に必要事項をご記入のうえ、下記期限までにご返送くださいますようお願い申し上げます。', align: 'left', fontSize: 12 },
      { id: 'b-1015', type: 'variable_line', order: 14, variableLabel: '回答期限', variableKey: 'reply_deadline', variableType: 'date', variableRequired: true },
      { id: 'b-1016', type: 'spacer', order: 15, spacerHeight: 5 },
      { id: 'b-1017', type: 'paragraph', order: 16, content: '以上', align: 'right', fontSize: 12 },
      { id: 'b-1018', type: 'spacer', order: 17, spacerHeight: 15 },
      { id: 'b-1019', type: 'signature', order: 18, companyName: 'デモ株式会社', representativeTitle: '人事部長', representativeName: '○○ ○○' },
      { id: 'b-1020', type: 'seal', order: 19, sealId: 'seal-002', sealPosition: 'right' },
    ],
    created_at: '2026-03-04T00:00:00Z',
  },
  // ====== tpl-011: 辞令 ======
  {
    id: 'tpl-011',
    name: '辞令',
    document_type: 'personnel_order',
    description: '人事異動・昇進・配置転換等の辞令。発令日、異動内容を正式に通知する文書。',
    is_published: true,
    version: 1,
    variables: [
      { key: 'employee_name', label: '対象者氏名', type: 'text', required: true },
      { key: 'order_date', label: '発令日', type: 'date', required: true },
      { key: 'order_type', label: '辞令種別', type: 'select', required: true, options: [{ value: '異動', label: '異動' }, { value: '昇進', label: '昇進' }, { value: '昇格', label: '昇格' }, { value: '転勤', label: '転勤' }, { value: '出向', label: '出向' }] },
      { key: 'current_department', label: '現所属', type: 'text', required: true },
      { key: 'new_department', label: '新所属', type: 'text', required: true },
      { key: 'new_position', label: '新役職', type: 'text', required: false },
      { key: 'effective_date', label: '着任日', type: 'date', required: true },
    ],
    body_template: '',
    blocks: [
      { id: 'b-1101', type: 'date_line', order: 0, content: '{{order_date}}', align: 'right' },
      { id: 'b-1102', type: 'address_block', order: 1, addressName: '{{employee_name}}', addressSuffix: '殿' },
      { id: 'b-1103', type: 'spacer', order: 2, spacerHeight: 5 },
      { id: 'b-1104', type: 'heading', order: 3, content: '辞　　令', level: 1, align: 'center', letterSpacing: 24 },
      { id: 'b-1105', type: 'spacer', order: 4, spacerHeight: 10 },
      { id: 'b-1106', type: 'variable_line', order: 5, variableLabel: '辞令種別', variableKey: 'order_type', variableType: 'select', variableRequired: true, variableOptions: [{ value: '異動', label: '異動' }, { value: '昇進', label: '昇進' }, { value: '昇格', label: '昇格' }, { value: '転勤', label: '転勤' }, { value: '出向', label: '出向' }] },
      { id: 'b-1107', type: 'divider', order: 6, dividerStyle: 'solid', dividerThickness: 1 },
      { id: 'b-1108', type: 'variable_line', order: 7, variableLabel: '現所属', variableKey: 'current_department', variableType: 'text', variableRequired: true },
      { id: 'b-1109', type: 'variable_line', order: 8, variableLabel: '新所属', variableKey: 'new_department', variableType: 'text', variableRequired: true },
      { id: 'b-1110', type: 'variable_line', order: 9, variableLabel: '新役職', variableKey: 'new_position', variableType: 'text', variableRequired: false },
      { id: 'b-1111', type: 'variable_line', order: 10, variableLabel: '着任日', variableKey: 'effective_date', variableType: 'date', variableRequired: true },
      { id: 'b-1112', type: 'spacer', order: 11, spacerHeight: 10 },
      { id: 'b-1113', type: 'paragraph', order: 12, content: '以上を命ずる。', align: 'left', fontSize: 12 },
      { id: 'b-1114', type: 'spacer', order: 13, spacerHeight: 15 },
      { id: 'b-1115', type: 'signature', order: 14, companyName: 'デモ株式会社', representativeTitle: '代表取締役', representativeName: '○○ ○○' },
      { id: 'b-1116', type: 'seal', order: 15, sealId: 'seal-001', sealPosition: 'right' },
    ],
    created_at: '2026-03-05T00:00:00Z',
  },
  // ====== tpl-012: 始末書 ======
  {
    id: 'tpl-012',
    name: '始末書',
    document_type: 'incident_report',
    description: '業務上の過失・事故等の経緯と再発防止策を報告する始末書。事実関係、原因分析、対策を明記。',
    is_published: true,
    version: 1,
    variables: [
      { key: 'reporter_name', label: '報告者氏名', type: 'text', required: true },
      { key: 'reporter_department', label: '報告者部署', type: 'text', required: true },
      { key: 'report_date', label: '提出日', type: 'date', required: true },
      { key: 'incident_date', label: '発生日時', type: 'text', required: true },
      { key: 'incident_location', label: '発生場所', type: 'text', required: true },
      { key: 'incident_summary', label: '事案概要', type: 'text', required: true },
    ],
    body_template: '',
    blocks: [
      { id: 'b-1201', type: 'date_line', order: 0, content: '{{report_date}}', align: 'right' },
      { id: 'b-1202', type: 'paragraph', order: 1, content: 'デモ株式会社\n代表取締役 ○○ ○○ 殿', align: 'left', fontSize: 12 },
      { id: 'b-1203', type: 'spacer', order: 2, spacerHeight: 5 },
      { id: 'b-1204', type: 'heading', order: 3, content: '始 末 書', level: 1, align: 'center', letterSpacing: 16 },
      { id: 'b-1205', type: 'spacer', order: 4, spacerHeight: 8 },
      { id: 'b-1206', type: 'variable_line', order: 5, variableLabel: '報告者氏名', variableKey: 'reporter_name', variableType: 'text', variableRequired: true },
      { id: 'b-1207', type: 'variable_line', order: 6, variableLabel: '報告者部署', variableKey: 'reporter_department', variableType: 'text', variableRequired: true },
      { id: 'b-1208', type: 'divider', order: 7, dividerStyle: 'solid', dividerThickness: 1 },
      { id: 'b-1209', type: 'heading', order: 8, content: '1. 事案の概要', level: 3, align: 'left' },
      { id: 'b-1210', type: 'variable_line', order: 9, variableLabel: '発生日時', variableKey: 'incident_date', variableType: 'text', variableRequired: true },
      { id: 'b-1211', type: 'variable_line', order: 10, variableLabel: '発生場所', variableKey: 'incident_location', variableType: 'text', variableRequired: true },
      { id: 'b-1212', type: 'variable_line', order: 11, variableLabel: '事案概要', variableKey: 'incident_summary', variableType: 'text', variableRequired: true },
      { id: 'b-1213', type: 'heading', order: 12, content: '2. 原因', level: 3, align: 'left' },
      { id: 'b-1214', type: 'paragraph', order: 13, content: '（原因を記載してください）', align: 'left', fontSize: 11 },
      { id: 'b-1215', type: 'heading', order: 14, content: '3. 再発防止策', level: 3, align: 'left' },
      { id: 'b-1216', type: 'paragraph', order: 15, content: '（再発防止策を記載してください）', align: 'left', fontSize: 11 },
      { id: 'b-1217', type: 'spacer', order: 16, spacerHeight: 8 },
      { id: 'b-1218', type: 'paragraph', order: 17, content: '上記の通り報告いたしますとともに、今後このようなことのないよう十分注意いたします。深くお詫び申し上げます。', align: 'left', fontSize: 12 },
      { id: 'b-1219', type: 'spacer', order: 18, spacerHeight: 15 },
      { id: 'b-1220', type: 'paragraph', order: 19, content: '報告者署名:', align: 'right', fontSize: 11 },
    ],
    created_at: '2026-03-06T00:00:00Z',
  },
  // ====== tpl-013: 議事録 ======
  {
    id: 'tpl-013',
    name: '議事録',
    document_type: 'meeting_minutes',
    description: '会議・打合せの議事録。日時、出席者、議題、決定事項、アクションアイテムを記録。',
    is_published: true,
    version: 1,
    variables: [
      { key: 'meeting_title', label: '会議名', type: 'text', required: true },
      { key: 'meeting_date', label: '開催日時', type: 'text', required: true },
      { key: 'meeting_location', label: '開催場所', type: 'text', required: true },
      { key: 'attendees', label: '出席者', type: 'text', required: true },
      { key: 'recorder', label: '記録者', type: 'text', required: true },
      { key: 'next_meeting', label: '次回会議予定', type: 'text', required: false },
    ],
    body_template: '',
    blocks: [
      { id: 'b-1301', type: 'heading', order: 0, content: '議 事 録', level: 1, align: 'center', letterSpacing: 16 },
      { id: 'b-1302', type: 'spacer', order: 1, spacerHeight: 8 },
      { id: 'b-1303', type: 'variable_line', order: 2, variableLabel: '会議名', variableKey: 'meeting_title', variableType: 'text', variableRequired: true },
      { id: 'b-1304', type: 'variable_line', order: 3, variableLabel: '開催日時', variableKey: 'meeting_date', variableType: 'text', variableRequired: true },
      { id: 'b-1305', type: 'variable_line', order: 4, variableLabel: '開催場所', variableKey: 'meeting_location', variableType: 'text', variableRequired: true },
      { id: 'b-1306', type: 'variable_line', order: 5, variableLabel: '出席者', variableKey: 'attendees', variableType: 'text', variableRequired: true },
      { id: 'b-1307', type: 'variable_line', order: 6, variableLabel: '記録者', variableKey: 'recorder', variableType: 'text', variableRequired: true },
      { id: 'b-1308', type: 'divider', order: 7, dividerStyle: 'solid', dividerThickness: 1 },
      { id: 'b-1309', type: 'heading', order: 8, content: '議題・討議内容', level: 2, align: 'left' },
      { id: 'b-1310', type: 'paragraph', order: 9, content: '（議題と討議内容を記載してください）', align: 'left', fontSize: 11 },
      { id: 'b-1311', type: 'heading', order: 10, content: '決定事項', level: 2, align: 'left' },
      { id: 'b-1312', type: 'paragraph', order: 11, content: '（決定事項を記載してください）', align: 'left', fontSize: 11 },
      { id: 'b-1313', type: 'heading', order: 12, content: 'アクションアイテム', level: 2, align: 'left' },
      { id: 'b-1314', type: 'table', order: 13, tableRows: 3, tableCols: 4, tableHeaders: ['No.', '内容', '担当者', '期限'], tableCells: [['1', '', '', ''], ['2', '', '', ''], ['3', '', '', '']] },
      { id: 'b-1315', type: 'spacer', order: 14, spacerHeight: 5 },
      { id: 'b-1316', type: 'variable_line', order: 15, variableLabel: '次回会議予定', variableKey: 'next_meeting', variableType: 'text', variableRequired: false },
      { id: 'b-1317', type: 'spacer', order: 16, spacerHeight: 10 },
      { id: 'b-1318', type: 'paragraph', order: 17, content: '以上', align: 'right', fontSize: 12 },
    ],
    created_at: '2026-03-07T00:00:00Z',
  },
  // ====== tpl-014: 納品書 ======
  {
    id: 'tpl-014',
    name: '納品書',
    document_type: 'delivery_note',
    description: '商品・成果物の納品時に発行する納品書。納品明細、数量、納品日を記載。',
    is_published: true,
    version: 1,
    variables: [
      { key: 'client_name', label: '納品先名', type: 'text', required: true },
      { key: 'delivery_number', label: '納品書番号', type: 'text', required: true },
      { key: 'delivery_date', label: '納品日', type: 'date', required: true },
      { key: 'subject', label: '件名', type: 'text', required: true },
      { key: 'amount', label: '金額', type: 'text', required: true },
    ],
    body_template: '',
    blocks: [
      { id: 'b-1401', type: 'date_line', order: 0, content: '{{delivery_date}}', align: 'right' },
      { id: 'b-1402', type: 'heading', order: 1, content: '納 品 書', level: 1, align: 'center', letterSpacing: 16 },
      { id: 'b-1403', type: 'spacer', order: 2, spacerHeight: 5 },
      { id: 'b-1404', type: 'variable_line', order: 3, variableLabel: '納品書番号', variableKey: 'delivery_number', variableType: 'text', variableRequired: true },
      { id: 'b-1405', type: 'spacer', order: 4, spacerHeight: 5 },
      { id: 'b-1406', type: 'address_block', order: 5, addressCompany: '{{client_name}}', addressSuffix: '御中' },
      { id: 'b-1407', type: 'spacer', order: 6, spacerHeight: 8 },
      { id: 'b-1408', type: 'paragraph', order: 7, content: '下記の通り納品いたします。ご査収のほどよろしくお願い申し上げます。', align: 'left', fontSize: 12 },
      { id: 'b-1409', type: 'divider', order: 8, dividerStyle: 'solid', dividerThickness: 1 },
      { id: 'b-1410', type: 'table', order: 9, tableRows: 3, tableCols: 4, tableHeaders: ['品名', '数量', '単価', '金額'], tableCells: [['{{subject}}', '1', '¥{{amount}}', '¥{{amount}}'], ['', '', '', ''], ['合計', '', '', '¥{{amount}}']] },
      { id: 'b-1411', type: 'spacer', order: 10, spacerHeight: 5 },
      { id: 'b-1412', type: 'notice', order: 11, content: '※内容をご確認のうえ、受領書をご返送ください。', noticeStyle: 'info' },
      { id: 'b-1413', type: 'spacer', order: 12, spacerHeight: 10 },
      { id: 'b-1414', type: 'signature', order: 13, companyName: 'デモ株式会社', representativeTitle: '代表取締役', representativeName: '○○ ○○' },
      { id: 'b-1415', type: 'seal', order: 14, sealId: 'seal-002', sealPosition: 'right' },
    ],
    created_at: '2026-03-08T00:00:00Z',
  },
  // ====== tpl-015: 領収書 ======
  {
    id: 'tpl-015',
    name: '領収書',
    document_type: 'receipt',
    description: '金銭の受領を証明する領収書。インボイス制度対応。登録番号、金額、但し書きを記載。',
    is_published: true,
    version: 1,
    variables: [
      { key: 'recipient_name', label: '宛名', type: 'text', required: true },
      { key: 'receipt_number', label: '領収書番号', type: 'text', required: true },
      { key: 'receipt_date', label: '発行日', type: 'date', required: true },
      { key: 'amount', label: '金額（税込）', type: 'text', required: true },
      { key: 'proviso', label: '但し書き', type: 'text', required: true },
      { key: 'payment_method', label: '支払方法', type: 'select', required: true, options: [{ value: '銀行振込', label: '銀行振込' }, { value: '現金', label: '現金' }, { value: '小切手', label: '小切手' }] },
    ],
    body_template: '',
    blocks: [
      { id: 'b-1501', type: 'date_line', order: 0, content: '{{receipt_date}}', align: 'right' },
      { id: 'b-1502', type: 'heading', order: 1, content: '領 収 書', level: 1, align: 'center', letterSpacing: 16 },
      { id: 'b-1503', type: 'spacer', order: 2, spacerHeight: 5 },
      { id: 'b-1504', type: 'variable_line', order: 3, variableLabel: '領収書番号', variableKey: 'receipt_number', variableType: 'text', variableRequired: true },
      { id: 'b-1505', type: 'spacer', order: 4, spacerHeight: 5 },
      { id: 'b-1506', type: 'address_block', order: 5, addressCompany: '{{recipient_name}}', addressSuffix: '様' },
      { id: 'b-1507', type: 'spacer', order: 6, spacerHeight: 8 },
      { id: 'b-1508', type: 'divider', order: 7, dividerStyle: 'solid', dividerThickness: 2 },
      { id: 'b-1509', type: 'paragraph', order: 8, content: '金額: ¥{{amount}}-', align: 'center', fontSize: 16, bold: true },
      { id: 'b-1510', type: 'divider', order: 9, dividerStyle: 'solid', dividerThickness: 2 },
      { id: 'b-1511', type: 'spacer', order: 10, spacerHeight: 5 },
      { id: 'b-1512', type: 'variable_line', order: 11, variableLabel: '但し書き', variableKey: 'proviso', variableType: 'text', variableRequired: true },
      { id: 'b-1513', type: 'variable_line', order: 12, variableLabel: '支払方法', variableKey: 'payment_method', variableType: 'select', variableRequired: true, variableOptions: [{ value: '銀行振込', label: '銀行振込' }, { value: '現金', label: '現金' }, { value: '小切手', label: '小切手' }] },
      { id: 'b-1514', type: 'spacer', order: 13, spacerHeight: 5 },
      { id: 'b-1515', type: 'paragraph', order: 14, content: '上記正に領収いたしました。', align: 'left', fontSize: 12 },
      { id: 'b-1516', type: 'spacer', order: 15, spacerHeight: 5 },
      { id: 'b-1517', type: 'paragraph', order: 16, content: '登録番号: T1234567890123', align: 'left', fontSize: 10 },
      { id: 'b-1518', type: 'spacer', order: 17, spacerHeight: 10 },
      { id: 'b-1519', type: 'signature', order: 18, companyName: 'デモ株式会社', representativeTitle: '代表取締役', representativeName: '○○ ○○' },
      { id: 'b-1520', type: 'seal', order: 19, sealId: 'seal-001', sealPosition: 'right' },
    ],
    created_at: '2026-03-09T00:00:00Z',
  },
]

export function getTemplates(): LocalTemplate[] {
  const stored = getStorage<LocalTemplate[]>('templates', [])
  if (stored.length === 0) {
    setStorage('templates', INITIAL_TEMPLATES)
    return INITIAL_TEMPLATES
  }
  return stored
}

export function getTemplate(id: string): LocalTemplate | null {
  return getTemplates().find((t) => t.id === id) ?? null
}

/** テンプレートを保存（新規 or 更新） */
export function saveTemplate(template: LocalTemplate): void {
  const templates = getTemplates()
  const idx = templates.findIndex((t) => t.id === template.id)
  if (idx >= 0) {
    templates[idx] = template
  } else {
    templates.unshift(template)
  }
  setStorage('templates', templates)
}

/** テンプレートを削除 */
export function deleteTemplate(id: string): void {
  const templates = getTemplates().filter((t) => t.id !== id)
  setStorage('templates', templates)
}

// ============================================================
// 印影ストア
// ============================================================

/** ローカル保存用の印影データ */
export interface LocalSeal {
  id: string
  name: string             // 印影名（例: "代表者印"）
  type: 'round' | 'square' | 'personal'  // 丸印・角印・認印
  text_line1: string       // 上段テキスト
  text_line2: string       // 下段テキスト（丸印のみ）
  text_line3?: string      // 中段テキスト（角印の場合3行まで）
  size: number             // サイズ(mm) 18-60
  color: string            // 色 hex
  border_width: number     // 枠線太さ(px) 1-4
  font_family: string      // フォント
  created_at: string
}

/** 初期デモ印影データ */
const INITIAL_SEALS: LocalSeal[] = [
  {
    id: 'seal-001',
    name: '代表者印',
    type: 'round',
    text_line1: 'B-Doc',
    text_line2: '代表者印',
    size: 42,
    color: '#cc0000',
    border_width: 2,
    font_family: 'serif',
    created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'seal-002',
    name: '角印（社印）',
    type: 'square',
    text_line1: 'B-Doc',
    text_line2: 'デモ株式会社',
    text_line3: '',
    size: 24,
    color: '#cc0000',
    border_width: 2,
    font_family: 'serif',
    created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'seal-003',
    name: '認印（田中）',
    type: 'personal',
    text_line1: '田中',
    text_line2: '',
    size: 12,
    color: '#cc0000',
    border_width: 2,
    font_family: 'serif',
    created_at: '2026-01-10T00:00:00Z',
  },
]

/** 全印影を取得 */
export function getSeals(): LocalSeal[] {
  const stored = getStorage<LocalSeal[]>('seals', [])
  if (stored.length === 0) {
    setStorage('seals', INITIAL_SEALS)
    return INITIAL_SEALS
  }
  return stored
}

/** IDで印影を取得 */
export function getSeal(id: string): LocalSeal | null {
  return getSeals().find((s) => s.id === id) ?? null
}

/** 印影を保存（新規 or 更新） */
export function saveSeal(seal: LocalSeal): void {
  const seals = getSeals()
  const idx = seals.findIndex((s) => s.id === seal.id)
  if (idx >= 0) {
    seals[idx] = seal
  } else {
    seals.unshift(seal)
  }
  setStorage('seals', seals)
}

/** 印影を削除 */
export function deleteSeal(id: string): void {
  const seals = getSeals().filter((s) => s.id !== id)
  setStorage('seals', seals)
}

/** 印影を新規作成 */
export function createSeal(partial: Partial<LocalSeal>): LocalSeal {
  const seal: LocalSeal = {
    id: `seal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: partial.name ?? '新規印影',
    type: partial.type ?? 'round',
    text_line1: partial.text_line1 ?? '',
    text_line2: partial.text_line2 ?? '',
    text_line3: partial.text_line3,
    size: partial.size ?? 42,
    color: partial.color ?? '#cc0000',
    border_width: partial.border_width ?? 2,
    font_family: partial.font_family ?? 'serif',
    created_at: new Date().toISOString(),
    ...partial,
  }
  saveSeal(seal)
  return seal
}

// ============================================================
// 組織ストア
// ============================================================
export interface LocalOrganization {
  id: string
  name: string
  address: string
  phone: string
  representative: string
  created_at: string
}

const INITIAL_ORGANIZATIONS: LocalOrganization[] = [
  { id: 'org-001', name: '株式会社Backlly', address: '東京都渋谷区...', phone: '03-1234-5678', representative: '代表太郎', created_at: '2026-01-01T00:00:00Z' },
]

export function getOrganizations(): LocalOrganization[] {
  const stored = getStorage<LocalOrganization[]>('organizations', [])
  if (stored.length === 0) {
    setStorage('organizations', INITIAL_ORGANIZATIONS)
    return INITIAL_ORGANIZATIONS
  }
  return stored
}

export function saveOrganization(org: LocalOrganization): void {
  const orgs = getOrganizations()
  const idx = orgs.findIndex((o) => o.id === org.id)
  if (idx >= 0) { orgs[idx] = org } else { orgs.push(org) }
  setStorage('organizations', orgs)
}

export function deleteOrganization(id: string): void {
  setStorage('organizations', getOrganizations().filter((o) => o.id !== id))
}

// ============================================================
// 従業員ストア
// ============================================================
export interface LocalEmployee {
  id: string
  name: string
  email: string
  department: string
  position: string
  role: string
  joined_at: string
}

const INITIAL_EMPLOYEES: LocalEmployee[] = [
  { id: 'emp-001', name: '田中太郎', email: 'tanaka@example.com', department: '営業部', position: '部長', role: 'approver', joined_at: '2020-04-01' },
  { id: 'emp-002', name: '佐藤花子', email: 'sato@example.com', department: '総務部', position: '課長', role: 'creator', joined_at: '2021-04-01' },
  { id: 'emp-003', name: '山田一郎', email: 'yamada@example.com', department: '開発部', position: '主任', role: 'viewer', joined_at: '2022-04-01' },
]

export function getEmployees(): LocalEmployee[] {
  const stored = getStorage<LocalEmployee[]>('employees', [])
  if (stored.length === 0) {
    setStorage('employees', INITIAL_EMPLOYEES)
    return INITIAL_EMPLOYEES
  }
  return stored
}

export function saveEmployee(emp: LocalEmployee): void {
  const emps = getEmployees()
  const idx = emps.findIndex((e) => e.id === emp.id)
  if (idx >= 0) { emps[idx] = emp } else { emps.push(emp) }
  setStorage('employees', emps)
}

export function deleteEmployee(id: string): void {
  setStorage('employees', getEmployees().filter((e) => e.id !== id))
}

// ============================================================
// 取引先ストア
// ============================================================
export interface LocalClient {
  id: string
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
  created_at: string
}

const INITIAL_CLIENTS: LocalClient[] = [
  { id: 'cli-001', name: '株式会社ABC', contact_person: '鈴木一郎', email: 'suzuki@abc.co.jp', phone: '03-9999-8888', address: '東京都千代田区...', created_at: '2026-01-15T00:00:00Z' },
]

export function getClients(): LocalClient[] {
  const stored = getStorage<LocalClient[]>('clients', [])
  if (stored.length === 0) {
    setStorage('clients', INITIAL_CLIENTS)
    return INITIAL_CLIENTS
  }
  return stored
}

export function saveClient(client: LocalClient): void {
  const clients = getClients()
  const idx = clients.findIndex((c) => c.id === client.id)
  if (idx >= 0) { clients[idx] = client } else { clients.push(client) }
  setStorage('clients', clients)
}

export function deleteClient(id: string): void {
  setStorage('clients', getClients().filter((c) => c.id !== id))
}

// ============================================================
// 設定ストア
// ============================================================
export interface LocalSettings {
  // 既存
  companyName: string
  systemName: string
  defaultDocumentPrefix: string
  autoSaveInterval: number
  pdfWatermarkDraft: string
  pdfWatermarkConfidential: string
  // 会社情報
  companyNameKana: string          // 会社名フリガナ
  companyNameEn: string            // 英語名
  companyPostalCode: string        // 郵便番号
  companyAddress: string           // 住所
  companyAddressBuilding: string   // 建物名・階
  companyPhone: string             // 電話番号
  companyFax: string               // FAX番号
  companyEmail: string             // メールアドレス
  companyWebsite: string           // Webサイト
  companyRepresentativeName: string // 代表者名
  companyRepresentativeTitle: string // 代表者役職（代表取締役 etc）
  companyRegistrationNumber: string // 法人番号（インボイス番号）
  companyEstablishedDate: string   // 設立日
  companyCapital: string           // 資本金
  companyBankName: string          // 振込先銀行
  companyBankBranch: string        // 支店名
  companyBankAccountType: string   // 口座種別（普通・当座）
  companyBankAccountNumber: string // 口座番号
  companyBankAccountName: string   // 口座名義
}

export function getSettings(): LocalSettings {
  return getStorage<LocalSettings>('settings', {
    companyName: '株式会社Backlly',
    systemName: 'B-Doc',
    defaultDocumentPrefix: 'DOC',
    autoSaveInterval: 3,
    pdfWatermarkDraft: '下書き',
    pdfWatermarkConfidential: '社外秘',
    companyNameKana: '',
    companyNameEn: '',
    companyPostalCode: '',
    companyAddress: '',
    companyAddressBuilding: '',
    companyPhone: '',
    companyFax: '',
    companyEmail: '',
    companyWebsite: '',
    companyRepresentativeName: '',
    companyRepresentativeTitle: '',
    companyRegistrationNumber: '',
    companyEstablishedDate: '',
    companyCapital: '',
    companyBankName: '',
    companyBankBranch: '',
    companyBankAccountType: '普通',
    companyBankAccountNumber: '',
    companyBankAccountName: '',
  })
}

export function saveSettings(settings: LocalSettings): void {
  setStorage('settings', settings)
}

// ============================================================
// 権限ストア
// ============================================================
export interface LocalPermission {
  userId: string
  userName: string
  roles: string[]
}

export function getPermissions(): LocalPermission[] {
  return getStorage<LocalPermission[]>('permissions', [
    { userId: 'emp-001', userName: '田中太郎', roles: ['approver', 'issuer'] },
    { userId: 'emp-002', userName: '佐藤花子', roles: ['creator'] },
    { userId: 'emp-003', userName: '山田一郎', roles: ['viewer'] },
  ])
}

export function savePermissions(perms: LocalPermission[]): void {
  setStorage('permissions', perms)
}

// ============================================================
// ワークフロー定義ストア
// ============================================================
export interface LocalWorkflow {
  id: string
  name: string
  document_type: string
  steps: { order: number; name: string; type: string; role: string; deadline_hours: number }[]
  is_active: boolean
}

export function getWorkflows(): LocalWorkflow[] {
  return getStorage<LocalWorkflow[]>('workflows', [
    { id: 'wf-001', name: '標準承認フロー', document_type: 'employment_cert', steps: [
      { order: 1, name: '確認', type: 'confirm', role: 'confirmer', deadline_hours: 24 },
      { order: 2, name: '承認', type: 'approve', role: 'approver', deadline_hours: 48 },
    ], is_active: true },
    { id: 'wf-002', name: '請求書フロー', document_type: 'invoice', steps: [
      { order: 1, name: '承認', type: 'approve', role: 'approver', deadline_hours: 72 },
    ], is_active: true },
  ])
}

export function saveWorkflow(wf: LocalWorkflow): void {
  const wfs = getWorkflows()
  const idx = wfs.findIndex((w) => w.id === wf.id)
  if (idx >= 0) { wfs[idx] = wf } else { wfs.push(wf) }
  setStorage('workflows', wfs)
}

export function deleteWorkflow(id: string): void {
  setStorage('workflows', getWorkflows().filter((w) => w.id !== id))
}

// ============================================================
// ユーザーセッション管理
// ============================================================

/** ユーザーロール種別 */
export type UserRoleType = 'staff' | 'manager' | 'admin'

/** 現在のユーザー情報 */
export interface CurrentUser {
  id: string
  name: string
  department: string
  position: string
  role: UserRoleType
}

/** ロール種別の日本語ラベルマップ */
export const USER_ROLE_TYPE_LABELS: Record<UserRoleType, string> = {
  staff: '一般社員',
  manager: '管理職',
  admin: '管理者',
}

/** 現在のユーザーを取得 */
export function getCurrentUser(): CurrentUser {
  return getStorage<CurrentUser>('current_user', {
    id: 'user-001',
    name: 'デモユーザー',
    department: '総務部',
    position: '一般社員',
    role: 'staff',
  })
}

/** 現在のユーザーを設定 */
export function setCurrentUser(user: CurrentUser): void {
  setStorage('current_user', user)
}

/** テンプレート承認権限チェック */
export function canApproveTemplates(role: UserRoleType): boolean {
  return role === 'manager' || role === 'admin'
}

/** 設定管理権限チェック */
export function canManageSettings(role: UserRoleType): boolean {
  return role === 'admin'
}
