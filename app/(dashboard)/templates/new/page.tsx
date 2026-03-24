'use client'

/**
 * 新規テンプレート作成ページ
 * テンプレートプリセットをカテゴリ別に表示し、選択後にカスタム名を付けて作成する
 */

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  getTemplates,
  saveTemplate,
  addAuditLog,
  getCurrentUser,
} from '@/lib/store'
import type {
  LocalTemplate,
  TemplateBlock,
} from '@/lib/store'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Shield,
  Receipt,
  ClipboardList,
  UserCheck,
  FilePlus,
  Tag,
  Layers,
  Variable,
} from 'lucide-react'

// ============================================================
// カテゴリ定義
// ============================================================

/** テンプレートカテゴリの型 */
interface TemplateCategory {
  id: string
  label: string
  documentTypes: string[]
  icon: React.ReactNode
}

/** カテゴリ定義一覧 */
const CATEGORIES: TemplateCategory[] = [
  {
    id: 'all',
    label: 'すべて',
    documentTypes: [],
    icon: <Layers className="h-4 w-4" />,
  },
  {
    id: 'certificates',
    label: '証明書',
    documentTypes: ['employment_cert', 'resignation'],
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: 'contracts',
    label: '契約書',
    documentTypes: ['employment_contract', 'nda', 'outsourcing_contract'],
    icon: <Shield className="h-4 w-4" />,
  },
  {
    id: 'billing',
    label: '請求・見積',
    documentTypes: ['invoice', 'quotation', 'delivery_note', 'receipt'],
    icon: <Receipt className="h-4 w-4" />,
  },
  {
    id: 'internal',
    label: '社内文書',
    documentTypes: ['ringi', 'internal_notice', 'meeting_minutes', 'incident_report'],
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    id: 'hr',
    label: '人事関連',
    documentTypes: ['offer_letter', 'personnel_order'],
    icon: <UserCheck className="h-4 w-4" />,
  },
  {
    id: 'blank',
    label: '白紙から作成',
    documentTypes: [],
    icon: <FilePlus className="h-4 w-4" />,
  },
]

/** カテゴリアイコン（カード表示用） */
const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  employment_cert: <FileText className="h-6 w-6 text-blue-500" />,
  resignation: <FileText className="h-6 w-6 text-blue-500" />,
  employment_contract: <Shield className="h-6 w-6 text-purple-500" />,
  nda: <Shield className="h-6 w-6 text-purple-500" />,
  outsourcing_contract: <Shield className="h-6 w-6 text-purple-500" />,
  invoice: <Receipt className="h-6 w-6 text-green-500" />,
  quotation: <Receipt className="h-6 w-6 text-amber-500" />,
  delivery_note: <Receipt className="h-6 w-6 text-teal-500" />,
  receipt: <Receipt className="h-6 w-6 text-emerald-500" />,
  ringi: <ClipboardList className="h-6 w-6 text-orange-500" />,
  internal_notice: <ClipboardList className="h-6 w-6 text-orange-500" />,
  meeting_minutes: <ClipboardList className="h-6 w-6 text-sky-500" />,
  incident_report: <ClipboardList className="h-6 w-6 text-red-500" />,
  offer_letter: <UserCheck className="h-6 w-6 text-indigo-500" />,
  personnel_order: <UserCheck className="h-6 w-6 text-indigo-500" />,
}

/** カテゴリラベル（カード表示用） */
const CATEGORY_LABEL_MAP: Record<string, string> = {
  employment_cert: '証明書',
  resignation: '証明書',
  employment_contract: '契約書',
  nda: '契約書',
  outsourcing_contract: '契約書',
  invoice: '請求・見積',
  quotation: '請求・見積',
  delivery_note: '請求・見積',
  receipt: '請求・見積',
  ringi: '社内文書',
  internal_notice: '社内文書',
  meeting_minutes: '社内文書',
  incident_report: '社内文書',
  offer_letter: '人事関連',
  personnel_order: '人事関連',
}

/** ブロックタイプの日本語ラベル */
const BLOCK_TYPE_LABELS: Record<string, string> = {
  heading: '見出し',
  paragraph: '本文',
  variable_line: '変数',
  table: '表',
  seal: '印影',
  signature: '署名',
  divider: '区切り線',
  spacer: '余白',
  page_break: '改ページ',
  notice: '注意書き',
  image: '画像',
  date_line: '日付',
  address_block: '宛名',
}

// ============================================================
// メインページ
// ============================================================

export default function NewTemplatePage() {
  const router = useRouter()

  // カテゴリフィルタの状態
  const [activeCategory, setActiveCategory] = useState('all')
  // 選択中のテンプレート（null = 未選択）
  const [selectedTemplate, setSelectedTemplate] = useState<LocalTemplate | null>(null)
  // 白紙モード
  const [isBlankMode, setIsBlankMode] = useState(false)
  // フォーム状態
  const [customName, setCustomName] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [creating, setCreating] = useState(false)

  // 全テンプレート一覧を取得
  const allTemplates = useMemo(() => getTemplates(), [])

  // カテゴリでフィルタリング
  const filteredTemplates = useMemo(() => {
    if (activeCategory === 'all') return allTemplates
    if (activeCategory === 'blank') return []
    const cat = CATEGORIES.find((c) => c.id === activeCategory)
    if (!cat) return allTemplates
    return allTemplates.filter((t) => cat.documentTypes.includes(t.document_type))
  }, [activeCategory, allTemplates])

  /** ブロックサマリーを生成する */
  const getBlockSummary = useCallback((blocks: TemplateBlock[]): string => {
    const typeCounts: Record<string, number> = {}
    for (const b of blocks) {
      typeCounts[b.type] = (typeCounts[b.type] ?? 0) + 1
    }
    return Object.entries(typeCounts)
      .filter(([type]) => type !== 'spacer')
      .map(([type, count]) => {
        const label = BLOCK_TYPE_LABELS[type] ?? type
        return count > 1 ? `${label}x${count}` : label
      })
      .join(', ')
  }, [])

  /** 変数リストを取得する */
  const getVariableList = useCallback((template: LocalTemplate): string => {
    return template.variables.map((v) => v.label).join(', ')
  }, [])

  /** テンプレートカードをクリック */
  const handleSelectTemplate = useCallback((template: LocalTemplate) => {
    setSelectedTemplate(template)
    setIsBlankMode(false)
    setCustomName(`${template.name}（カスタム）`)
    setCustomDescription(template.description)
  }, [])

  /** カテゴリ切り替え */
  const handleCategoryChange = useCallback((categoryId: string) => {
    setActiveCategory(categoryId)
    if (categoryId === 'blank') {
      setSelectedTemplate(null)
      setIsBlankMode(true)
      setCustomName('')
      setCustomDescription('')
    } else {
      setIsBlankMode(false)
    }
  }, [])

  /** テンプレートを作成してエディタへ遷移 */
  const handleCreate = useCallback(async () => {
    const name = customName.trim()
    if (!name) return
    setCreating(true)
    try {
      const id = `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

      if (isBlankMode) {
        // 白紙テンプレート: 最小限のブロックのみ
        const blankBlocks: TemplateBlock[] = [
          { id: `blk-${Date.now()}-0`, type: 'heading', order: 0, content: name, level: 1, align: 'center', letterSpacing: 8 },
          { id: `blk-${Date.now()}-1`, type: 'spacer', order: 1, spacerHeight: 10 },
          { id: `blk-${Date.now()}-2`, type: 'paragraph', order: 2, content: '（ここに内容を記載してください）', align: 'left', fontSize: 12 },
        ]
        const currentUser = getCurrentUser()
        const template: LocalTemplate = {
          id,
          name,
          document_type: 'other',
          description: customDescription.trim(),
          is_published: false,
          version: 1,
          variables: [],
          body_template: '',
          blocks: blankBlocks,
          created_at: new Date().toISOString(),
          status: 'draft',
          submitted_by: currentUser.name,
        }
        saveTemplate(template)

        // 監査ログ: テンプレート作成
        addAuditLog({
          user_name: currentUser.name,
          user_role: currentUser.role,
          target_type: 'template',
          target_id: id,
          target_label: name,
          operation: 'template_create',
          before_value: null,
          after_value: { name, document_type: 'other', status: 'draft' },
          success: true,
          comment: 'テンプレート新規作成（白紙）',
        })

        router.push(`/templates/${id}/edit`)
        return
      }

      // 既存テンプレートをベースに作成
      if (!selectedTemplate) return
      const sourceBlocks = selectedTemplate.blocks ?? []
      // ブロックIDを一意にリネーム
      const blocks: TemplateBlock[] = sourceBlocks.map((b, i) => ({
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

      const currentUserForBase = getCurrentUser()
      const template: LocalTemplate = {
        id,
        name,
        document_type: selectedTemplate.document_type,
        description: customDescription.trim(),
        is_published: false,
        version: 1,
        variables,
        body_template: '',
        blocks,
        created_at: new Date().toISOString(),
        status: 'draft',
        submitted_by: currentUserForBase.name,
      }
      saveTemplate(template)

      // 監査ログ: テンプレート作成
      addAuditLog({
        user_name: currentUserForBase.name,
        user_role: currentUserForBase.role,
        target_type: 'template',
        target_id: id,
        target_label: name,
        operation: 'template_create',
        before_value: null,
        after_value: { name, document_type: selectedTemplate.document_type, status: 'draft', base_template: selectedTemplate.name },
        success: true,
        comment: `テンプレート新規作成（ベース: ${selectedTemplate.name}）`,
      })

      router.push(`/templates/${id}/edit`)
    } finally {
      setCreating(false)
    }
  }, [customName, customDescription, isBlankMode, selectedTemplate, router])

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-6 px-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link href="/templates" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ChevronLeft className="h-4 w-4" />
          テンプレート一覧
        </Link>
        <div className="h-5 w-px bg-slate-300" />
        <h1 className="text-xl font-bold text-slate-900">新規テンプレート作成</h1>
      </div>

      {/* テンプレート選択セクション */}
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-800">テンプレートの種類を選択</h2>

          {/* カテゴリフィルタ */}
          <div className="mb-5 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {/* テンプレートカード一覧 */}
          {activeCategory === 'blank' ? (
            <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <FilePlus className="mx-auto mb-3 h-10 w-10 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">白紙のテンプレートから作成します</p>
              <p className="mt-1 text-xs text-slate-500">見出しと本文ブロックのみの最小構成で開始し、エディタで自由に構築できます</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-sm text-slate-500">該当するテンプレートがありません</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredTemplates.map((tpl) => {
                const isSelected = selectedTemplate?.id === tpl.id && !isBlankMode
                const varCount = tpl.variables.length
                const icon = CATEGORY_ICON_MAP[tpl.document_type] ?? <FileText className="h-6 w-6 text-slate-400" />
                const catLabel = CATEGORY_LABEL_MAP[tpl.document_type] ?? 'その他'
                return (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`group relative rounded-lg border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="mb-2">{icon}</div>
                    <div className="text-sm font-semibold text-slate-900 leading-tight">{tpl.name}</div>
                    <div className="mt-1 flex items-center gap-1">
                      <Tag className="h-3 w-3 text-slate-400" />
                      <span className="text-xs text-slate-500">{catLabel}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                      <span>v{tpl.version}</span>
                      <span className="text-slate-300">/</span>
                      <span className="flex items-center gap-0.5">
                        <Variable className="h-3 w-3" />
                        {varCount}変数
                      </span>
                    </div>
                    {/* 選択済みインジケータ */}
                    {isSelected && (
                      <div className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-blue-500" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 選択中テンプレート詳細 + フォーム */}
      {(selectedTemplate || isBlankMode) && (
        <Card>
          <CardContent className="space-y-5 p-6">
            {/* 選択中テンプレートのタイトル */}
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                {isBlankMode ? '白紙から作成' : `選択中: ${selectedTemplate?.name}`}
              </h2>
              {!isBlankMode && selectedTemplate && (
                <p className="mt-1 text-sm text-slate-500">{selectedTemplate.description}</p>
              )}
            </div>

            {/* フォーム: 名前と説明 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm font-medium text-slate-700">
                  テンプレート名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="例: 在職証明書（カスタム）"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">説明</Label>
                <Input
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="テンプレートの用途や注意点を記載"
                  className="mt-1"
                />
              </div>
            </div>

            {/* テンプレートの構成情報 */}
            {!isBlankMode && selectedTemplate && (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">含まれるブロック</span>
                  <p className="mt-0.5 text-sm text-slate-700">
                    {selectedTemplate.blocks
                      ? getBlockSummary(selectedTemplate.blocks)
                      : 'ブロック情報なし'}
                  </p>
                </div>
                {selectedTemplate.variables.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">含まれる変数</span>
                    <p className="mt-0.5 text-sm text-slate-700">{getVariableList(selectedTemplate)}</p>
                  </div>
                )}
              </div>
            )}

            {isBlankMode && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">初期構成</span>
                <p className="mt-0.5 text-sm text-slate-700">見出し, 余白, 本文（最小構成からエディタで自由に追加可能）</p>
              </div>
            )}

            {/* 作成ボタン */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <Button
                asChild
                variant="outline"
                size="sm"
              >
                <Link href="/templates">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  キャンセル
                </Link>
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !customName.trim()}
                className="gap-1.5"
              >
                {creating ? '作成中...' : 'このテンプレートで作成する'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 未選択時のヒント */}
      {!selectedTemplate && !isBlankMode && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">上からテンプレートを選択するか、「白紙から作成」を選んでください</p>
        </div>
      )}
    </div>
  )
}
