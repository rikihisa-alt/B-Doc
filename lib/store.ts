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

/** テンプレートブロックの定義 */
export interface TemplateBlock {
  id: string
  type: TemplateBlockType
  order: number
  // 共通
  content?: string
  align?: 'left' | 'center' | 'right'
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
}

// ============================================================
// テンプレートストア
// ============================================================

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
}

const INITIAL_TEMPLATES: LocalTemplate[] = [
  {
    id: 'tpl-001',
    name: '在職証明書',
    document_type: 'employment_cert',
    description: '従業員の在職を証明する文書。金融機関提出、保育園申請等に使用。',
    is_published: true,
    version: 3,
    variables: [
      { key: 'employee_name', label: '氏名', type: 'text', required: true },
      { key: 'department', label: '所属部署', type: 'select', required: true, options: [{ value: '営業部', label: '営業部' }, { value: '開発部', label: '開発部' }, { value: '総務部', label: '総務部' }, { value: '人事部', label: '人事部' }] },
      { key: 'employment_type', label: '雇用形態', type: 'select', required: true, options: [{ value: '正社員', label: '正社員' }, { value: '契約社員', label: '契約社員' }, { value: 'パート', label: 'パート' }] },
      { key: 'issue_date', label: '発行日', type: 'date', required: true },
      { key: 'purpose', label: '使用目的', type: 'select', required: true, options: [{ value: '金融機関提出', label: '金融機関提出' }, { value: '保育園申請', label: '保育園申請' }, { value: '住宅ローン申請', label: '住宅ローン申請' }, { value: 'その他', label: 'その他' }] },
    ],
    body_template: '在職証明書\n\n下記の者は、当社に在籍していることを証明いたします。\n\n氏名: {{employee_name}}\n所属部署: {{department}}\n雇用形態: {{employment_type}}\n\n発行日: {{issue_date}}\n使用目的: {{purpose}}\n\n以上',
    blocks: [
      { id: 'b-001', type: 'date_line', order: 0, content: '{{issue_date}}', align: 'right' },
      { id: 'b-002', type: 'heading', order: 1, content: '在 職 証 明 書', level: 1, align: 'center', letterSpacing: 16 },
      { id: 'b-003', type: 'spacer', order: 2, spacerHeight: 10 },
      { id: 'b-004', type: 'paragraph', order: 3, content: '下記の者は、当社に在籍していることを証明いたします。', align: 'left', fontSize: 12 },
      { id: 'b-005', type: 'spacer', order: 4, spacerHeight: 8 },
      { id: 'b-006', type: 'variable_line', order: 5, variableLabel: '氏名', variableKey: 'employee_name', variableType: 'text', variableRequired: true },
      { id: 'b-007', type: 'variable_line', order: 6, variableLabel: '所属部署', variableKey: 'department', variableType: 'select', variableRequired: true, variableOptions: [{ value: '営業部', label: '営業部' }, { value: '開発部', label: '開発部' }, { value: '総務部', label: '総務部' }, { value: '人事部', label: '人事部' }] },
      { id: 'b-008', type: 'variable_line', order: 7, variableLabel: '雇用形態', variableKey: 'employment_type', variableType: 'select', variableRequired: true, variableOptions: [{ value: '正社員', label: '正社員' }, { value: '契約社員', label: '契約社員' }, { value: 'パート', label: 'パート' }] },
      { id: 'b-009', type: 'variable_line', order: 8, variableLabel: '使用目的', variableKey: 'purpose', variableType: 'select', variableRequired: true, variableOptions: [{ value: '金融機関提出', label: '金融機関提出' }, { value: '保育園申請', label: '保育園申請' }, { value: '住宅ローン申請', label: '住宅ローン申請' }, { value: 'その他', label: 'その他' }] },
      { id: 'b-010', type: 'spacer', order: 9, spacerHeight: 10 },
      { id: 'b-011', type: 'paragraph', order: 10, content: '以上', align: 'right', fontSize: 12 },
      { id: 'b-012', type: 'spacer', order: 11, spacerHeight: 15 },
      { id: 'b-013', type: 'signature', order: 12, companyName: 'デモ株式会社', representativeTitle: '代表取締役', representativeName: '○○ ○○' },
      { id: 'b-014', type: 'seal', order: 13, sealId: 'seal-001', sealPosition: 'right' },
    ],
    created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'tpl-002',
    name: '請求書',
    document_type: 'invoice',
    description: '取引先への請求書。消費税計算、振込先情報を含む。',
    is_published: true,
    version: 2,
    variables: [
      { key: 'client_name', label: '取引先名', type: 'text', required: true },
      { key: 'amount', label: '金額（税抜）', type: 'text', required: true },
      { key: 'issue_date', label: '発行日', type: 'date', required: true },
      { key: 'due_date', label: '支払期限', type: 'date', required: true },
      { key: 'description', label: '摘要', type: 'text', required: false },
    ],
    body_template: '請求書\n\n{{client_name}} 御中\n\n下記の通りご請求申し上げます。\n\n金額: ¥{{amount}}（税抜）\n摘要: {{description}}\n\n発行日: {{issue_date}}\n支払期限: {{due_date}}\n\n振込先: みずほ銀行 本店 普通 1234567',
    blocks: [
      { id: 'b-101', type: 'date_line', order: 0, content: '{{issue_date}}', align: 'right' },
      { id: 'b-102', type: 'heading', order: 1, content: '請 求 書', level: 1, align: 'center', letterSpacing: 16 },
      { id: 'b-103', type: 'spacer', order: 2, spacerHeight: 8 },
      { id: 'b-104', type: 'address_block', order: 3, addressCompany: '{{client_name}}', addressSuffix: '御中' },
      { id: 'b-105', type: 'spacer', order: 4, spacerHeight: 8 },
      { id: 'b-106', type: 'paragraph', order: 5, content: '下記の通りご請求申し上げます。', align: 'left', fontSize: 12 },
      { id: 'b-107', type: 'divider', order: 6, dividerStyle: 'solid', dividerThickness: 1 },
      { id: 'b-108', type: 'table', order: 7, tableRows: 3, tableCols: 3, tableHeaders: ['摘要', '数量', '金額'], tableCells: [['{{description}}', '1', '¥{{amount}}'], ['', '', ''], ['小計', '', '¥{{amount}}']] },
      { id: 'b-109', type: 'spacer', order: 8, spacerHeight: 5 },
      { id: 'b-110', type: 'variable_line', order: 9, variableLabel: '支払期限', variableKey: 'due_date', variableType: 'date', variableRequired: true },
      { id: 'b-111', type: 'spacer', order: 10, spacerHeight: 5 },
      { id: 'b-112', type: 'notice', order: 11, content: '振込先: みずほ銀行 本店 普通 1234567\n振込手数料はお客様のご負担となります。', noticeStyle: 'bordered' },
      { id: 'b-113', type: 'spacer', order: 12, spacerHeight: 10 },
      { id: 'b-114', type: 'signature', order: 13, companyName: 'デモ株式会社', representativeTitle: '代表取締役', representativeName: '○○ ○○' },
      { id: 'b-115', type: 'seal', order: 14, sealId: 'seal-002', sealPosition: 'right' },
    ],
    created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 'tpl-003',
    name: '見積書',
    document_type: 'quotation',
    description: '取引先への見積書。有効期限、支払条件を含む。',
    is_published: true,
    version: 1,
    variables: [
      { key: 'client_name', label: '取引先名', type: 'text', required: true },
      { key: 'amount', label: '見積金額（税抜）', type: 'text', required: true },
      { key: 'validity', label: '有効期限', type: 'text', required: true },
      { key: 'description', label: '件名', type: 'text', required: true },
    ],
    body_template: '見積書\n\n{{client_name}} 御中\n\n件名: {{description}}\n\n見積金額: ¥{{amount}}（税抜）\n有効期限: {{validity}}\n\n備考: 上記金額には消費税は含まれておりません。',
    blocks: [
      { id: 'b-201', type: 'date_line', order: 0, content: '{{issue_date}}', align: 'right' },
      { id: 'b-202', type: 'heading', order: 1, content: '見 積 書', level: 1, align: 'center', letterSpacing: 16 },
      { id: 'b-203', type: 'spacer', order: 2, spacerHeight: 8 },
      { id: 'b-204', type: 'address_block', order: 3, addressCompany: '{{client_name}}', addressSuffix: '御中' },
      { id: 'b-205', type: 'spacer', order: 4, spacerHeight: 5 },
      { id: 'b-206', type: 'variable_line', order: 5, variableLabel: '件名', variableKey: 'description', variableType: 'text', variableRequired: true },
      { id: 'b-207', type: 'divider', order: 6, dividerStyle: 'solid', dividerThickness: 1 },
      { id: 'b-208', type: 'table', order: 7, tableRows: 2, tableCols: 3, tableHeaders: ['項目', '数量', '金額'], tableCells: [['{{description}}', '1', '¥{{amount}}'], ['合計', '', '¥{{amount}}']] },
      { id: 'b-209', type: 'variable_line', order: 8, variableLabel: '有効期限', variableKey: 'validity', variableType: 'text', variableRequired: true },
      { id: 'b-210', type: 'notice', order: 9, content: '上記金額には消費税は含まれておりません。', noticeStyle: 'info' },
      { id: 'b-211', type: 'signature', order: 10, companyName: 'デモ株式会社', representativeTitle: '代表取締役', representativeName: '○○ ○○' },
      { id: 'b-212', type: 'seal', order: 11, sealId: 'seal-002', sealPosition: 'right' },
    ],
    created_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 'tpl-004',
    name: '退職証明書',
    document_type: 'resignation',
    description: '退職した従業員に発行する退職証明書。',
    is_published: true,
    version: 1,
    variables: [
      { key: 'employee_name', label: '氏名', type: 'text', required: true },
      { key: 'department', label: '所属部署', type: 'text', required: true },
      { key: 'hire_date', label: '入社日', type: 'date', required: true },
      { key: 'resign_date', label: '退職日', type: 'date', required: true },
      { key: 'reason', label: '退職事由', type: 'select', required: true, options: [{ value: '自己都合', label: '自己都合' }, { value: '会社都合', label: '会社都合' }, { value: '契約期間満了', label: '契約期間満了' }] },
    ],
    body_template: '退職証明書\n\n下記の者が当社を退職したことを証明いたします。\n\n氏名: {{employee_name}}\n所属部署: {{department}}\n入社日: {{hire_date}}\n退職日: {{resign_date}}\n退職事由: {{reason}}\n\n以上',
    blocks: [
      { id: 'b-301', type: 'date_line', order: 0, content: '{{resign_date}}', align: 'right' },
      { id: 'b-302', type: 'heading', order: 1, content: '退 職 証 明 書', level: 1, align: 'center', letterSpacing: 16 },
      { id: 'b-303', type: 'spacer', order: 2, spacerHeight: 10 },
      { id: 'b-304', type: 'paragraph', order: 3, content: '下記の者が当社を退職したことを証明いたします。', align: 'left', fontSize: 12 },
      { id: 'b-305', type: 'spacer', order: 4, spacerHeight: 8 },
      { id: 'b-306', type: 'variable_line', order: 5, variableLabel: '氏名', variableKey: 'employee_name', variableType: 'text', variableRequired: true },
      { id: 'b-307', type: 'variable_line', order: 6, variableLabel: '所属部署', variableKey: 'department', variableType: 'text', variableRequired: true },
      { id: 'b-308', type: 'variable_line', order: 7, variableLabel: '入社日', variableKey: 'hire_date', variableType: 'date', variableRequired: true },
      { id: 'b-309', type: 'variable_line', order: 8, variableLabel: '退職日', variableKey: 'resign_date', variableType: 'date', variableRequired: true },
      { id: 'b-310', type: 'variable_line', order: 9, variableLabel: '退職事由', variableKey: 'reason', variableType: 'select', variableRequired: true, variableOptions: [{ value: '自己都合', label: '自己都合' }, { value: '会社都合', label: '会社都合' }, { value: '契約期間満了', label: '契約期間満了' }] },
      { id: 'b-311', type: 'paragraph', order: 10, content: '以上', align: 'right', fontSize: 12 },
      { id: 'b-312', type: 'spacer', order: 11, spacerHeight: 15 },
      { id: 'b-313', type: 'signature', order: 12, companyName: 'デモ株式会社', representativeTitle: '代表取締役', representativeName: '○○ ○○' },
      { id: 'b-314', type: 'seal', order: 13, sealId: 'seal-001', sealPosition: 'right' },
    ],
    created_at: '2026-02-15T00:00:00Z',
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
