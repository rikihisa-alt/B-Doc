'use client'

/**
 * 新規テンプレート作成ページ
 * テンプレートの基本情報を入力し、作成後にエディタページへリダイレクトする
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  saveTemplate,
} from '@/lib/store'
import type {
  LocalTemplate,
  TemplateBlock,
} from '@/lib/store'
import {
  ChevronLeft,
  Plus,
  FileText,
  Zap,
} from 'lucide-react'

// ============================================================
// テンプレートプリセット
// ============================================================

interface TemplatePreset {
  name: string
  document_type: string
  description: string
  icon: React.ReactNode
  blocks: TemplateBlock[]
}

/** 空テンプレート */
const EMPTY_PRESET: TemplatePreset = {
  name: '',
  document_type: 'other',
  description: '',
  icon: <FileText className="h-6 w-6" />,
  blocks: [],
}

/** 証明書プリセット */
const CERTIFICATE_PRESET: TemplatePreset = {
  name: '在職証明書',
  document_type: 'employment_cert',
  description: '従業員の在職を証明する文書',
  icon: <FileText className="h-6 w-6 text-blue-500" />,
  blocks: [
    { id: 'new-b-1', type: 'date_line', order: 0, content: '{{issue_date}}', align: 'right' },
    { id: 'new-b-2', type: 'heading', order: 1, content: '在 職 証 明 書', level: 1, align: 'center', letterSpacing: 16 },
    { id: 'new-b-3', type: 'spacer', order: 2, spacerHeight: 10 },
    { id: 'new-b-4', type: 'paragraph', order: 3, content: '下記の者は、当社に在籍していることを証明いたします。', align: 'left', fontSize: 12 },
    { id: 'new-b-5', type: 'spacer', order: 4, spacerHeight: 8 },
    { id: 'new-b-6', type: 'variable_line', order: 5, variableLabel: '氏名', variableKey: 'employee_name', variableType: 'text', variableRequired: true },
    { id: 'new-b-7', type: 'variable_line', order: 6, variableLabel: '所属部署', variableKey: 'department', variableType: 'text', variableRequired: true },
    { id: 'new-b-8', type: 'variable_line', order: 7, variableLabel: '雇用形態', variableKey: 'employment_type', variableType: 'text', variableRequired: true },
    { id: 'new-b-9', type: 'spacer', order: 8, spacerHeight: 10 },
    { id: 'new-b-10', type: 'paragraph', order: 9, content: '以上', align: 'right', fontSize: 12 },
    { id: 'new-b-11', type: 'spacer', order: 10, spacerHeight: 15 },
    { id: 'new-b-12', type: 'signature', order: 11, companyName: '', representativeTitle: '代表取締役', representativeName: '' },
  ],
}

/** 請求書プリセット */
const INVOICE_PRESET: TemplatePreset = {
  name: '請求書',
  document_type: 'invoice',
  description: '取引先への請求書',
  icon: <FileText className="h-6 w-6 text-green-500" />,
  blocks: [
    { id: 'new-i-1', type: 'date_line', order: 0, content: '{{issue_date}}', align: 'right' },
    { id: 'new-i-2', type: 'heading', order: 1, content: '請 求 書', level: 1, align: 'center', letterSpacing: 16 },
    { id: 'new-i-3', type: 'spacer', order: 2, spacerHeight: 8 },
    { id: 'new-i-4', type: 'address_block', order: 3, addressCompany: '{{client_name}}', addressSuffix: '御中' },
    { id: 'new-i-5', type: 'spacer', order: 4, spacerHeight: 8 },
    { id: 'new-i-6', type: 'paragraph', order: 5, content: '下記の通りご請求申し上げます。', align: 'left', fontSize: 12 },
    { id: 'new-i-7', type: 'divider', order: 6, dividerStyle: 'solid', dividerThickness: 1 },
    { id: 'new-i-8', type: 'table', order: 7, tableRows: 2, tableCols: 3, tableHeaders: ['摘要', '数量', '金額'], tableCells: [['', '1', ''], ['小計', '', '']] },
    { id: 'new-i-9', type: 'spacer', order: 8, spacerHeight: 5 },
    { id: 'new-i-10', type: 'variable_line', order: 9, variableLabel: '支払期限', variableKey: 'due_date', variableType: 'date', variableRequired: true },
    { id: 'new-i-11', type: 'signature', order: 10, companyName: '', representativeTitle: '代表取締役', representativeName: '' },
  ],
}

/** 見積書プリセット */
const QUOTATION_PRESET: TemplatePreset = {
  name: '見積書',
  document_type: 'quotation',
  description: '取引先への見積書',
  icon: <FileText className="h-6 w-6 text-amber-500" />,
  blocks: [
    { id: 'new-q-1', type: 'date_line', order: 0, content: '{{issue_date}}', align: 'right' },
    { id: 'new-q-2', type: 'heading', order: 1, content: '見 積 書', level: 1, align: 'center', letterSpacing: 16 },
    { id: 'new-q-3', type: 'spacer', order: 2, spacerHeight: 8 },
    { id: 'new-q-4', type: 'address_block', order: 3, addressCompany: '{{client_name}}', addressSuffix: '御中' },
    { id: 'new-q-5', type: 'paragraph', order: 4, content: '下記の通りお見積り申し上げます。', align: 'left', fontSize: 12 },
    { id: 'new-q-6', type: 'table', order: 5, tableRows: 2, tableCols: 3, tableHeaders: ['項目', '数量', '金額'], tableCells: [['', '1', ''], ['合計', '', '']] },
    { id: 'new-q-7', type: 'variable_line', order: 6, variableLabel: '有効期限', variableKey: 'validity', variableType: 'text', variableRequired: true },
    { id: 'new-q-8', type: 'signature', order: 7, companyName: '', representativeTitle: '代表取締役', representativeName: '' },
  ],
}

const PRESETS: TemplatePreset[] = [CERTIFICATE_PRESET, INVOICE_PRESET, QUOTATION_PRESET]

// ============================================================
// メインページ
// ============================================================

export default function NewTemplatePage() {
  const router = useRouter()

  // フォーム状態
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [documentType, setDocumentType] = useState('employment_cert')
  const [creating, setCreating] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<TemplatePreset | null>(null)

  /** テンプレートを作成してエディタへ遷移 */
  const handleCreate = useCallback(async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const id = `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const preset = selectedPreset ?? EMPTY_PRESET
      // ブロックIDを一意にリネーム
      const blocks: TemplateBlock[] = preset.blocks.map((b, i) => ({
        ...b,
        id: `blk-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 4)}`,
      }))

      // 変数を自動抽出
      const variables: LocalTemplate['variables'] = []
      const seen = new Set<string>()
      for (const b of blocks) {
        if (b.type === 'variable_line' && b.variableKey && !seen.has(b.variableKey)) {
          seen.add(b.variableKey)
          variables.push({
            key: b.variableKey,
            label: b.variableLabel ?? b.variableKey,
            type: b.variableType ?? 'text',
            required: b.variableRequired ?? false,
            options: b.variableOptions,
          })
        }
      }

      const template: LocalTemplate = {
        id,
        name: name.trim(),
        document_type: documentType,
        description: description.trim(),
        is_published: false,
        version: 1,
        variables,
        body_template: '',
        blocks,
        created_at: new Date().toISOString(),
      }
      saveTemplate(template)
      router.push(`/templates/${id}/edit`)
    } finally {
      setCreating(false)
    }
  }, [name, description, documentType, selectedPreset, router])

  /** プリセット選択 */
  const selectPreset = (preset: TemplatePreset) => {
    setSelectedPreset(preset)
    if (!name) setName(preset.name)
    if (!description) setDescription(preset.description)
    setDocumentType(preset.document_type)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link href="/templates" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ChevronLeft className="h-4 w-4" />
          テンプレート一覧
        </Link>
        <div className="h-5 w-px bg-slate-300" />
        <h1 className="text-xl font-bold text-slate-900">新規テンプレート作成</h1>
      </div>

      {/* プリセット選択 */}
      <div>
        <Label className="mb-2 block text-sm font-medium text-slate-700">テンプレートから始める（任意）</Label>
        <div className="grid grid-cols-3 gap-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.document_type}
              onClick={() => selectPreset(preset)}
              className={`rounded-lg border p-4 text-left transition-all ${
                selectedPreset?.document_type === preset.document_type
                  ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="mb-2">{preset.icon}</div>
              <div className="text-sm font-medium text-slate-900">{preset.name}</div>
              <div className="mt-0.5 text-xs text-slate-500">{preset.description}</div>
              <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                <Zap className="h-3 w-3" />
                {preset.blocks.length}ブロック
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 基本情報入力 */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <Label className="text-sm font-medium text-slate-700">テンプレート名 <span className="text-red-500">*</span></Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 在職証明書、請求書"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">文書種別</Label>
            <select
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            >
              <option value="employment_cert">在職証明書</option>
              <option value="invoice">請求書</option>
              <option value="quotation">見積書</option>
              <option value="resignation">退職証明書</option>
              <option value="contract">契約書</option>
              <option value="report">報告書</option>
              <option value="notification">通知書</option>
              <option value="certificate">証明書</option>
              <option value="other">その他</option>
            </select>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">説明</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="テンプレートの用途や注意点を記載"
              rows={2}
              className="mt-1 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* アクション */}
      <div className="flex items-center justify-between">
        <Button asChild variant="outline">
          <Link href="/templates">
            <ChevronLeft className="mr-1 h-4 w-4" />
            キャンセル
          </Link>
        </Button>
        <Button onClick={handleCreate} disabled={creating || !name.trim()}>
          <Plus className="mr-1.5 h-4 w-4" />
          {creating ? '作成中...' : 'テンプレートを作成してエディタを開く'}
        </Button>
      </div>
    </div>
  )
}
