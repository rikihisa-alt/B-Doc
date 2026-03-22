'use client'

/**
 * テンプレートエディタページ
 * Word/Google Docs レベルのリッチ文書テンプレート編集機能を提供する
 * 3パネル構成: ブロックパレット | メイン編集エリア | A4プレビュー
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SealPreview } from '@/components/seal/seal-preview'
import {
  getTemplate,
  saveTemplate,
  getSeals,
} from '@/lib/store'
import type {
  LocalTemplate,
  LocalSeal,
  TemplateBlock,
  TemplateBlockType,
} from '@/lib/store'
import {
  Heading1,
  Type,
  Variable,
  Table,
  Stamp,
  PenLine,
  Minus,
  Space,
  Scissors,
  AlertTriangle,
  Image,
  Calendar,
  Building2,
  GripVertical,
  X,
  ChevronLeft,
  Save,
  Plus,
  ArrowUp,
  ArrowDown,
  Copy,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  FileText,
} from 'lucide-react'

// ============================================================
// ブロック種別の定義情報
// ============================================================

interface BlockTypeInfo {
  type: TemplateBlockType
  label: string
  icon: React.ReactNode
  description: string
}

/** ブロックパレット用の定義 */
const BLOCK_TYPES: BlockTypeInfo[] = [
  { type: 'heading', label: '見出し', icon: <Heading1 className="h-4 w-4" />, description: 'H1-H4、文字間隔調整' },
  { type: 'paragraph', label: '本文', icon: <Type className="h-4 w-4" />, description: 'リッチテキスト' },
  { type: 'variable_line', label: '変数行', icon: <Variable className="h-4 w-4" />, description: 'ラベル: {{変数}}' },
  { type: 'table', label: '表', icon: <Table className="h-4 w-4" />, description: '行×列の表' },
  { type: 'seal', label: '印影', icon: <Stamp className="h-4 w-4" />, description: '印影を配置' },
  { type: 'signature', label: '署名欄', icon: <PenLine className="h-4 w-4" />, description: '会社名・代表者' },
  { type: 'divider', label: '区切線', icon: <Minus className="h-4 w-4" />, description: '線のスタイル' },
  { type: 'spacer', label: '余白', icon: <Space className="h-4 w-4" />, description: '高さ(mm)指定' },
  { type: 'page_break', label: '改ページ', icon: <Scissors className="h-4 w-4" />, description: 'ページ区切り' },
  { type: 'notice', label: '注意書き', icon: <AlertTriangle className="h-4 w-4" />, description: '枠付きテキスト' },
  { type: 'image', label: '画像', icon: <Image className="h-4 w-4" />, description: 'プレースホルダー' },
  { type: 'date_line', label: '日付行', icon: <Calendar className="h-4 w-4" />, description: '右寄せ日付' },
  { type: 'address_block', label: '宛名', icon: <Building2 className="h-4 w-4" />, description: '宛名ブロック' },
]

// ============================================================
// ユーティリティ
// ============================================================

/** 一意なブロックID生成 */
function generateBlockId(): string {
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/** 新規ブロックの初期値を生成 */
function createDefaultBlock(type: TemplateBlockType, order: number): TemplateBlock {
  const base: TemplateBlock = { id: generateBlockId(), type, order }
  switch (type) {
    case 'heading':
      return { ...base, content: '', level: 1, align: 'center', letterSpacing: 0 }
    case 'paragraph':
      return { ...base, content: '', align: 'left', fontSize: 12, bold: false, italic: false, underline: false, lineHeight: 1.8 }
    case 'variable_line':
      return { ...base, variableLabel: '', variableKey: '', variableType: 'text', variableRequired: true }
    case 'table':
      return { ...base, tableRows: 2, tableCols: 3, tableHeaders: ['項目', '数量', '金額'], tableCells: [['', '', ''], ['', '', '']] }
    case 'seal':
      return { ...base, sealId: '', sealPosition: 'right' }
    case 'signature':
      return { ...base, companyName: '', representativeTitle: '代表取締役', representativeName: '' }
    case 'divider':
      return { ...base, dividerStyle: 'solid', dividerThickness: 1 }
    case 'spacer':
      return { ...base, spacerHeight: 10 }
    case 'page_break':
      return { ...base }
    case 'notice':
      return { ...base, content: '', noticeStyle: 'bordered' }
    case 'image':
      return { ...base, content: '画像プレースホルダー', align: 'center' }
    case 'date_line':
      return { ...base, content: '令和○年○月○日', align: 'right' }
    case 'address_block':
      return { ...base, addressCompany: '', addressDepartment: '', addressName: '', addressSuffix: '御中' }
    default:
      return base
  }
}

// ============================================================
// 共通パーツ
// ============================================================

/** テキスト配置ボタン群 */
function AlignButtons({ align, onChange }: { align: 'left' | 'center' | 'right'; onChange: (a: 'left' | 'center' | 'right') => void }) {
  return (
    <div className="inline-flex rounded border border-slate-300">
      {(['left', 'center', 'right'] as const).map((a) => (
        <button
          key={a}
          className={`p-1.5 ${align === a ? 'bg-slate-200' : 'hover:bg-slate-50'}`}
          onClick={() => onChange(a)}
          title={a === 'left' ? '左揃え' : a === 'center' ? '中央揃え' : '右揃え'}
        >
          {a === 'left' && <AlignLeft className="h-3.5 w-3.5" />}
          {a === 'center' && <AlignCenter className="h-3.5 w-3.5" />}
          {a === 'right' && <AlignRight className="h-3.5 w-3.5" />}
        </button>
      ))}
    </div>
  )
}

// ============================================================
// ブロック別エディタコンポーネント
// ============================================================

interface BlockEditorProps {
  block: TemplateBlock
  onChange: (updated: TemplateBlock) => void
  seals: LocalSeal[]
}

/** 見出しブロックエディタ */
function HeadingBlockEditor({ block, onChange }: BlockEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          value={block.level ?? 1}
          onChange={(e) => onChange({ ...block, level: Number(e.target.value) as 1 | 2 | 3 | 4 })}
        >
          <option value={1}>H1（24pt）</option>
          <option value={2}>H2（20pt）</option>
          <option value={3}>H3（16pt）</option>
          <option value={4}>H4（14pt）</option>
        </select>
        <AlignButtons align={block.align ?? 'center'} onChange={(align) => onChange({ ...block, align })} />
      </div>
      <Input
        value={block.content ?? ''}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        placeholder="見出しテキストを入力"
        className="text-lg font-bold"
      />
      <div className="flex items-center gap-2">
        <Label className="whitespace-nowrap text-xs text-slate-500">文字間隔</Label>
        <input
          type="range"
          min={0}
          max={20}
          value={block.letterSpacing ?? 0}
          onChange={(e) => onChange({ ...block, letterSpacing: Number(e.target.value) })}
          className="h-1.5 flex-1"
        />
        <span className="w-12 text-right text-xs text-slate-500">{block.letterSpacing ?? 0}px</span>
      </div>
    </div>
  )
}

/** 本文ブロックエディタ */
function ParagraphBlockEditor({ block, onChange }: BlockEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1">
        <button
          className={`rounded p-1.5 ${block.bold ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
          onClick={() => onChange({ ...block, bold: !block.bold })}
          title="太字"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          className={`rounded p-1.5 ${block.italic ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
          onClick={() => onChange({ ...block, italic: !block.italic })}
          title="斜体"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          className={`rounded p-1.5 ${block.underline ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
          onClick={() => onChange({ ...block, underline: !block.underline })}
          title="下線"
        >
          <Underline className="h-3.5 w-3.5" />
        </button>
        <div className="mx-1 h-5 w-px bg-slate-300" />
        <AlignButtons align={block.align ?? 'left'} onChange={(align) => onChange({ ...block, align })} />
        <div className="mx-1 h-5 w-px bg-slate-300" />
        <select
          className="rounded border border-slate-300 px-1.5 py-1 text-xs"
          value={block.fontSize ?? 12}
          onChange={(e) => onChange({ ...block, fontSize: Number(e.target.value) })}
        >
          {[9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24].map((s) => (
            <option key={s} value={s}>{s}pt</option>
          ))}
        </select>
      </div>
      <textarea
        value={block.content ?? ''}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        placeholder="本文テキストを入力..."
        rows={3}
        className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        style={{
          fontWeight: block.bold ? 'bold' : 'normal',
          fontStyle: block.italic ? 'italic' : 'normal',
          textDecoration: block.underline ? 'underline' : 'none',
        }}
      />
      <div className="flex items-center gap-2">
        <Label className="whitespace-nowrap text-xs text-slate-500">行間</Label>
        <input
          type="range"
          min={1.0}
          max={3.0}
          step={0.1}
          value={block.lineHeight ?? 1.8}
          onChange={(e) => onChange({ ...block, lineHeight: Number(e.target.value) })}
          className="h-1.5 flex-1"
        />
        <span className="w-10 text-right text-xs text-slate-500">{(block.lineHeight ?? 1.8).toFixed(1)}</span>
      </div>
    </div>
  )
}

/** 変数行ブロックエディタ */
function VariableLineBlockEditor({ block, onChange }: BlockEditorProps) {
  const addOption = () => {
    const opts = [...(block.variableOptions ?? []), { value: '', label: '' }]
    onChange({ ...block, variableOptions: opts })
  }
  const removeOption = (idx: number) => {
    const opts = (block.variableOptions ?? []).filter((_, i) => i !== idx)
    onChange({ ...block, variableOptions: opts })
  }
  const updateOption = (idx: number, field: 'value' | 'label', val: string) => {
    const opts = [...(block.variableOptions ?? [])]
    opts[idx] = { ...opts[idx], [field]: val }
    if (field === 'label' && !opts[idx].value) {
      opts[idx].value = val
    }
    onChange({ ...block, variableOptions: opts })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-slate-500">ラベル</Label>
          <Input
            value={block.variableLabel ?? ''}
            onChange={(e) => onChange({ ...block, variableLabel: e.target.value })}
            placeholder="氏名"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-slate-500">変数キー</Label>
          <Input
            value={block.variableKey ?? ''}
            onChange={(e) => onChange({ ...block, variableKey: e.target.value })}
            placeholder="employee_name"
            className="mt-1 font-mono text-sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div>
          <Label className="text-xs text-slate-500">型</Label>
          <select
            className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm"
            value={block.variableType ?? 'text'}
            onChange={(e) => onChange({ ...block, variableType: e.target.value as TemplateBlock['variableType'] })}
          >
            <option value="text">テキスト</option>
            <option value="number">数値</option>
            <option value="date">日付</option>
            <option value="select">選択肢</option>
            <option value="boolean">真偽値</option>
          </select>
        </div>
        <label className="mt-5 flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={block.variableRequired ?? true}
            onChange={(e) => onChange({ ...block, variableRequired: e.target.checked })}
            className="rounded"
          />
          <span className="text-xs text-slate-600">必須</span>
        </label>
      </div>
      {/* プレビュー */}
      <div className="rounded bg-slate-50 px-3 py-2 text-sm text-slate-600">
        {block.variableLabel || 'ラベル'}: <span className="rounded bg-amber-100 px-1 font-mono text-amber-700">{`{{${block.variableKey || 'key'}}}`}</span>
      </div>
      {/* select型の場合のオプション */}
      {block.variableType === 'select' && (
        <div className="space-y-2">
          <Label className="text-xs text-slate-500">選択肢</Label>
          {(block.variableOptions ?? []).map((opt, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input
                value={opt.label}
                onChange={(e) => updateOption(i, 'label', e.target.value)}
                placeholder="選択肢ラベル"
                className="flex-1 text-sm"
              />
              <button onClick={() => removeOption(i)} className="rounded p-1 text-slate-400 hover:text-red-500">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addOption} className="text-xs">
            <Plus className="mr-1 h-3 w-3" /> 選択肢追加
          </Button>
        </div>
      )}
    </div>
  )
}

/** 表ブロックエディタ */
function TableBlockEditor({ block, onChange }: BlockEditorProps) {
  const rows = block.tableRows ?? 2
  const cols = block.tableCols ?? 3
  const headers = block.tableHeaders ?? Array(cols).fill('')
  const cells = block.tableCells ?? Array(rows).fill(null).map(() => Array(cols).fill(''))

  const resizeTable = (newRows: number, newCols: number) => {
    const newHeaders = Array(newCols).fill('').map((_, c) => headers[c] ?? '')
    const newCells = Array(newRows).fill(null).map((_, r) =>
      Array(newCols).fill('').map((_, c) => cells[r]?.[c] ?? '')
    )
    onChange({ ...block, tableRows: newRows, tableCols: newCols, tableHeaders: newHeaders, tableCells: newCells })
  }

  const updateHeader = (col: number, val: string) => {
    const h = [...headers]
    h[col] = val
    onChange({ ...block, tableHeaders: h })
  }

  const updateCell = (row: number, col: number, val: string) => {
    const c = cells.map((r) => [...r])
    c[row][col] = val
    onChange({ ...block, tableCells: c })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Label className="text-xs text-slate-500">行数</Label>
          <input
            type="number"
            min={1}
            max={20}
            value={rows}
            onChange={(e) => resizeTable(Math.max(1, Number(e.target.value)), cols)}
            className="w-14 rounded border border-slate-300 px-2 py-1 text-center text-sm"
          />
        </div>
        <div className="flex items-center gap-1">
          <Label className="text-xs text-slate-500">列数</Label>
          <input
            type="number"
            min={1}
            max={10}
            value={cols}
            onChange={(e) => resizeTable(rows, Math.max(1, Number(e.target.value)))}
            className="w-14 rounded border border-slate-300 px-2 py-1 text-center text-sm"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {headers.map((h, c) => (
                <th key={c} className="border border-slate-300 bg-slate-100 p-0">
                  <input
                    value={h}
                    onChange={(e) => updateHeader(c, e.target.value)}
                    className="w-full bg-transparent px-2 py-1.5 text-center font-semibold focus:outline-none"
                    placeholder={`列${c + 1}`}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className="border border-slate-300 p-0">
                    <input
                      value={cell}
                      onChange={(e) => updateCell(r, c, e.target.value)}
                      className="w-full bg-transparent px-2 py-1.5 text-center focus:outline-none"
                      placeholder="..."
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">{'セルに {{変数名}} を記入すると変数として扱われます'}</p>
    </div>
  )
}

/** 印影ブロックエディタ */
function SealBlockEditor({ block, onChange, seals }: BlockEditorProps) {
  const selectedSeal = block.sealId ? seals.find((s) => s.id === block.sealId) : null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Label className="text-xs text-slate-500">印影を選択</Label>
          <select
            className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            value={block.sealId ?? ''}
            onChange={(e) => onChange({ ...block, sealId: e.target.value })}
          >
            <option value="">-- 印影を選択 --</option>
            {seals.map((s) => (
              <option key={s.id} value={s.id}>{s.name}（{s.type === 'round' ? '丸印' : s.type === 'square' ? '角印' : '認印'}）</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs text-slate-500">配置</Label>
          <div className="mt-1">
            <AlignButtons align={block.sealPosition ?? 'right'} onChange={(p) => onChange({ ...block, sealPosition: p })} />
          </div>
        </div>
      </div>
      {selectedSeal && (
        <div className={`flex ${block.sealPosition === 'center' ? 'justify-center' : block.sealPosition === 'left' ? 'justify-start' : 'justify-end'}`}>
          <SealPreview seal={selectedSeal} size={80} />
        </div>
      )}
    </div>
  )
}

/** 署名欄ブロックエディタ */
function SignatureBlockEditor({ block, onChange }: BlockEditorProps) {
  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs text-slate-500">会社名</Label>
        <Input value={block.companyName ?? ''} onChange={(e) => onChange({ ...block, companyName: e.target.value })} placeholder="株式会社○○" className="mt-1" />
      </div>
      <div>
        <Label className="text-xs text-slate-500">役職</Label>
        <Input value={block.representativeTitle ?? ''} onChange={(e) => onChange({ ...block, representativeTitle: e.target.value })} placeholder="代表取締役" className="mt-1" />
      </div>
      <div>
        <Label className="text-xs text-slate-500">代表者名</Label>
        <Input value={block.representativeName ?? ''} onChange={(e) => onChange({ ...block, representativeName: e.target.value })} placeholder="○○ ○○" className="mt-1" />
      </div>
    </div>
  )
}

/** 区切り線ブロックエディタ */
function DividerBlockEditor({ block, onChange }: BlockEditorProps) {
  return (
    <div className="flex items-center gap-3">
      <div>
        <Label className="text-xs text-slate-500">スタイル</Label>
        <select
          className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm"
          value={block.dividerStyle ?? 'solid'}
          onChange={(e) => onChange({ ...block, dividerStyle: e.target.value as TemplateBlock['dividerStyle'] })}
        >
          <option value="solid">実線</option>
          <option value="dashed">破線</option>
          <option value="dotted">点線</option>
        </select>
      </div>
      <div>
        <Label className="text-xs text-slate-500">太さ</Label>
        <input
          type="number"
          min={1}
          max={5}
          value={block.dividerThickness ?? 1}
          onChange={(e) => onChange({ ...block, dividerThickness: Number(e.target.value) })}
          className="mt-1 w-16 rounded border border-slate-300 px-2 py-1.5 text-center text-sm"
        />
      </div>
      <div className="mt-5 flex-1">
        <hr style={{ borderStyle: block.dividerStyle ?? 'solid', borderWidth: `${block.dividerThickness ?? 1}px 0 0 0`, borderColor: '#94a3b8' }} />
      </div>
    </div>
  )
}

/** 余白ブロックエディタ */
function SpacerBlockEditor({ block, onChange }: BlockEditorProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-slate-500">高さ</Label>
      <input type="range" min={2} max={50} value={block.spacerHeight ?? 10} onChange={(e) => onChange({ ...block, spacerHeight: Number(e.target.value) })} className="flex-1" />
      <span className="w-14 text-right text-sm text-slate-600">{block.spacerHeight ?? 10}mm</span>
    </div>
  )
}

/** 注意書きブロックエディタ */
function NoticeBlockEditor({ block, onChange }: BlockEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-slate-500">スタイル</Label>
        <select
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          value={block.noticeStyle ?? 'bordered'}
          onChange={(e) => onChange({ ...block, noticeStyle: e.target.value as TemplateBlock['noticeStyle'] })}
        >
          <option value="bordered">枠囲み</option>
          <option value="info">情報</option>
          <option value="warning">警告</option>
        </select>
      </div>
      <textarea
        value={block.content ?? ''}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        placeholder="注意書きテキスト..."
        rows={2}
        className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </div>
  )
}

/** 日付行ブロックエディタ */
function DateLineBlockEditor({ block, onChange }: BlockEditorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-slate-500">日付テキスト</Label>
      <Input value={block.content ?? ''} onChange={(e) => onChange({ ...block, content: e.target.value })} placeholder="令和○年○月○日 or {{issue_date}}" className="mt-1" />
      <p className="text-xs text-slate-400">{'{{変数名}} を使うと文書作成時に値を入力できます'}</p>
    </div>
  )
}

/** 画像プレースホルダーブロックエディタ */
function ImageBlockEditor({ block, onChange }: BlockEditorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-slate-500">画像の説明</Label>
      <Input value={block.content ?? ''} onChange={(e) => onChange({ ...block, content: e.target.value })} placeholder="会社ロゴ、地図など" className="mt-1" />
      <AlignButtons align={block.align ?? 'center'} onChange={(align) => onChange({ ...block, align })} />
    </div>
  )
}

/** 宛名ブロックエディタ */
function AddressBlockEditor({ block, onChange }: BlockEditorProps) {
  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs text-slate-500">会社名</Label>
        <Input value={block.addressCompany ?? ''} onChange={(e) => onChange({ ...block, addressCompany: e.target.value })} placeholder="株式会社○○ or {{client_name}}" className="mt-1" />
      </div>
      <div>
        <Label className="text-xs text-slate-500">部署名</Label>
        <Input value={block.addressDepartment ?? ''} onChange={(e) => onChange({ ...block, addressDepartment: e.target.value })} placeholder="営業部（省略可）" className="mt-1" />
      </div>
      <div>
        <Label className="text-xs text-slate-500">氏名</Label>
        <Input value={block.addressName ?? ''} onChange={(e) => onChange({ ...block, addressName: e.target.value })} placeholder="○○ ○○（省略可）" className="mt-1" />
      </div>
      <div>
        <Label className="text-xs text-slate-500">敬称</Label>
        <select
          className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm"
          value={block.addressSuffix ?? '御中'}
          onChange={(e) => onChange({ ...block, addressSuffix: e.target.value as TemplateBlock['addressSuffix'] })}
        >
          <option value="御中">御中</option>
          <option value="様">様</option>
          <option value="殿">殿</option>
        </select>
      </div>
    </div>
  )
}

/** 改ページブロックエディタ */
function PageBreakBlockEditor() {
  return (
    <div className="py-1 text-center text-xs text-slate-400">
      --- 改ページ ---（この位置で改ページされます）
    </div>
  )
}

// ============================================================
// ブロックエディタディスパッチ
// ============================================================

function BlockEditorDispatch({ block, onChange, seals }: BlockEditorProps) {
  switch (block.type) {
    case 'heading': return <HeadingBlockEditor block={block} onChange={onChange} seals={seals} />
    case 'paragraph': return <ParagraphBlockEditor block={block} onChange={onChange} seals={seals} />
    case 'variable_line': return <VariableLineBlockEditor block={block} onChange={onChange} seals={seals} />
    case 'table': return <TableBlockEditor block={block} onChange={onChange} seals={seals} />
    case 'seal': return <SealBlockEditor block={block} onChange={onChange} seals={seals} />
    case 'signature': return <SignatureBlockEditor block={block} onChange={onChange} seals={seals} />
    case 'divider': return <DividerBlockEditor block={block} onChange={onChange} seals={seals} />
    case 'spacer': return <SpacerBlockEditor block={block} onChange={onChange} seals={seals} />
    case 'page_break': return <PageBreakBlockEditor />
    case 'notice': return <NoticeBlockEditor block={block} onChange={onChange} seals={seals} />
    case 'image': return <ImageBlockEditor block={block} onChange={onChange} seals={seals} />
    case 'date_line': return <DateLineBlockEditor block={block} onChange={onChange} seals={seals} />
    case 'address_block': return <AddressBlockEditor block={block} onChange={onChange} seals={seals} />
    default: return <div className="text-xs text-slate-400">未対応のブロックタイプ</div>
  }
}

/** ブロックタイプのラベルを取得 */
function getBlockTypeLabel(type: TemplateBlockType): string {
  return BLOCK_TYPES.find((bt) => bt.type === type)?.label ?? type
}

/** ブロックタイプのアイコンを取得 */
function getBlockTypeIcon(type: TemplateBlockType): React.ReactNode {
  return BLOCK_TYPES.find((bt) => bt.type === type)?.icon ?? <FileText className="h-4 w-4" />
}

// ============================================================
// A4プレビューパネル
// ============================================================

/** 変数プレースホルダーをハイライト表示 */
function RenderText({ text }: { text: string }) {
  if (!text) return null
  const parts = text.split(/({{[^}]+}})/)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('{{') && part.endsWith('}}')) {
          return (
            <span key={i} className="rounded bg-amber-100 px-0.5 font-mono text-[8px] text-amber-700">
              {part}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

/** A4プレビューの各ブロックレンダラ */
function A4BlockPreview({ block, seals }: { block: TemplateBlock; seals: LocalSeal[] }) {
  const alignClass = block.align === 'center' ? 'text-center' : block.align === 'right' ? 'text-right' : 'text-left'

  switch (block.type) {
    case 'heading': {
      const sizes = { 1: 'text-[14px]', 2: 'text-[12px]', 3: 'text-[10px]', 4: 'text-[9px]' }
      const sizeClass = sizes[(block.level ?? 1) as keyof typeof sizes] ?? 'text-[14px]'
      return (
        <div className={`${alignClass} ${sizeClass} font-bold`} style={{ letterSpacing: `${(block.letterSpacing ?? 0) * 0.5}px` }}>
          <RenderText text={block.content ?? ''} />
        </div>
      )
    }
    case 'paragraph':
      return (
        <div
          className={`${alignClass} text-[8px] leading-relaxed`}
          style={{
            fontWeight: block.bold ? 'bold' : 'normal',
            fontStyle: block.italic ? 'italic' : 'normal',
            textDecoration: block.underline ? 'underline' : 'none',
            lineHeight: block.lineHeight ?? 1.8,
          }}
        >
          {(block.content ?? '').split('\n').map((line, i) => (
            <div key={i}>{line ? <RenderText text={line} /> : '\u00A0'}</div>
          ))}
        </div>
      )
    case 'variable_line':
      return (
        <div className="text-[8px]">
          {block.variableLabel || 'ラベル'}: <span className="rounded bg-amber-100 px-0.5 font-mono text-amber-700">{`{{${block.variableKey || 'key'}}}`}</span>
        </div>
      )
    case 'table': {
      const headers = block.tableHeaders ?? []
      const cells = block.tableCells ?? []
      return (
        <table className="w-full border-collapse text-[7px]">
          {headers.length > 0 && (
            <thead>
              <tr>
                {headers.map((h, c) => (
                  <th key={c} className="border border-slate-400 bg-slate-100 px-1 py-0.5 text-center font-semibold">
                    <RenderText text={h} />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {cells.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className="border border-slate-400 px-1 py-0.5 text-center">
                    <RenderText text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    case 'seal': {
      const seal = block.sealId ? seals.find((s) => s.id === block.sealId) : null
      const posClass = block.sealPosition === 'center' ? 'justify-center' : block.sealPosition === 'left' ? 'justify-start' : 'justify-end'
      return (
        <div className={`flex ${posClass}`}>
          {seal ? (
            <SealPreview seal={seal} size={40} />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-slate-300 text-[6px] text-slate-400">印</div>
          )}
        </div>
      )
    }
    case 'signature':
      return (
        <div className="text-right text-[8px]">
          <div>{block.companyName || '会社名'}</div>
          <div>{block.representativeTitle || '代表取締役'}</div>
          <div className="mt-0.5">{block.representativeName || '○○ ○○'}</div>
        </div>
      )
    case 'divider':
      return <hr className="my-1" style={{ borderStyle: block.dividerStyle ?? 'solid', borderWidth: `${Math.max(1, (block.dividerThickness ?? 1) * 0.5)}px 0 0 0`, borderColor: '#64748b' }} />
    case 'spacer':
      return <div style={{ height: `${(block.spacerHeight ?? 10) * 0.8}px` }} />
    case 'page_break':
      return <div className="my-1 border-t-2 border-dashed border-slate-300 text-center text-[6px] text-slate-400">--- 改ページ ---</div>
    case 'notice': {
      const borderColor = block.noticeStyle === 'warning' ? 'border-amber-400 bg-amber-50' : block.noticeStyle === 'info' ? 'border-blue-400 bg-blue-50' : 'border-slate-400'
      return (
        <div className={`rounded border ${borderColor} p-1.5 text-[7px]`}>
          {(block.content ?? '').split('\n').map((line, i) => (
            <div key={i}><RenderText text={line} /></div>
          ))}
        </div>
      )
    }
    case 'image':
      return (
        <div className={alignClass}>
          <div className="inline-flex h-12 w-20 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-[6px] text-slate-400">
            {block.content || '画像'}
          </div>
        </div>
      )
    case 'date_line':
      return (
        <div className="text-right text-[8px]">
          <RenderText text={block.content ?? '令和○年○月○日'} />
        </div>
      )
    case 'address_block':
      return (
        <div className="text-[8px]">
          <div className="text-[10px] font-bold">
            <RenderText text={block.addressCompany || '会社名'} /> {block.addressSuffix ?? '御中'}
          </div>
          {block.addressDepartment && <div><RenderText text={block.addressDepartment} /></div>}
          {block.addressName && <div><RenderText text={block.addressName} /> {block.addressSuffix === '御中' ? '' : block.addressSuffix}</div>}
        </div>
      )
    default:
      return <div className="text-[7px] text-slate-400">[{block.type}]</div>
  }
}

function A4Preview({ blocks, seals }: { blocks: TemplateBlock[]; seals: LocalSeal[] }) {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-2 text-xs font-medium text-slate-500">A4プレビュー</div>
      <div
        className="w-full bg-white shadow-lg"
        style={{
          aspectRatio: '210/297',
          maxWidth: '100%',
          padding: '6% 8%',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        <div className="space-y-1">
          {blocks
            .sort((a, b) => a.order - b.order)
            .map((block) => (
              <A4BlockPreview key={block.id} block={block} seals={seals} />
            ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// メインエディタページ
// ============================================================

export default function TemplateEditPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string

  // ステート
  const [template, setTemplate] = useState<LocalTemplate | null>(null)
  const [blocks, setBlocks] = useState<TemplateBlock[]>([])
  const [seals, setSeals] = useState<LocalSeal[]>([])
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateDocType, setTemplateDocType] = useState('employment_cert')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // ドラッグ&ドロップ用
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // 初期データ読み込み
  useEffect(() => {
    const tpl = getTemplate(templateId)
    if (tpl) {
      setTemplate(tpl)
      setBlocks(tpl.blocks ?? [])
      setTemplateName(tpl.name)
      setTemplateDescription(tpl.description)
      setTemplateDocType(tpl.document_type)
    }
    setSeals(getSeals())
    setLoaded(true)
  }, [templateId])

  // ブロック操作
  const addBlock = useCallback((type: TemplateBlockType) => {
    const maxOrder = blocks.length > 0 ? Math.max(...blocks.map((b) => b.order)) : -1
    const newBlock = createDefaultBlock(type, maxOrder + 1)
    setBlocks((prev) => [...prev, newBlock])
  }, [blocks])

  const updateBlock = useCallback((id: string, updated: TemplateBlock) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? updated : b)))
  }, [])

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const filtered = prev.filter((b) => b.id !== id)
      return filtered.map((b, i) => ({ ...b, order: i }))
    })
  }, [])

  const duplicateBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id)
      if (idx < 0) return prev
      const source = prev[idx]
      const clone: TemplateBlock = { ...source, id: generateBlockId(), order: source.order + 0.5 }
      return [...prev, clone].sort((a, b) => a.order - b.order).map((b, i) => ({ ...b, order: i }))
    })
  }, [])

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex((b) => b.id === id)
      if (idx < 0) return prev
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev
      const temp = sorted[idx].order
      sorted[idx] = { ...sorted[idx], order: sorted[swapIdx].order }
      sorted[swapIdx] = { ...sorted[swapIdx], order: temp }
      return sorted
    })
  }, [])

  // ドラッグ&ドロップ
  const handleDragStart = useCallback((idx: number) => {
    setDragIndex(idx)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setDragOverIndex(idx)
  }, [])

  const handleDrop = useCallback((dropIdx: number) => {
    if (dragIndex === null || dragIndex === dropIdx) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    setBlocks((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const [moved] = sorted.splice(dragIndex, 1)
      sorted.splice(dropIdx, 0, moved)
      return sorted.map((b, i) => ({ ...b, order: i }))
    })
    setDragIndex(null)
    setDragOverIndex(null)
  }, [dragIndex])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDragOverIndex(null)
  }, [])

  // 変数抽出
  const extractVariables = useCallback((bls: TemplateBlock[]) => {
    const vars: LocalTemplate['variables'] = []
    const seen = new Set<string>()
    for (const b of bls) {
      if (b.type === 'variable_line' && b.variableKey && !seen.has(b.variableKey)) {
        seen.add(b.variableKey)
        vars.push({
          key: b.variableKey,
          label: b.variableLabel ?? b.variableKey,
          type: b.variableType ?? 'text',
          required: b.variableRequired ?? false,
          options: b.variableOptions,
        })
      }
    }
    return vars
  }, [])

  // body_templateをブロックから再構築
  const buildBodyTemplate = useCallback((bls: TemplateBlock[]) => {
    const sorted = [...bls].sort((a, b) => a.order - b.order)
    const lines: string[] = []
    for (const b of sorted) {
      switch (b.type) {
        case 'heading': lines.push(b.content ?? '', ''); break
        case 'paragraph': lines.push(b.content ?? '', ''); break
        case 'variable_line': lines.push(`${b.variableLabel ?? ''}: {{${b.variableKey ?? ''}}}`); break
        case 'date_line': lines.push(b.content ?? ''); break
        case 'address_block': lines.push(`${b.addressCompany ?? ''} ${b.addressSuffix ?? ''}`); break
        case 'signature': lines.push('', b.companyName ?? '', `${b.representativeTitle ?? ''} ${b.representativeName ?? ''}`); break
        case 'notice': lines.push(b.content ?? ''); break
        default: break
      }
    }
    return lines.join('\n')
  }, [])

  // 保存
  const handleSave = useCallback(async () => {
    if (!template) return
    setSaving(true)
    try {
      const variables = extractVariables(blocks)
      const body_template = buildBodyTemplate(blocks)
      const updated: LocalTemplate = {
        ...template,
        name: templateName,
        description: templateDescription,
        document_type: templateDocType,
        variables,
        body_template,
        blocks: blocks.sort((a, b) => a.order - b.order).map((b, i) => ({ ...b, order: i })),
      }
      saveTemplate(updated)
      setTemplate(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }, [template, blocks, templateName, templateDescription, templateDocType, extractVariables, buildBodyTemplate])

  // ソート済みブロック
  const sortedBlocks = useMemo(() => [...blocks].sort((a, b) => a.order - b.order), [blocks])

  // 変数数
  const variableCount = useMemo(() => {
    const keys = new Set<string>()
    for (const b of blocks) {
      if (b.type === 'variable_line' && b.variableKey) {
        keys.add(b.variableKey)
      }
    }
    return keys.size
  }, [blocks])

  // ローディング
  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-sm text-slate-500">テンプレートが見つかりません</p>
        <Button asChild variant="outline">
          <Link href="/templates"><ChevronLeft className="mr-1 h-4 w-4" />テンプレート一覧へ戻る</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/templates" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ChevronLeft className="h-4 w-4" />
            一覧
          </Link>
          <div className="h-5 w-px bg-slate-300" />
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="h-8 w-60 border-transparent bg-transparent text-base font-bold hover:border-slate-300 focus:border-blue-400"
          />
          <Badge variant="secondary" className="text-xs">v{template.version}</Badge>
          <Badge variant="outline" className="text-xs">{blocks.length}ブロック</Badge>
          <Badge variant="outline" className="text-xs">{variableCount}変数</Badge>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm text-green-600">保存しました</span>}
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {/* テンプレート基本情報バー */}
      <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-slate-500">文書種別</Label>
          <select
            className="rounded border border-slate-300 px-2 py-1 text-xs"
            value={templateDocType}
            onChange={(e) => setTemplateDocType(e.target.value)}
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
        <div className="flex flex-1 items-center gap-2">
          <Label className="text-xs text-slate-500">説明</Label>
          <Input
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            className="h-7 flex-1 text-xs"
            placeholder="テンプレートの説明..."
          />
        </div>
      </div>

      {/* 3パネルレイアウト */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左パネル: ブロックパレット */}
        <div className="w-40 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-2">
          <div className="mb-2 text-xs font-semibold text-slate-500">ブロック追加</div>
          <div className="space-y-1">
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.type}
                onClick={() => addBlock(bt.type)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-white hover:shadow-sm"
                title={bt.description}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded bg-white text-slate-500 shadow-sm">
                  {bt.icon}
                </span>
                <span>{bt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 中央パネル: メイン編集エリア */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
          <div className="mx-auto max-w-2xl space-y-2">
            {sortedBlocks.map((block, idx) => (
              <div
                key={block.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={handleDragEnd}
                className={`group rounded-lg border bg-white shadow-sm transition-all ${
                  dragOverIndex === idx && dragIndex !== idx
                    ? 'border-blue-400 ring-2 ring-blue-100'
                    : dragIndex === idx
                    ? 'border-blue-300 opacity-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* ブロックヘッダー */}
                <div className="flex items-center gap-1 border-b border-slate-100 px-2 py-1.5">
                  <span className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing" title="ドラッグで移動">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    {getBlockTypeIcon(block.type)}
                    {getBlockTypeLabel(block.type)}
                  </span>
                  <div className="flex-1" />
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => moveBlock(block.id, 'up')}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="上へ移動"
                      disabled={idx === 0}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => moveBlock(block.id, 'down')}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="下へ移動"
                      disabled={idx === sortedBlocks.length - 1}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => duplicateBlock(block.id)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="複製"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeBlock(block.id)}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      title="削除"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {/* ブロックエディタ本体 */}
                <div className="px-3 py-2.5">
                  <BlockEditorDispatch
                    block={block}
                    onChange={(updated) => updateBlock(block.id, updated)}
                    seals={seals}
                  />
                </div>
              </div>
            ))}

            {/* ブロック追加ボタン */}
            {blocks.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-8 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">左のパレットからブロックを追加してください</p>
              </div>
            ) : (
              <button
                onClick={() => addBlock('paragraph')}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 py-3 text-sm text-slate-400 transition-colors hover:border-blue-300 hover:text-blue-500"
              >
                <Plus className="h-4 w-4" />
                ブロックを追加
              </button>
            )}
          </div>
        </div>

        {/* 右パネル: A4プレビュー */}
        <div className="w-[35%] shrink-0 overflow-y-auto border-l border-slate-200 bg-slate-100 p-4">
          <A4Preview blocks={sortedBlocks} seals={seals} />
        </div>
      </div>

      {/* フッター */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2.5">
        <Button asChild variant="outline" size="sm">
          <Link href="/templates">
            <ChevronLeft className="mr-1 h-4 w-4" />
            テンプレート一覧へ戻る
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  )
}
