'use client'

// =============================================================================
// B-Doc 新規文書作成ページ（簡易フロー版）
// テンプレート選択 → フォーム入力 → PDF生成・ダウンロード
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react'
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
} from '@/lib/store'
import type { LocalTemplate, TemplateBlock, LocalSeal } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  ChevronLeft,
  FileDown,
  Loader2,
} from 'lucide-react'

// =============================================================================
// 変数置換ヘルパー
// =============================================================================

/** 文字列中の {{key}} を formValues で置換する */
function replaceVars(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? '')
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

function BlockRenderer({ block, values }: { block: TemplateBlock; values: Record<string, string> }) {
  const content = block.content ? replaceVars(block.content, values) : ''
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
                    {replaceVars(h, values)}
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
                    {replaceVars(cell, values)}
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
      const company = block.addressCompany ? replaceVars(block.addressCompany, values) : ''
      const dept = block.addressDepartment ? replaceVars(block.addressDepartment, values) : ''
      const name = block.addressName ? replaceVars(block.addressName, values) : ''
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
  // PDF生成中フラグ
  const [isGenerating, setIsGenerating] = useState(false)
  // 読み込み中
  const [loading, setLoading] = useState(true)

  // テンプレートの読み込み
  useEffect(() => {
    if (!templateId) {
      setLoading(false)
      return
    }
    const tpl = getTemplate(templateId)
    if (tpl) {
      setTemplate(tpl)
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

  // PDF 生成＆ダウンロード
  const handleGeneratePdf = useCallback(async () => {
    if (!template) return
    if (!validateAll()) return

    setIsGenerating(true)
    try {
      // localStorage に文書を保存
      const doc = createDocument({
        title: `${template.name}`,
        template_id: template.id,
        document_type: template.document_type,
        values: formValues,
        body_template: template.body_template,
      })

      // 発行済みにする
      saveDocument({
        ...doc,
        status: 'issued',
        issued_at: new Date().toISOString(),
        issued_by: 'デモユーザー',
      })

      // 監査ログ
      addAuditLog({
        user_name: 'デモユーザー',
        user_role: 'creator',
        target_type: 'document',
        target_id: doc.id,
        target_label: doc.title,
        operation: 'issue',
        before_value: null,
        after_value: { status: 'issued' },
        success: true,
        comment: 'PDF生成・ダウンロード',
      })

      // プレビュー領域の内容をコピーして印刷用ウィンドウを開く
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
<title>${template.name}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif; font-size: 12px; color: #1a1a1a; line-height: 1.6; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #666; padding: 4px 8px; text-align: left; }
  th { background: #f0f0f0; font-weight: 600; }
  hr { border: none; border-top: 1px solid #999; margin: 8px 0; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .text-left { text-align: left; }
  .font-bold { font-weight: bold; }
  .font-medium { font-weight: 500; }
  .my-1 { margin: 4px 0; }
  .my-2 { margin: 8px 0; }
  .my-3 { margin: 12px 0; }
  .my-4 { margin: 16px 0; }
  .notice { border: 1px solid #999; background: #fafafa; padding: 8px 12px; border-radius: 4px; white-space: pre-wrap; font-size: 11px; margin: 8px 0; }
  .var-line { display: flex; gap: 16px; margin: 4px 0; font-size: 13px; }
  .var-label { width: 120px; flex-shrink: 0; font-weight: 500; }
  .seal-container { display: flex; margin: 8px 0; }
  .seal-left { justify-content: flex-start; }
  .seal-center { justify-content: center; }
  .seal-right { justify-content: flex-end; }
  .signature { text-align: right; margin: 16px 0; font-size: 13px; line-height: 1.8; }
  h1 { font-size: 20px; margin: 8px 0; }
  h2 { font-size: 17px; margin: 8px 0; }
  h3 { font-size: 15px; margin: 8px 0; }
  .address { margin: 8px 0; font-size: 13px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
${previewEl.innerHTML}
</body>
</html>`)
      printWindow.document.close()

      // 印刷ダイアログを表示
      setTimeout(() => {
        printWindow.print()
      }, 500)

    } catch (err) {
      const message = err instanceof Error ? err.message : 'PDF生成に失敗しました'
      alert(message)
    } finally {
      setIsGenerating(false)
    }
  }, [template, formValues, validateAll])

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

              return (
                <div key={v.key} className="space-y-1.5">
                  <Label htmlFor={v.key} className="flex items-center gap-1 text-sm">
                    {v.label}
                    {v.required && <span className="text-red-500">*</span>}
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
        <div className="w-3/5 overflow-y-auto bg-gray-200/60 p-6">
          <div className="mx-auto" style={{ maxWidth: '210mm' }}>
            {/* A4 用紙 */}
            <div
              id="a4-preview-content"
              className="mx-auto bg-white shadow-lg"
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
                <BlockRenderer key={block.id} block={block} values={formValues} />
              ))}

              {/* ブロックがない場合、body_template からフォールバック表示 */}
              {sortedBlocks.length === 0 && template.body_template && (
                <div className="whitespace-pre-wrap text-sm">
                  {replaceVars(template.body_template, formValues)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* フッター */}
      <div className="flex items-center justify-between border-t bg-white px-6 py-3">
        <Link href="/documents/new/select-template">
          <Button variant="outline" className="text-gray-600">
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            テンプレート選択に戻る
          </Button>
        </Link>

        <Button onClick={handleGeneratePdf} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          PDF生成
        </Button>
      </div>
    </div>
  )
}
