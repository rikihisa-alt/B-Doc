'use client'

// =============================================================================
// B-Doc 新規文書作成ページ（簡易フロー版）
// テンプレート選択 → フォーム入力 → PDF生成・ダウンロード
// =============================================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getTemplate,
  getSeal,
  createDocument,
  saveDocument,
  addAuditLog,
  getSettings,
  getCurrentUser,
} from '@/lib/store'
import type { LocalTemplate, TemplateBlock, LocalSeal, LocalSettings } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  ChevronLeft,
  ChevronDown,
  FileDown,
  FileText,
  Globe,
  ClipboardCopy,
  Loader2,
  Printer,
  Check,
} from 'lucide-react'
import { exportToDocx } from '@/lib/export/docx'
import { exportToHtml } from '@/lib/export/html'

// =============================================================================
// 会社情報変数マッピング
// =============================================================================

/** 会社情報の予約変数キーと設定フィールドのマッピング */
const COMPANY_VAR_MAP: Record<string, keyof LocalSettings> = {
  'company_name': 'companyName',
  'company_name_kana': 'companyNameKana',
  'company_name_en': 'companyNameEn',
  'company_postal_code': 'companyPostalCode',
  'company_address': 'companyAddress',
  'company_address_building': 'companyAddressBuilding',
  'company_phone': 'companyPhone',
  'company_fax': 'companyFax',
  'company_email': 'companyEmail',
  'company_website': 'companyWebsite',
  'company_representative_name': 'companyRepresentativeName',
  'company_representative_title': 'companyRepresentativeTitle',
  'company_registration_number': 'companyRegistrationNumber',
  'company_established_date': 'companyEstablishedDate',
  'company_capital': 'companyCapital',
  'company_bank_name': 'companyBankName',
  'company_bank_branch': 'companyBankBranch',
  'company_bank_account_type': 'companyBankAccountType',
  'company_bank_account_number': 'companyBankAccountNumber',
  'company_bank_account_name': 'companyBankAccountName',
}

// =============================================================================
// 変数置換ヘルパー
// =============================================================================

/** 文字列中の {{key}} を formValues で置換し、未定義の会社変数は設定から補完する */
function replaceVars(text: string, values: Record<string, string>, companySettings?: LocalSettings): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    // まず formValues から取得
    if (values[key] !== undefined && values[key] !== '') return values[key]
    // フォールバック: 会社情報設定から補完
    if (companySettings && key in COMPANY_VAR_MAP) {
      const settingKey = COMPANY_VAR_MAP[key]
      return String(companySettings[settingKey] ?? '')
    }
    return ''
  })
}

// =============================================================================
// 印影 SVG レンダリング（インライン）
// =============================================================================

function SealPreview({ seal }: { seal: LocalSeal }) {
  const sizePx = seal.size * 2.5
  if (seal.type === 'round') {
    const r = sizePx / 2 - seal.border_width
    return (
      <svg width={sizePx} height={sizePx} viewBox={`0 0 ${sizePx} ${sizePx}`}>
        <circle cx={sizePx / 2} cy={sizePx / 2} r={r}
          fill="none" stroke={seal.color} strokeWidth={seal.border_width} />
        <text x={sizePx / 2} y={sizePx / 2 - 6} textAnchor="middle" fontSize={sizePx * 0.18}
          fill={seal.color} fontFamily={seal.font_family}>{seal.text_line1}</text>
        <text x={sizePx / 2} y={sizePx / 2 + 10} textAnchor="middle" fontSize={sizePx * 0.16}
          fill={seal.color} fontFamily={seal.font_family}>{seal.text_line2}</text>
      </svg>
    )
  }
  if (seal.type === 'square') {
    return (
      <svg width={sizePx} height={sizePx} viewBox={`0 0 ${sizePx} ${sizePx}`}>
        <rect x={seal.border_width / 2} y={seal.border_width / 2}
          width={sizePx - seal.border_width} height={sizePx - seal.border_width}
          fill="none" stroke={seal.color} strokeWidth={seal.border_width} />
        <text x={sizePx / 2} y={sizePx * 0.4} textAnchor="middle" fontSize={sizePx * 0.22}
          fill={seal.color} fontFamily={seal.font_family}>{seal.text_line1}</text>
        <text x={sizePx / 2} y={sizePx * 0.65} textAnchor="middle" fontSize={sizePx * 0.18}
          fill={seal.color} fontFamily={seal.font_family}>{seal.text_line2}</text>
      </svg>
    )
  }
  // personal
  return (
    <svg width={sizePx} height={sizePx} viewBox={`0 0 ${sizePx} ${sizePx}`}>
      <circle cx={sizePx / 2} cy={sizePx / 2} r={sizePx / 2 - seal.border_width}
        fill="none" stroke={seal.color} strokeWidth={seal.border_width} />
      <text x={sizePx / 2} y={sizePx / 2 + 4} textAnchor="middle" fontSize={sizePx * 0.35}
        fill={seal.color} fontFamily={seal.font_family}>{seal.text_line1}</text>
    </svg>
  )
}

// =============================================================================
// A4 ブロックレンダラー
// =============================================================================

function BlockRenderer({ block, values, companySettings }: { block: TemplateBlock; values: Record<string, string>; companySettings?: LocalSettings }) {
  const content = block.content ? replaceVars(block.content, values, companySettings) : ''
  const alignClass = block.align === 'center' ? 'text-center' : block.align === 'right' ? 'text-right' : 'text-left'

  switch (block.type) {
    case 'heading': {
      const Tag = block.level === 1 ? 'h1' : block.level === 2 ? 'h2' : 'h3'
      const sizeClass = block.level === 1 ? 'text-xl font-bold' : block.level === 2 ? 'text-lg font-semibold' : 'text-base font-semibold'
      return (
        <Tag className={cn(sizeClass, alignClass, 'my-2')}
          style={{ letterSpacing: block.letterSpacing ? `${block.letterSpacing}px` : undefined }}>
          {content}
        </Tag>
      )
    }

    case 'paragraph': {
      return (
        <p className={cn(alignClass, 'my-1 whitespace-pre-wrap')}
          style={{
            fontSize: block.fontSize ? `${block.fontSize}px` : undefined,
            fontWeight: block.bold ? 'bold' : undefined,
            fontStyle: block.italic ? 'italic' : undefined,
            textDecoration: block.underline ? 'underline' : undefined,
            lineHeight: block.lineHeight ? block.lineHeight : undefined,
          }}>
          {content}
        </p>
      )
    }

    case 'variable_line': {
      const val = block.variableKey ? values[block.variableKey] ?? '' : ''
      const isFilled = val.trim().length > 0
      return (
        <div className="my-1 flex gap-4 text-sm">
          <span className="w-32 shrink-0 font-medium">{block.variableLabel}:</span>
          <span className={cn('flex-1', !isFilled && 'bg-yellow-100 px-1 rounded text-gray-400')}>
            {isFilled ? val : '（未入力）'}
          </span>
        </div>
      )
    }

    case 'table': {
      if (!block.tableCells) return null
      return (
        <table className="my-2 w-full border-collapse border border-gray-400 text-xs">
          {block.tableHeaders && (
            <thead>
              <tr className="bg-gray-100">
                {block.tableHeaders.map((h, i) => (
                  <th key={i} className="border border-gray-400 px-2 py-1 font-medium">
                    {replaceVars(h, values, companySettings)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {block.tableCells.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-gray-400 px-2 py-1">
                    {replaceVars(cell, values, companySettings)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    case 'seal': {
      const seal = block.sealId ? getSeal(block.sealId) : null
      if (!seal) return <div className="my-2 text-xs text-gray-400">（印影なし）</div>
      const posClass = block.sealPosition === 'center' ? 'justify-center' : block.sealPosition === 'right' ? 'justify-end' : 'justify-start'
      return (
        <div className={cn('my-2 flex', posClass)}>
          <SealPreview seal={seal} />
        </div>
      )
    }

    case 'signature': {
      return (
        <div className="my-4 text-right text-sm leading-relaxed">
          {block.companyName && <p>{block.companyName}</p>}
          {block.representativeTitle && <p>{block.representativeTitle}</p>}
          {block.representativeName && <p className="font-medium">{block.representativeName}</p>}
        </div>
      )
    }

    case 'divider': {
      return (
        <hr className="my-3"
          style={{
            borderStyle: block.dividerStyle ?? 'solid',
            borderWidth: block.dividerThickness ? `${block.dividerThickness}px 0 0 0` : undefined,
          }}
        />
      )
    }

    case 'spacer': {
      return <div style={{ height: block.spacerHeight ? `${block.spacerHeight}px` : '10px' }} />
    }

    case 'page_break': {
      return (
        <div className="my-4 border-t-2 border-dashed border-gray-300 py-1 text-center text-[10px] text-gray-400">
          --- 改ページ ---
        </div>
      )
    }

    case 'notice': {
      const styleMap: Record<string, string> = {
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        bordered: 'bg-gray-50 border-gray-300 text-gray-700',
      }
      return (
        <div className={cn('my-2 whitespace-pre-wrap rounded border p-3 text-xs', styleMap[block.noticeStyle ?? 'bordered'])}>
          {content}
        </div>
      )
    }

    case 'date_line': {
      return <p className={cn('my-1 text-sm', alignClass)}>{content}</p>
    }

    case 'address_block': {
      const company = block.addressCompany ? replaceVars(block.addressCompany, values, companySettings) : ''
      const dept = block.addressDepartment ? replaceVars(block.addressDepartment, values, companySettings) : ''
      const name = block.addressName ? replaceVars(block.addressName, values, companySettings) : ''
      const suffix = block.addressSuffix ?? ''
      return (
        <div className="my-2 text-sm">
          {company && <p className="font-medium">{company} {suffix}</p>}
          {dept && <p>{dept}</p>}
          {name && <p>{name} {suffix && !company ? suffix : ''}</p>}
        </div>
      )
    }

    case 'image': {
      return (
        <div className="my-2 flex h-24 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
          画像プレースホルダー
        </div>
      )
    }

    default:
      return null
  }
}

// =============================================================================
// メインコンポーネント
// =============================================================================

export default function NewDocumentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateId = searchParams.get('template_id') ?? ''

  // テンプレートデータ
  const [template, setTemplate] = useState<LocalTemplate | null>(null)
  // フォーム値
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  // フィールドエラー
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  // エクスポート中フラグ
  const [isGenerating, setIsGenerating] = useState(false)
  // エクスポートドロップダウンの開閉
  const [isExportOpen, setIsExportOpen] = useState(false)
  // クリップボードコピー完了フラグ
  const [clipboardCopied, setClipboardCopied] = useState(false)
  // エクスポートドロップダウンの参照
  const exportDropdownRef = useRef<HTMLDivElement>(null)
  // 読み込み中
  const [loading, setLoading] = useState(true)
  // 会社設定（自動入力用）
  const [companySettings, setCompanySettings] = useState<LocalSettings | null>(null)
  // 自動入力されたキーのセット
  const [autoFilledKeys, setAutoFilledKeys] = useState<Set<string>>(new Set())

  // PDF出力情報フィールド
  const [docTitle, setDocTitle] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [creationDate, setCreationDate] = useState('')

  // テンプレートの読み込みと会社情報の自動入力
  useEffect(() => {
    if (!templateId) {
      setLoading(false)
      return
    }
    const tpl = getTemplate(templateId)
    const settings = getSettings()
    const currentUser = getCurrentUser()
    setCompanySettings(settings)

    if (tpl) {
      setTemplate(tpl)

      // PDF出力情報の初期値を設定
      setDocTitle(tpl.name)
      setCreatorName(currentUser.name)
      setCreationDate(new Date().toISOString().split('T')[0])

      // 会社情報からの自動入力
      const initialValues: Record<string, string> = {}
      const autoKeys = new Set<string>()
      for (const v of tpl.variables) {
        if (v.key in COMPANY_VAR_MAP) {
          const settingKey = COMPANY_VAR_MAP[v.key]
          const settingValue = String(settings[settingKey] ?? '')
          if (settingValue) {
            initialValues[v.key] = settingValue
            autoKeys.add(v.key)
          }
        }
      }
      setFormValues(initialValues)
      setAutoFilledKeys(autoKeys)
    }
    setLoading(false)
  }, [templateId])

  // ソート済みブロック
  const sortedBlocks = useMemo(() => {
    if (!template?.blocks) return []
    return [...template.blocks].sort((a, b) => a.order - b.order)
  }, [template])

  // フィールド変更ハンドラ
  const handleFieldChange = useCallback((key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
    // エラーをクリア
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  // onBlur バリデーション（必須チェックのみ）
  const validateField = useCallback((key: string, value: string, required: boolean, label: string) => {
    if (required && !value.trim()) {
      setFieldErrors((prev) => ({ ...prev, [key]: `${label}は必須です` }))
    }
  }, [])

  // 全フィールドバリデーション
  const validateAll = useCallback((): boolean => {
    if (!template) return false
    const errors: Record<string, string> = {}
    for (const v of template.variables) {
      const val = formValues[v.key] ?? ''
      if (v.required && !val.trim()) {
        errors[v.key] = `${v.label}は必須です`
      }
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [template, formValues])

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setIsExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // エクスポート共通: バリデーション＆文書保存＆監査ログ
  const prepareExport = useCallback(async (exportType: string): Promise<boolean> => {
    if (!template) return false

    if (!docTitle.trim()) {
      alert('書類名を入力してください。')
      return false
    }
    if (!creatorName.trim()) {
      alert('作成者名を入力してください。')
      return false
    }
    if (!validateAll()) return false

    try {
      const currentUser = getCurrentUser()
      const finalTitle = docTitle.trim() || template.name

      // localStorage に文書を保存
      const doc = createDocument({
        title: finalTitle,
        template_id: template.id,
        document_type: template.document_type,
        values: formValues,
        body_template: template.body_template,
        created_by: creatorName.trim(),
      })

      // 文書作成の監査ログ
      addAuditLog({
        user_name: currentUser.name,
        user_role: currentUser.role,
        target_type: 'document',
        target_id: doc.id,
        target_label: finalTitle,
        operation: 'document_create',
        before_value: null,
        after_value: { status: 'draft', title: finalTitle, creator: creatorName.trim() },
        success: true,
        comment: '文書新規作成',
      })

      // 発行済みにする
      saveDocument({
        ...doc,
        status: 'issued',
        issued_at: new Date().toISOString(),
        issued_by: creatorName.trim(),
      })

      // エクスポートの監査ログ
      addAuditLog({
        user_name: currentUser.name,
        user_role: currentUser.role,
        target_type: 'document',
        target_id: doc.id,
        target_label: finalTitle,
        operation: 'document_pdf_generate',
        before_value: { status: 'draft' },
        after_value: { status: 'issued', exportType },
        success: true,
        comment: `${exportType}エクスポート（作成者: ${creatorName.trim()}, 作成日: ${creationDate}）`,
      })

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'エクスポートの準備に失敗しました'
      alert(message)
      return false
    }
  }, [template, formValues, validateAll, docTitle, creatorName, creationDate])

  // PDF 出力（印刷ダイアログ）
  const handleExportPdf = useCallback(async () => {
    if (!template) return
    setIsGenerating(true)
    setIsExportOpen(false)
    try {
      const ok = await prepareExport('PDF')
      if (!ok) return

      const finalTitle = docTitle.trim() || template.name
      const previewEl = document.getElementById('a4-preview-content')
      if (!previewEl) return

      const printWindow = window.open('', '_blank', 'width=800,height=1000')
      if (!printWindow) {
        alert('ポップアップがブロックされました。許可してください。')
        return
      }

      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${finalTitle}</title>
<style>
  @page {
    size: A4;
    margin: 20mm;
    @top-left { content: "${finalTitle}"; font-size: 9px; color: #888; }
    @top-right { content: "作成者: ${creatorName.trim()}"; font-size: 9px; color: #888; }
    @bottom-center { content: counter(page) " / " counter(pages); font-size: 9px; color: #888; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif;
    font-size: 12px;
    color: #1a1a1a;
    line-height: 1.6;
  }
  /* ヘッダー・フッター（ブラウザ互換用） */
  .print-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    padding: 0 0 8px 0;
    border-bottom: 1px solid #ddd;
    font-size: 9px;
    color: #888;
    display: flex;
    justify-content: space-between;
  }
  .print-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px 0 0 0;
    border-top: 1px solid #ddd;
    font-size: 9px;
    color: #888;
    text-align: center;
  }
  .print-content {
    margin-top: 24px;
    margin-bottom: 24px;
  }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #666; padding: 4px 8px; text-align: left; }
  th { background: #f0f0f0; font-weight: 600; }
  hr { border: none; border-top: 1px solid #999; margin: 8px 0; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .text-left { text-align: left; }
  .font-bold { font-weight: bold; }
  .font-medium { font-weight: 500; }
  .font-semibold { font-weight: 600; }
  .my-1 { margin: 4px 0; }
  .my-2 { margin: 8px 0; }
  .my-3 { margin: 12px 0; }
  .my-4 { margin: 16px 0; }
  .whitespace-pre-wrap { white-space: pre-wrap; }
  h1 { font-size: 20px; margin: 8px 0; }
  h2 { font-size: 17px; margin: 8px 0; }
  h3 { font-size: 15px; margin: 8px 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="print-header">
  <span>${finalTitle}</span>
  <span>作成者: ${creatorName.trim()}</span>
</div>
<div class="print-footer">
  作成日: ${creationDate}
</div>
<div class="print-content">
${previewEl.innerHTML}
</div>
</body>
</html>`)
      printWindow.document.close()

      setTimeout(() => {
        printWindow.print()
      }, 500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PDF出力に失敗しました'
      alert(message)
    } finally {
      setIsGenerating(false)
    }
  }, [template, formValues, prepareExport, docTitle, creatorName, creationDate])

  // Word(.docx) エクスポート
  const handleExportDocx = useCallback(async () => {
    if (!template || !template.blocks) return
    setIsGenerating(true)
    setIsExportOpen(false)
    try {
      const ok = await prepareExport('Word')
      if (!ok) return

      await exportToDocx({
        blocks: template.blocks,
        formValues,
        docTitle: docTitle.trim() || template.name,
        creatorName: creatorName.trim(),
        creationDate,
        companySettings: companySettings ?? undefined,
        replaceVars,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Word出力に失敗しました'
      alert(message)
    } finally {
      setIsGenerating(false)
    }
  }, [template, formValues, prepareExport, docTitle, creatorName, creationDate, companySettings])

  // HTML エクスポート
  const handleExportHtml = useCallback(async () => {
    if (!template) return
    setIsGenerating(true)
    setIsExportOpen(false)
    try {
      const ok = await prepareExport('HTML')
      if (!ok) return

      exportToHtml({
        docTitle: docTitle.trim() || template.name,
        creatorName: creatorName.trim(),
        creationDate,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'HTML出力に失敗しました'
      alert(message)
    } finally {
      setIsGenerating(false)
    }
  }, [template, prepareExport, docTitle, creatorName, creationDate])

  // クリップボードにコピー
  const handleCopyToClipboard = useCallback(async () => {
    if (!template) return
    setIsExportOpen(false)
    try {
      // ブロックからプレーンテキストを生成
      const blocks = sortedBlocks
      const lines: string[] = []

      // タイトルと作成情報
      lines.push(docTitle.trim() || template.name)
      lines.push(`作成者: ${creatorName.trim()}`)
      lines.push(`作成日: ${creationDate}`)
      lines.push('')

      for (const block of blocks) {
        const content = block.content
          ? replaceVars(block.content, formValues, companySettings ?? undefined)
          : ''

        switch (block.type) {
          case 'heading':
            lines.push(content)
            lines.push('')
            break
          case 'paragraph':
            lines.push(content)
            lines.push('')
            break
          case 'variable_line': {
            const val = block.variableKey ? formValues[block.variableKey] ?? '' : ''
            lines.push(`${block.variableLabel ?? ''}: ${val || '（未入力）'}`)
            break
          }
          case 'table': {
            if (block.tableHeaders) {
              lines.push(block.tableHeaders.map((h) => replaceVars(h, formValues, companySettings ?? undefined)).join('\t'))
            }
            if (block.tableCells) {
              for (const row of block.tableCells) {
                lines.push(row.map((c) => replaceVars(c, formValues, companySettings ?? undefined)).join('\t'))
              }
            }
            lines.push('')
            break
          }
          case 'divider':
            lines.push('────────────────')
            break
          case 'spacer':
            lines.push('')
            break
          case 'page_break':
            lines.push('--- 改ページ ---')
            lines.push('')
            break
          case 'notice':
            lines.push(`[${block.noticeStyle === 'warning' ? '注意' : '情報'}] ${content}`)
            lines.push('')
            break
          case 'date_line':
            lines.push(content)
            break
          case 'address_block': {
            const company = block.addressCompany ? replaceVars(block.addressCompany, formValues, companySettings ?? undefined) : ''
            const dept = block.addressDepartment ? replaceVars(block.addressDepartment, formValues, companySettings ?? undefined) : ''
            const name = block.addressName ? replaceVars(block.addressName, formValues, companySettings ?? undefined) : ''
            const suffix = block.addressSuffix ?? ''
            if (company) lines.push(`${company} ${suffix}`)
            if (dept) lines.push(dept)
            if (name) lines.push(`${name}${suffix && !company ? ` ${suffix}` : ''}`)
            lines.push('')
            break
          }
          case 'signature': {
            if (block.companyName) lines.push(block.companyName)
            if (block.representativeTitle) lines.push(block.representativeTitle)
            if (block.representativeName) lines.push(block.representativeName)
            lines.push('')
            break
          }
          case 'seal':
            lines.push('（印）')
            break
          default:
            break
        }
      }

      const textContent = lines.join('\n')
      await navigator.clipboard.writeText(textContent)

      // 監査ログ
      const currentUser = getCurrentUser()
      addAuditLog({
        user_name: currentUser.name,
        user_role: currentUser.role,
        target_type: 'document',
        target_id: template.id,
        target_label: docTitle.trim() || template.name,
        operation: 'document_pdf_generate',
        before_value: null,
        after_value: { exportType: 'clipboard' },
        success: true,
        comment: 'クリップボードにコピー',
      })

      // コピー完了フィードバック
      setClipboardCopied(true)
      setTimeout(() => setClipboardCopied(false), 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'クリップボードへのコピーに失敗しました'
      alert(message)
    }
  }, [template, sortedBlocks, formValues, docTitle, creatorName, creationDate, companySettings])

  // ローディング表示
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">読み込み中...</span>
      </div>
    )
  }

  // テンプレートが見つからない場合
  if (!templateId || !template) {
    return (
      <div className="flex h-[calc(100vh-6rem)] flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-500">テンプレートが選択されていません。</p>
        <Link href="/documents/new/select-template">
          <Button variant="outline">テンプレートを選択する</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/documents/new/select-template">
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
              <ChevronLeft className="h-4 w-4" />
              テンプレート選択に戻る
            </Button>
          </Link>
          <div className="h-5 w-px bg-gray-200" />
          <h1 className="text-base font-semibold text-gray-900">
            {template.name}
            <span className="ml-2 text-sm font-normal text-gray-500">作成中</span>
          </h1>
        </div>
      </div>

      {/* メインコンテンツ: 2カラム */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 左パネル: 入力フォーム (40%) */}
        <div className="w-2/5 overflow-y-auto border-r bg-gray-50/50 p-6">
          <div className="mx-auto max-w-md space-y-5">
            {/* PDF出力情報セクション */}
            <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-b from-blue-50 to-blue-50/30 p-5 space-y-4 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-bold text-blue-800">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
                  <FileDown className="h-4 w-4 text-blue-600" />
                </div>
                エクスポート情報
              </h2>

              {/* 書類名 */}
              <div className="space-y-1.5">
                <Label htmlFor="doc-title" className="text-sm text-blue-700">
                  書類名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="doc-title"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="書類名を入力"
                  className="border-blue-200 bg-white focus-visible:ring-blue-400"
                />
              </div>

              {/* 作成者名 */}
              <div className="space-y-1.5">
                <Label htmlFor="creator-name" className="text-sm text-blue-700">
                  作成者名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="creator-name"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="作成者名を入力"
                  className="border-blue-200 bg-white focus-visible:ring-blue-400"
                />
              </div>

              {/* 作成日 */}
              <div className="space-y-1.5">
                <Label htmlFor="creation-date" className="text-sm text-blue-700">
                  作成日
                </Label>
                <Input
                  id="creation-date"
                  type="date"
                  value={creationDate}
                  onChange={(e) => setCreationDate(e.target.value)}
                  className="border-blue-200 bg-white focus-visible:ring-blue-400"
                />
              </div>
            </div>

            <h2 className="text-sm font-semibold text-gray-700">入力項目</h2>

            {template.variables.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">
                このテンプレートには入力項目がありません。
              </p>
            )}

            {template.variables.map((v) => {
              const value = formValues[v.key] ?? ''
              const error = fieldErrors[v.key]
              const errorClass = error ? 'border-red-400 focus-visible:ring-red-400' : ''
              const isAutoFilled = autoFilledKeys.has(v.key)

              return (
                <div key={v.key} className="space-y-1.5">
                  <Label htmlFor={v.key} className="flex items-center gap-1 text-sm">
                    {v.label}
                    {v.required && <span className="text-red-500">*</span>}
                    {isAutoFilled && (
                      <span className="ml-1 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                        会社情報から自動入力
                      </span>
                    )}
                  </Label>

                  {/* テキスト入力 */}
                  {v.type === 'text' && (
                    <Input
                      id={v.key}
                      value={value}
                      onChange={(e) => handleFieldChange(v.key, e.target.value)}
                      onBlur={() => validateField(v.key, value, v.required, v.label)}
                      className={errorClass}
                      placeholder={v.label}
                    />
                  )}

                  {/* 数値入力 */}
                  {v.type === 'number' && (
                    <Input
                      id={v.key}
                      type="number"
                      value={value}
                      onChange={(e) => handleFieldChange(v.key, e.target.value)}
                      onBlur={() => validateField(v.key, value, v.required, v.label)}
                      className={errorClass}
                      placeholder={v.label}
                    />
                  )}

                  {/* 日付入力 */}
                  {v.type === 'date' && (
                    <Input
                      id={v.key}
                      type="date"
                      value={value}
                      onChange={(e) => handleFieldChange(v.key, e.target.value)}
                      onBlur={() => validateField(v.key, value, v.required, v.label)}
                      className={errorClass}
                    />
                  )}

                  {/* セレクト */}
                  {v.type === 'select' && v.options && v.options.length > 0 && (
                    <Select
                      value={value}
                      onValueChange={(val) => {
                        handleFieldChange(v.key, val)
                        validateField(v.key, val, v.required, v.label)
                      }}
                    >
                      <SelectTrigger id={v.key} className={errorClass}>
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {v.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* チェックボックス（boolean） */}
                  {v.type === 'boolean' && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={value === 'true'}
                        onChange={(e) => handleFieldChange(v.key, e.target.checked ? 'true' : 'false')}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">{v.label}</span>
                    </label>
                  )}

                  {/* テキストエリア */}
                  {v.type === 'textarea' && (
                    <Textarea
                      id={v.key}
                      value={value}
                      onChange={(e) => handleFieldChange(v.key, e.target.value)}
                      onBlur={() => validateField(v.key, value, v.required, v.label)}
                      className={cn('min-h-[80px]', errorClass)}
                      placeholder={v.label}
                    />
                  )}

                  {/* エラーメッセージ */}
                  {error && <p className="text-xs text-red-500">{error}</p>}
                </div>
              )
            })}
          </div>
        </div>

        {/* 右パネル: A4 ライブプレビュー (60%) */}
        <div className="w-3/5 overflow-y-auto bg-gradient-to-b from-slate-200/60 to-slate-300/30 p-8">
          <div className="mx-auto" style={{ maxWidth: '210mm' }}>
            {/* A4 用紙 */}
            <div
              id="a4-preview-content"
              className="mx-auto bg-white a4-paper-shadow rounded-sm"
              style={{
                width: '210mm',
                minHeight: '297mm',
                padding: '20mm',
                fontFamily: '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif',
                fontSize: '12px',
                lineHeight: 1.6,
                color: '#1a1a1a',
              }}
            >
              {sortedBlocks.map((block) => (
                <BlockRenderer key={block.id} block={block} values={formValues} companySettings={companySettings ?? undefined} />
              ))}

              {/* ブロックがない場合、body_template からフォールバック表示 */}
              {sortedBlocks.length === 0 && template.body_template && (
                <div className="whitespace-pre-wrap text-sm">
                  {replaceVars(template.body_template, formValues, companySettings ?? undefined)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* フッター（スティッキーバー） */}
      <div className="flex items-center justify-between border-t bg-white px-6 py-3.5 sticky-bar-shadow">
        <Link href="/documents/new/select-template">
          <Button variant="outline" className="text-gray-600">
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            テンプレート選択に戻る
          </Button>
        </Link>

        {/* エクスポートドロップダウン */}
        <div className="relative" ref={exportDropdownRef}>
          <Button
            onClick={() => setIsExportOpen((prev) => !prev)}
            disabled={isGenerating}
            className="gap-1.5"
          >
            {isGenerating ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-1 h-4 w-4" />
            )}
            エクスポート
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExportOpen && 'rotate-180')} />
          </Button>

          {/* ドロップダウンメニュー */}
          {isExportOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-64 rounded-lg border bg-white py-1.5 shadow-lg">
              {/* PDF出力 */}
              <button
                type="button"
                onClick={handleExportPdf}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Printer className="h-4 w-4 text-blue-500 shrink-0" />
                <div>
                  <div className="font-medium">PDF出力</div>
                  <div className="text-xs text-gray-400">印刷ダイアログを開く</div>
                </div>
              </button>

              {/* Word出力 */}
              <button
                type="button"
                onClick={handleExportDocx}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                <div>
                  <div className="font-medium">Word (.docx)</div>
                  <div className="text-xs text-gray-400">ダウンロード</div>
                </div>
              </button>

              {/* HTML出力 */}
              <button
                type="button"
                onClick={handleExportHtml}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Globe className="h-4 w-4 text-green-500 shrink-0" />
                <div>
                  <div className="font-medium">HTML</div>
                  <div className="text-xs text-gray-400">ダウンロード</div>
                </div>
              </button>

              {/* 区切り線 */}
              <div className="my-1 border-t border-gray-100" />

              {/* クリップボードにコピー */}
              <button
                type="button"
                onClick={handleCopyToClipboard}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {clipboardCopied ? (
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <ClipboardCopy className="h-4 w-4 text-amber-500 shrink-0" />
                )}
                <div>
                  <div className="font-medium">
                    {clipboardCopied ? 'コピーしました' : 'クリップボードにコピー'}
                  </div>
                  <div className="text-xs text-gray-400">テキスト形式でコピー</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* クリップボードコピー完了トースト */}
      {clipboardCopied && (
        <div className="fixed bottom-20 right-6 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm text-white shadow-lg animate-in slide-in-from-bottom-2">
          <Check className="h-4 w-4" />
          クリップボードにコピーしました
        </div>
      )}
    </div>
  )
}
