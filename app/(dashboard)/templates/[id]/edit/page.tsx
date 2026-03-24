'use client'

/**
 * テンプレートエディタページ
 * Word/Google Docs レベルのリッチ文書テンプレート編集機能を提供する
 * 3パネル構成: ブロックパレット | メイン編集エリア | A4プレビュー
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  ChevronDown,
  ChevronRight,
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
  List,
  Columns,
  LayoutGrid,
  Indent,
  Outdent,
  Palette,
  Undo2,
  Redo2,
  Keyboard,
  Trash2,
} from 'lucide-react'

// ============================================================
// Google Fonts 定義
// ============================================================

/** 利用可能なフォント定義 */
interface FontOption {
  value: string
  label: string
  css: string
}

const FONT_OPTIONS: FontOption[] = [
  { value: 'Noto Sans JP', label: 'ゴシック体', css: "'Noto Sans JP', sans-serif" },
  { value: 'Noto Serif JP', label: '明朝体', css: "'Noto Serif JP', serif" },
  { value: 'Sawarabi Mincho', label: 'さわらび明朝', css: "'Sawarabi Mincho', serif" },
  { value: 'M PLUS 1p', label: 'Mプラス', css: "'M PLUS 1p', sans-serif" },
  { value: 'Kosugi Maru', label: '小杉丸ゴシック', css: "'Kosugi Maru', sans-serif" },
  { value: 'Zen Maru Gothic', label: 'ゼンマルゴシック', css: "'Zen Maru Gothic', sans-serif" },
  { value: 'Zen Kaku Gothic New', label: 'ゼン角ゴシック', css: "'Zen Kaku Gothic New', sans-serif" },
  { value: 'Shippori Mincho', label: 'しっぽり明朝', css: "'Shippori Mincho', serif" },
  { value: 'Shippori Mincho B1', label: 'しっぽり明朝B1', css: "'Shippori Mincho B1', serif" },
  { value: 'Klee One', label: 'クレー', css: "'Klee One', cursive" },
  { value: 'Hina Mincho', label: 'ひな明朝', css: "'Hina Mincho', serif" },
  { value: 'Dela Gothic One', label: 'デラゴシック', css: "'Dela Gothic One', cursive" },
  { value: 'RocknRoll One', label: 'ロックンロール', css: "'RocknRoll One', sans-serif" },
  { value: 'Reggae One', label: 'レゲエ', css: "'Reggae One', cursive" },
  { value: 'DotGothic16', label: 'ドットゴシック', css: "'DotGothic16', sans-serif" },
  { value: 'Kaisei Decol', label: '解星デコール', css: "'Kaisei Decol', serif" },
  { value: 'Kaisei Tokumin', label: '解星特ミン', css: "'Kaisei Tokumin', serif" },
  { value: 'Zen Old Mincho', label: 'ゼン旧明朝', css: "'Zen Old Mincho', serif" },
  { value: 'monospace', label: '等幅', css: "'Courier New', monospace" },
]

/** Google Fonts のインポート URL */
const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Noto+Serif+JP:wght@400;700&family=Sawarabi+Mincho&family=M+PLUS+1p:wght@400;700&family=Kosugi+Maru&family=Zen+Maru+Gothic:wght@400;700&family=Zen+Kaku+Gothic+New:wght@400;700&family=Shippori+Mincho:wght@400;700&family=Shippori+Mincho+B1:wght@400;700&family=Klee+One:wght@400;700&family=Hina+Mincho&family=Dela+Gothic+One&family=RocknRoll+One&family=Reggae+One&family=DotGothic16&family=Kaisei+Decol:wght@400;700&family=Kaisei+Tokumin:wght@400;700&family=Zen+Old+Mincho:wght@400;700&display=swap'

/** フォントファミリー値からCSS値を取得 */
function getFontCss(fontFamily: string | undefined): string {
  if (!fontFamily) return "'Noto Sans JP', sans-serif"
  const found = FONT_OPTIONS.find((f) => f.value === fontFamily)
  return found ? found.css : "'Noto Sans JP', sans-serif"
}

/** 行間プリセット */
const LINE_HEIGHT_OPTIONS = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0]

// ============================================================
// ブロック種別の定義情報（カテゴリ付き）
// ============================================================

interface BlockTypeInfo {
  type: TemplateBlockType
  label: string
  icon: React.ReactNode
  description: string
  category: string
}

/** ブロックパレット用の定義（カテゴリ分類） */
const BLOCK_TYPES: BlockTypeInfo[] = [
  // テキスト
  { type: 'heading', label: '見出し', icon: <Heading1 className="h-4 w-4" />, description: 'H1-H4、文字間隔調整', category: 'テキスト' },
  { type: 'paragraph', label: '本文', icon: <Type className="h-4 w-4" />, description: 'リッチテキスト', category: 'テキスト' },
  { type: 'list', label: 'リスト', icon: <List className="h-4 w-4" />, description: '箇条書き・番号付き', category: 'テキスト' },
  { type: 'notice', label: '注意書き', icon: <AlertTriangle className="h-4 w-4" />, description: '枠付きテキスト', category: 'テキスト' },
  // レイアウト
  { type: 'two_column', label: '2カラム', icon: <Columns className="h-4 w-4" />, description: '左右分割レイアウト', category: 'レイアウト' },
  { type: 'horizontal_items', label: '横並び項目', icon: <LayoutGrid className="h-4 w-4" />, description: 'キー:値ペア', category: 'レイアウト' },
  { type: 'divider', label: '区切線', icon: <Minus className="h-4 w-4" />, description: '線のスタイル', category: 'レイアウト' },
  { type: 'spacer', label: '余白', icon: <Space className="h-4 w-4" />, description: '高さ(mm)指定', category: 'レイアウト' },
  { type: 'page_break', label: '改ページ', icon: <Scissors className="h-4 w-4" />, description: 'ページ区切り', category: 'レイアウト' },
  // データ
  { type: 'variable_line', label: '変数行', icon: <Variable className="h-4 w-4" />, description: 'ラベル: {{変数}}', category: 'データ' },
  { type: 'table', label: '表', icon: <Table className="h-4 w-4" />, description: '行×列の表', category: 'データ' },
  { type: 'date_line', label: '日付行', icon: <Calendar className="h-4 w-4" />, description: '右寄せ日付', category: 'データ' },
  { type: 'address_block', label: '宛名', icon: <Building2 className="h-4 w-4" />, description: '宛名ブロック', category: 'データ' },
  // 署名・印
  { type: 'signature', label: '署名欄', icon: <PenLine className="h-4 w-4" />, description: '会社名・代表者', category: '署名・印' },
  { type: 'seal', label: '印影', icon: <Stamp className="h-4 w-4" />, description: '印影を配置', category: '署名・印' },
  { type: 'image', label: '画像', icon: <Image className="h-4 w-4" />, description: 'プレースホルダー', category: '署名・印' },
]

/** カテゴリ一覧（順序保持） */
const BLOCK_CATEGORIES = ['テキスト', 'レイアウト', 'データ', '署名・印']

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
    case 'list':
      return { ...base, listType: 'bullet', listItems: ['項目1', '項目2', '項目3'] }
    case 'two_column':
      return { ...base, columnRatio: '50-50', columnLeftContent: '', columnRightContent: '' }
    case 'horizontal_items':
      return { ...base, horizontalItems: [{ label: '項目名', value: '{{value}}' }] }
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

/** フォント選択ドロップダウン（フォントプレビュー付き） */
function FontFamilySelect({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  return (
    <select
      className="rounded border border-slate-300 px-1.5 py-1 text-xs"
      value={value ?? 'Noto Sans JP'}
      onChange={(e) => onChange(e.target.value)}
      title="フォント"
    >
      {FONT_OPTIONS.map((f) => (
        <option key={f.value} value={f.value} style={{ fontFamily: f.css }}>
          {f.label}（{f.value}）
        </option>
      ))}
    </select>
  )
}

/** フォントサイズプリセット値 */
const FONT_SIZE_PRESETS = [6, 7, 8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 120]

/** フォントサイズ入力（ドロップダウン + カスタム入力のコンボボックス） */
function FontSizeInput({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  const [isCustom, setIsCustom] = useState(false)
  const currentVal = value ?? 12
  const isPreset = FONT_SIZE_PRESETS.includes(currentVal)

  return (
    <div className="flex items-center gap-0.5">
      {/* プリセットドロップダウン */}
      <select
        className="w-16 rounded-l border border-slate-300 px-1 py-1 text-xs"
        value={isPreset && !isCustom ? String(currentVal) : '__custom__'}
        onChange={(e) => {
          if (e.target.value === '__custom__') {
            setIsCustom(true)
          } else {
            setIsCustom(false)
            onChange(Number(e.target.value))
          }
        }}
        title="フォントサイズ (pt)"
      >
        {FONT_SIZE_PRESETS.map((s) => (
          <option key={s} value={String(s)}>{s}pt</option>
        ))}
        <option value="__custom__">カスタム...</option>
      </select>
      {/* カスタム値入力（プリセット外の値またはカスタムモード時に表示） */}
      {(isCustom || !isPreset) && (
        <input
          type="number"
          min={1}
          max={200}
          step={0.5}
          value={currentVal}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (n >= 1 && n <= 200) onChange(n)
          }}
          className="w-14 rounded-r border border-l-0 border-slate-300 px-1 py-1 text-center text-xs"
          title="カスタムフォントサイズ (pt)"
        />
      )}
    </div>
  )
}

/** 行間セレクタ */
function LineHeightSelect({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  return (
    <select
      className="rounded border border-slate-300 px-1.5 py-1 text-xs"
      value={value ?? 1.6}
      onChange={(e) => onChange(Number(e.target.value))}
      title="行間"
    >
      {LINE_HEIGHT_OPTIONS.map((lh) => (
        <option key={lh} value={lh}>行間 {lh.toFixed(1)}</option>
      ))}
    </select>
  )
}

/** 文字間隔入力（0-20px） */
function LetterSpacingInput({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-slate-400">字間</span>
      <input
        type="number"
        min={0}
        max={20}
        step={1}
        value={value ?? 0}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (n >= 0 && n <= 20) onChange(n)
        }}
        className="w-12 rounded border border-slate-300 px-1 py-1 text-center text-xs"
        title="文字間隔 (px)"
      />
    </div>
  )
}

/** カラーピッカー（コンパクト） */
function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-slate-500">{label}</span>
      <div className="relative">
        <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-6 h-6" />
        <div className="w-5 h-5 rounded border border-slate-300" style={{ backgroundColor: value || '#000000' }} />
      </div>
    </div>
  )
}

/** インデント制御ボタン */
function IndentControl({ indent, onChange }: { indent: number | undefined; onChange: (v: number) => void }) {
  const current = indent ?? 0
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(0, current - 10))}
        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
        title="インデント減"
        disabled={current <= 0}
      >
        <Outdent className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onChange(Math.min(80, current + 10))}
        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        title="インデント増"
      >
        <Indent className="h-3.5 w-3.5" />
      </button>
      {current > 0 && <span className="text-[10px] text-slate-400">{current}mm</span>}
    </div>
  )
}

/** 詳細設定パネル（パディング・ボーダー） */
function DetailSettings({ block, onChange }: { block: TemplateBlock; onChange: (updated: TemplateBlock) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        詳細設定
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded border border-slate-200 bg-slate-50/50 p-2">
          {/* パディング */}
          <div>
            <span className="text-[10px] font-medium text-slate-500">余白 (mm)</span>
            <div className="mt-1 flex items-center gap-2">
              {(['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'] as const).map((key) => (
                <div key={key} className="flex items-center gap-0.5">
                  <span className="text-[9px] text-slate-400">
                    {key === 'paddingTop' ? '上' : key === 'paddingBottom' ? '下' : key === 'paddingLeft' ? '左' : '右'}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={block[key] ?? 0}
                    onChange={(e) => onChange({ ...block, [key]: Number(e.target.value) })}
                    className="w-10 rounded border border-slate-300 px-1 py-0.5 text-center text-[10px]"
                  />
                </div>
              ))}
            </div>
          </div>
          {/* ボーダー */}
          <div>
            <span className="text-[10px] font-medium text-slate-500">枠線</span>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] text-slate-400">太さ</span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={block.borderWidth ?? 0}
                  onChange={(e) => onChange({ ...block, borderWidth: Number(e.target.value) })}
                  className="w-10 rounded border border-slate-300 px-1 py-0.5 text-center text-[10px]"
                />
              </div>
              <select
                value={block.borderStyle ?? 'none'}
                onChange={(e) => onChange({ ...block, borderStyle: e.target.value as TemplateBlock['borderStyle'] })}
                className="rounded border border-slate-300 px-1 py-0.5 text-[10px]"
              >
                <option value="none">なし</option>
                <option value="solid">実線</option>
                <option value="dashed">破線</option>
                <option value="dotted">点線</option>
              </select>
              <ColorPicker label="色" value={block.borderColor ?? '#000000'} onChange={(v) => onChange({ ...block, borderColor: v })} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** テキストブロック共通のフォントスタイルツールバー */
function FontStyleToolbar({
  block,
  onChange,
  showLetterSpacing,
  showLineHeight,
  showFontSize,
}: {
  block: TemplateBlock
  onChange: (updated: TemplateBlock) => void
  showLetterSpacing?: boolean
  showLineHeight?: boolean
  showFontSize?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <FontFamilySelect value={block.fontFamily} onChange={(fontFamily) => onChange({ ...block, fontFamily })} />
      {showFontSize !== false && (
        <FontSizeInput value={block.fontSize} onChange={(fontSize) => onChange({ ...block, fontSize })} />
      )}
      {showLineHeight !== false && (
        <LineHeightSelect value={block.lineHeight} onChange={(lineHeight) => onChange({ ...block, lineHeight })} />
      )}
      {showLetterSpacing && (
        <LetterSpacingInput value={block.letterSpacing} onChange={(letterSpacing) => onChange({ ...block, letterSpacing })} />
      )}
    </div>
  )
}

/** テキスト色・背景色ツールバー（色対応ブロック用） */
function ColorToolbar({ block, onChange }: { block: TemplateBlock; onChange: (updated: TemplateBlock) => void }) {
  return (
    <div className="flex items-center gap-3">
      <ColorPicker label="文字色" value={block.color ?? '#000000'} onChange={(v) => onChange({ ...block, color: v })} />
      <ColorPicker label="背景色" value={block.backgroundColor ?? '#ffffff'} onChange={(v) => onChange({ ...block, backgroundColor: v })} />
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
      <div className="flex flex-wrap items-center gap-2">
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
      {/* フォント・文字間隔ツールバー */}
      <FontStyleToolbar
        block={block}
        onChange={onChange}
        showLetterSpacing
        showLineHeight={false}
        showFontSize={false}
      />
      {/* 色ツールバー */}
      <ColorToolbar block={block} onChange={onChange} />
      <Input
        value={block.content ?? ''}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        placeholder="見出しテキストを入力"
        className="text-lg font-bold"
        style={{ fontFamily: getFontCss(block.fontFamily), color: block.color }}
      />
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
        <IndentControl indent={block.indent} onChange={(indent) => onChange({ ...block, indent })} />
      </div>
      {/* フォント・サイズ・行間ツールバー */}
      <FontStyleToolbar block={block} onChange={onChange} showLineHeight showFontSize />
      {/* 色ツールバー */}
      <ColorToolbar block={block} onChange={onChange} />
      <textarea
        value={block.content ?? ''}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        placeholder="本文テキストを入力..."
        rows={3}
        className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        style={{
          fontFamily: getFontCss(block.fontFamily),
          fontWeight: block.bold ? 'bold' : 'normal',
          fontStyle: block.italic ? 'italic' : 'normal',
          textDecoration: block.underline ? 'underline' : 'none',
          color: block.color,
          backgroundColor: block.backgroundColor && block.backgroundColor !== '#ffffff' ? block.backgroundColor : undefined,
        }}
      />
      {/* 詳細設定（パディング・ボーダー） */}
      <DetailSettings block={block} onChange={onChange} />
    </div>
  )
}

// 会社情報変数の候補定義（カテゴリ付き）
interface CompanyVarSuggestion {
  key: string
  label: string
  category: string
}

const COMPANY_VAR_SUGGESTIONS: CompanyVarSuggestion[] = [
  { key: 'company_name', label: '会社名', category: '会社情報' },
  { key: 'company_name_kana', label: '会社名フリガナ', category: '会社情報' },
  { key: 'company_name_en', label: '英語名', category: '会社情報' },
  { key: 'company_postal_code', label: '郵便番号', category: '会社情報' },
  { key: 'company_address', label: '住所', category: '会社情報' },
  { key: 'company_address_building', label: '建物名', category: '会社情報' },
  { key: 'company_phone', label: '電話番号', category: '会社情報' },
  { key: 'company_fax', label: 'FAX番号', category: '会社情報' },
  { key: 'company_email', label: 'メールアドレス', category: '会社情報' },
  { key: 'company_website', label: 'Webサイト', category: '会社情報' },
  { key: 'company_representative_name', label: '代表者名', category: '代表者・法人' },
  { key: 'company_representative_title', label: '代表者役職', category: '代表者・法人' },
  { key: 'company_registration_number', label: '法人番号', category: '代表者・法人' },
  { key: 'company_established_date', label: '設立日', category: '代表者・法人' },
  { key: 'company_capital', label: '資本金', category: '代表者・法人' },
  { key: 'company_bank_name', label: '銀行名', category: '振込先' },
  { key: 'company_bank_branch', label: '支店名', category: '振込先' },
  { key: 'company_bank_account_type', label: '口座種別', category: '振込先' },
  { key: 'company_bank_account_number', label: '口座番号', category: '振込先' },
  { key: 'company_bank_account_name', label: '口座名義', category: '振込先' },
]

/** 変数キーのサジェストドロップダウン */
function VariableKeySuggestions({
  currentKey,
  onSelect,
}: {
  currentKey: string
  onSelect: (key: string, label: string) => void
}) {
  const [open, setOpen] = useState(false)
  const filtered = currentKey
    ? COMPANY_VAR_SUGGESTIONS.filter(
        (s) => s.key.includes(currentKey) || s.label.includes(currentKey)
      )
    : COMPANY_VAR_SUGGESTIONS

  const grouped = filtered.reduce<Record<string, CompanyVarSuggestion[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {})

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-1 w-full rounded border border-dashed border-blue-300 bg-blue-50 px-2 py-1 text-left text-xs text-blue-600 hover:bg-blue-100"
      >
        {open ? '候補を閉じる' : '会社情報変数から選択...'}
      </button>
      {open && (
        <div className="absolute left-0 z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="sticky top-0 bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {category}
              </div>
              {items.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-blue-50"
                  onClick={() => {
                    onSelect(s.key, s.label)
                    setOpen(false)
                  }}
                >
                  <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-600">
                    {s.key}
                  </code>
                  <span className="text-slate-700">{s.label}</span>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-400">一致する候補がありません</div>
          )}
        </div>
      )}
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

  const handleSuggestionSelect = (key: string, label: string) => {
    onChange({ ...block, variableKey: key, variableLabel: label })
  }

  return (
    <div className="space-y-3">
      <FontStyleToolbar block={block} onChange={onChange} showFontSize showLineHeight={false} />
      <ColorToolbar block={block} onChange={onChange} />
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
          <VariableKeySuggestions
            currentKey={block.variableKey ?? ''}
            onSelect={handleSuggestionSelect}
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
      {/* 詳細設定（パディング・ボーダー） */}
      <DetailSettings block={block} onChange={onChange} />
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
      <FontStyleToolbar block={block} onChange={onChange} showFontSize showLineHeight />
      <ColorToolbar block={block} onChange={onChange} />
      <textarea
        value={block.content ?? ''}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        placeholder="注意書きテキスト..."
        rows={2}
        className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        style={{ fontFamily: getFontCss(block.fontFamily), color: block.color }}
      />
      <DetailSettings block={block} onChange={onChange} />
    </div>
  )
}

/** 日付行ブロックエディタ */
function DateLineBlockEditor({ block, onChange }: BlockEditorProps) {
  return (
    <div className="space-y-2">
      <FontStyleToolbar block={block} onChange={onChange} showFontSize showLineHeight={false} />
      <Label className="text-xs text-slate-500">日付テキスト</Label>
      <Input
        value={block.content ?? ''}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        placeholder="令和○年○月○日 or {{issue_date}}"
        className="mt-1"
        style={{ fontFamily: getFontCss(block.fontFamily) }}
      />
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
      <FontStyleToolbar block={block} onChange={onChange} showFontSize showLineHeight={false} />
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

/** リストブロックエディタ */
function ListBlockEditor({ block, onChange }: BlockEditorProps) {
  const items = block.listItems ?? []
  const listType = block.listType ?? 'bullet'

  const addItem = () => {
    onChange({ ...block, listItems: [...items, ''] })
  }

  const removeItem = (idx: number) => {
    onChange({ ...block, listItems: items.filter((_, i) => i !== idx) })
  }

  const updateItem = (idx: number, val: string) => {
    const newItems = [...items]
    newItems[idx] = val
    onChange({ ...block, listItems: newItems })
  }

  const moveItem = (idx: number, dir: 'up' | 'down') => {
    const newItems = [...items]
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= newItems.length) return
    const temp = newItems[idx]
    newItems[idx] = newItems[swapIdx]
    newItems[swapIdx] = temp
    onChange({ ...block, listItems: newItems })
  }

  return (
    <div className="space-y-3">
      {/* リスト種別トグル */}
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded border border-slate-300">
          <button
            className={`px-3 py-1.5 text-xs ${listType === 'bullet' ? 'bg-slate-200 font-medium' : 'hover:bg-slate-50'}`}
            onClick={() => onChange({ ...block, listType: 'bullet' })}
          >
            ● 箇条書き
          </button>
          <button
            className={`px-3 py-1.5 text-xs ${listType === 'numbered' ? 'bg-slate-200 font-medium' : 'hover:bg-slate-50'}`}
            onClick={() => onChange({ ...block, listType: 'numbered' })}
          >
            1. 番号付き
          </button>
        </div>
        <IndentControl indent={block.indent} onChange={(indent) => onChange({ ...block, indent })} />
      </div>
      <FontStyleToolbar block={block} onChange={onChange} showFontSize showLineHeight={false} />
      <ColorToolbar block={block} onChange={onChange} />
      {/* リスト項目一覧 */}
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1">
            {/* リスト番号・マーカー表示 */}
            <span className="w-5 text-right text-xs text-slate-400">
              {listType === 'bullet' ? '●' : `${idx + 1}.`}
            </span>
            <Input
              value={item}
              onChange={(e) => updateItem(idx, e.target.value)}
              placeholder="項目テキスト..."
              className="flex-1 h-8 text-sm"
            />
            <button onClick={() => moveItem(idx, 'up')} className="rounded p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30" disabled={idx === 0}>
              <ArrowUp className="h-3 w-3" />
            </button>
            <button onClick={() => moveItem(idx, 'down')} className="rounded p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30" disabled={idx === items.length - 1}>
              <ArrowDown className="h-3 w-3" />
            </button>
            <button onClick={() => removeItem(idx)} className="rounded p-0.5 text-slate-400 hover:text-red-500">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addItem} className="text-xs">
        <Plus className="mr-1 h-3 w-3" /> 項目追加
      </Button>
    </div>
  )
}

/** 2カラムブロックエディタ */
function TwoColumnBlockEditor({ block, onChange }: BlockEditorProps) {
  const ratioOptions = ['50-50', '60-40', '40-60', '70-30', '30-70'] as const
  const ratioLabels: Record<string, string> = {
    '50-50': '50/50',
    '60-40': '60/40',
    '40-60': '40/60',
    '70-30': '70/30',
    '30-70': '30/70',
  }

  return (
    <div className="space-y-3">
      {/* カラム比率選択 */}
      <div className="flex items-center gap-2">
        <Label className="text-xs text-slate-500">比率</Label>
        <div className="inline-flex rounded border border-slate-300">
          {ratioOptions.map((r) => (
            <button
              key={r}
              className={`px-2 py-1 text-[10px] ${(block.columnRatio ?? '50-50') === r ? 'bg-slate-200 font-medium' : 'hover:bg-slate-50'}`}
              onClick={() => onChange({ ...block, columnRatio: r })}
            >
              {ratioLabels[r]}
            </button>
          ))}
        </div>
      </div>
      {/* 左右カラム */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-slate-500">左カラム</Label>
          <textarea
            value={block.columnLeftContent ?? ''}
            onChange={(e) => onChange({ ...block, columnLeftContent: e.target.value })}
            placeholder="左カラムの内容..."
            rows={3}
            className="mt-1 w-full resize-y rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <div>
          <Label className="text-xs text-slate-500">右カラム</Label>
          <textarea
            value={block.columnRightContent ?? ''}
            onChange={(e) => onChange({ ...block, columnRightContent: e.target.value })}
            placeholder="右カラムの内容..."
            rows={3}
            className="mt-1 w-full resize-y rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>
    </div>
  )
}

/** 横並び項目ブロックエディタ */
function HorizontalItemsBlockEditor({ block, onChange }: BlockEditorProps) {
  const items = block.horizontalItems ?? []

  const addItem = () => {
    onChange({ ...block, horizontalItems: [...items, { label: '', value: '' }] })
  }

  const removeItem = (idx: number) => {
    onChange({ ...block, horizontalItems: items.filter((_, i) => i !== idx) })
  }

  const updateItem = (idx: number, field: 'label' | 'value', val: string) => {
    const newItems = [...items]
    newItems[idx] = { ...newItems[idx], [field]: val }
    onChange({ ...block, horizontalItems: newItems })
  }

  return (
    <div className="space-y-3">
      <FontStyleToolbar block={block} onChange={onChange} showFontSize showLineHeight={false} />
      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <Input
              value={item.label}
              onChange={(e) => updateItem(idx, 'label', e.target.value)}
              placeholder="ラベル"
              className="w-28 h-7 text-xs"
            />
            <span className="text-xs text-slate-400">:</span>
            <Input
              value={item.value}
              onChange={(e) => updateItem(idx, 'value', e.target.value)}
              placeholder="値 or {{変数}}"
              className="flex-1 h-7 text-xs font-mono"
            />
            <button onClick={() => removeItem(idx)} className="rounded p-0.5 text-slate-400 hover:text-red-500">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addItem} className="text-xs">
        <Plus className="mr-1 h-3 w-3" /> 項目追加
      </Button>
      <DetailSettings block={block} onChange={onChange} />
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
    case 'list': return <ListBlockEditor block={block} onChange={onChange} seals={seals} />
    case 'two_column': return <TwoColumnBlockEditor block={block} onChange={onChange} seals={seals} />
    case 'horizontal_items': return <HorizontalItemsBlockEditor block={block} onChange={onChange} seals={seals} />
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

/** ブロック共通のスタイルオブジェクトを生成 */
function getBlockStyle(block: TemplateBlock): React.CSSProperties {
  const style: React.CSSProperties = {}
  if (block.color) style.color = block.color
  if (block.backgroundColor && block.backgroundColor !== '#ffffff') style.backgroundColor = block.backgroundColor
  if (block.indent) style.marginLeft = `${block.indent * 0.8}px`
  if (block.paddingTop) style.paddingTop = `${block.paddingTop * 0.8}px`
  if (block.paddingBottom) style.paddingBottom = `${block.paddingBottom * 0.8}px`
  if (block.paddingLeft) style.paddingLeft = `${block.paddingLeft * 0.8}px`
  if (block.paddingRight) style.paddingRight = `${block.paddingRight * 0.8}px`
  if (block.borderWidth && block.borderWidth > 0 && block.borderStyle && block.borderStyle !== 'none') {
    style.border = `${block.borderWidth * 0.5}px ${block.borderStyle} ${block.borderColor ?? '#000000'}`
    style.borderRadius = '2px'
  }
  return style
}

/** A4プレビューの各ブロックレンダラ */
function A4BlockPreview({ block, seals }: { block: TemplateBlock; seals: LocalSeal[] }) {
  const alignClass = block.align === 'center' ? 'text-center' : block.align === 'right' ? 'text-right' : 'text-left'
  const blockStyle = getBlockStyle(block)

  switch (block.type) {
    case 'heading': {
      const sizes = { 1: 'text-[14px]', 2: 'text-[12px]', 3: 'text-[10px]', 4: 'text-[9px]' }
      const sizeClass = sizes[(block.level ?? 1) as keyof typeof sizes] ?? 'text-[14px]'
      return (
        <div
          className={`${alignClass} ${sizeClass} font-bold`}
          style={{
            letterSpacing: `${(block.letterSpacing ?? 0) * 0.5}px`,
            fontFamily: getFontCss(block.fontFamily),
            ...blockStyle,
          }}
        >
          <RenderText text={block.content ?? ''} />
        </div>
      )
    }
    case 'paragraph':
      return (
        <div
          className={`${alignClass} text-[8px] leading-relaxed`}
          style={{
            fontFamily: getFontCss(block.fontFamily),
            fontWeight: block.bold ? 'bold' : 'normal',
            fontStyle: block.italic ? 'italic' : 'normal',
            textDecoration: block.underline ? 'underline' : 'none',
            lineHeight: block.lineHeight ?? 1.8,
            fontSize: block.fontSize ? `${block.fontSize * 0.6}px` : undefined,
            ...blockStyle,
          }}
        >
          {(block.content ?? '').split('\n').map((line, i) => (
            <div key={i}>{line ? <RenderText text={line} /> : '\u00A0'}</div>
          ))}
        </div>
      )
    case 'variable_line':
      return (
        <div className="text-[8px]" style={{ fontFamily: getFontCss(block.fontFamily), fontSize: block.fontSize ? `${block.fontSize * 0.6}px` : undefined, ...blockStyle }}>
          {block.variableLabel || 'ラベル'}: <span className="rounded bg-amber-100 px-0.5 font-mono text-amber-700">{`{{${block.variableKey || 'key'}}}`}</span>
        </div>
      )
    case 'table': {
      const headers = block.tableHeaders ?? []
      const cells = block.tableCells ?? []
      return (
        <div style={blockStyle}>
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
        </div>
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
        <div
          className={`rounded border ${borderColor} p-1.5 text-[7px]`}
          style={{
            fontFamily: getFontCss(block.fontFamily),
            fontSize: block.fontSize ? `${block.fontSize * 0.6}px` : undefined,
            lineHeight: block.lineHeight ?? 1.6,
            ...blockStyle,
          }}
        >
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
        <div className="text-right text-[8px]" style={{ fontFamily: getFontCss(block.fontFamily), fontSize: block.fontSize ? `${block.fontSize * 0.6}px` : undefined }}>
          <RenderText text={block.content ?? '令和○年○月○日'} />
        </div>
      )
    case 'address_block':
      return (
        <div className="text-[8px]" style={{ fontFamily: getFontCss(block.fontFamily), fontSize: block.fontSize ? `${block.fontSize * 0.6}px` : undefined }}>
          <div className="text-[10px] font-bold" style={{ fontFamily: getFontCss(block.fontFamily) }}>
            <RenderText text={block.addressCompany || '会社名'} /> {block.addressSuffix ?? '御中'}
          </div>
          {block.addressDepartment && <div><RenderText text={block.addressDepartment} /></div>}
          {block.addressName && <div><RenderText text={block.addressName} /> {block.addressSuffix === '御中' ? '' : block.addressSuffix}</div>}
        </div>
      )
    case 'list': {
      const items = block.listItems ?? []
      const isNumbered = block.listType === 'numbered'
      const ListTag = isNumbered ? 'ol' : 'ul'
      return (
        <div style={blockStyle}>
          <ListTag className={`text-[7px] ${isNumbered ? 'list-decimal' : 'list-disc'} pl-4`}
            style={{
              fontFamily: getFontCss(block.fontFamily),
              fontSize: block.fontSize ? `${block.fontSize * 0.6}px` : undefined,
            }}
          >
            {items.map((item, i) => (
              <li key={i}><RenderText text={item} /></li>
            ))}
          </ListTag>
        </div>
      )
    }
    case 'two_column': {
      const ratio = block.columnRatio ?? '50-50'
      const [left, right] = ratio.split('-').map(Number)
      return (
        <div className="flex gap-2 text-[7px]" style={blockStyle}>
          <div style={{ flex: left }}>
            {(block.columnLeftContent ?? '').split('\n').map((line, i) => (
              <div key={i}>{line ? <RenderText text={line} /> : '\u00A0'}</div>
            ))}
          </div>
          <div style={{ flex: right }}>
            {(block.columnRightContent ?? '').split('\n').map((line, i) => (
              <div key={i}>{line ? <RenderText text={line} /> : '\u00A0'}</div>
            ))}
          </div>
        </div>
      )
    }
    case 'horizontal_items': {
      const items = block.horizontalItems ?? []
      return (
        <div
          className="flex justify-between text-[7px]"
          style={{
            borderBottom: block.borderWidth ? `${block.borderWidth * 0.5}px ${block.borderStyle ?? 'solid'} ${block.borderColor ?? '#000'}` : undefined,
            ...blockStyle,
          }}
        >
          {items.map((item, i) => (
            <div key={i} className="flex-1 text-center">
              <span className="font-semibold">{item.label}</span>
              {item.label && item.value ? ': ' : ''}
              <RenderText text={item.value} />
            </div>
          ))}
        </div>
      )
    }
    default:
      return <div className="text-[7px] text-slate-400">[{block.type}]</div>
  }
}

function A4Preview({ blocks, seals }: { blocks: TemplateBlock[]; seals: LocalSeal[] }) {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">A4プレビュー</div>
      <div
        className="w-full bg-white a4-paper-shadow rounded-sm"
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
// Undo/Redo 管理用の型
// ============================================================
interface UndoState {
  past: TemplateBlock[][]
  future: TemplateBlock[][]
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
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // ドラッグ&ドロップ用
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Undo/Redo 履歴
  const undoRef = useRef<UndoState>({ past: [], future: [] })

  /** Undo履歴にスナップショットを記録 */
  const pushUndoSnapshot = useCallback((currentBlocks: TemplateBlock[]) => {
    const state = undoRef.current
    state.past = [...state.past.slice(-19), currentBlocks.map(b => ({ ...b }))]
    state.future = []
  }, [])

  // Google Fonts の読み込み
  useEffect(() => {
    const existingLink = document.querySelector(`link[href="${GOOGLE_FONTS_URL}"]`)
    if (!existingLink) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = GOOGLE_FONTS_URL
      document.head.appendChild(link)
    }
  }, [])

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
    setBlocks((prev) => {
      pushUndoSnapshot(prev)
      const maxOrder = prev.length > 0 ? Math.max(...prev.map((b) => b.order)) : -1
      const newBlock = createDefaultBlock(type, maxOrder + 1)
      return [...prev, newBlock]
    })
  }, [pushUndoSnapshot])

  const updateBlock = useCallback((id: string, updated: TemplateBlock) => {
    setBlocks((prev) => {
      pushUndoSnapshot(prev)
      return prev.map((b) => (b.id === id ? updated : b))
    })
  }, [pushUndoSnapshot])

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      pushUndoSnapshot(prev)
      const filtered = prev.filter((b) => b.id !== id)
      return filtered.map((b, i) => ({ ...b, order: i }))
    })
    if (selectedBlockId === id) setSelectedBlockId(null)
  }, [pushUndoSnapshot, selectedBlockId])

  const duplicateBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      pushUndoSnapshot(prev)
      const idx = prev.findIndex((b) => b.id === id)
      if (idx < 0) return prev
      const source = prev[idx]
      const clone: TemplateBlock = { ...source, id: generateBlockId(), order: source.order + 0.5 }
      return [...prev, clone].sort((a, b) => a.order - b.order).map((b, i) => ({ ...b, order: i }))
    })
  }, [pushUndoSnapshot])

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      pushUndoSnapshot(prev)
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
  }, [pushUndoSnapshot])

  // Undo / Redo
  const handleUndo = useCallback(() => {
    const state = undoRef.current
    if (state.past.length === 0) return
    setBlocks((current) => {
      const prev = state.past[state.past.length - 1]
      state.past = state.past.slice(0, -1)
      state.future = [...state.future, current.map(b => ({ ...b }))]
      return prev
    })
  }, [])

  const handleRedo = useCallback(() => {
    const state = undoRef.current
    if (state.future.length === 0) return
    setBlocks((current) => {
      const next = state.future[state.future.length - 1]
      state.future = state.future.slice(0, -1)
      state.past = [...state.past, current.map(b => ({ ...b }))]
      return next
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
      pushUndoSnapshot(prev)
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const [moved] = sorted.splice(dragIndex, 1)
      sorted.splice(dropIdx, 0, moved)
      return sorted.map((b, i) => ({ ...b, order: i }))
    })
    setDragIndex(null)
    setDragOverIndex(null)
  }, [dragIndex, pushUndoSnapshot])

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
        case 'list': lines.push(...(b.listItems ?? []).map((item, i) => b.listType === 'numbered' ? `${i + 1}. ${item}` : `- ${item}`)); break
        case 'two_column': lines.push(`${b.columnLeftContent ?? ''} | ${b.columnRightContent ?? ''}`); break
        case 'horizontal_items': lines.push((b.horizontalItems ?? []).map(it => `${it.label}: ${it.value}`).join(' / ')); break
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

  // キーボードショートカット
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      // Ctrl/Cmd+S: 保存
      if (isMod && e.key === 's') {
        e.preventDefault()
        handleSave()
        return
      }

      // Ctrl/Cmd+Z: Undo
      if (isMod && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        handleUndo()
        return
      }

      // Ctrl/Cmd+Shift+Z: Redo
      if (isMod && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        handleRedo()
        return
      }

      // Delete/Backspace で選択中ブロック削除（input/textarea内では無効化）
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        if (window.confirm('選択中のブロックを削除しますか？')) {
          removeBlock(selectedBlockId)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave, handleUndo, handleRedo, selectedBlockId, removeBlock])

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
          {/* Undo/Redo ボタン */}
          <button onClick={handleUndo} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="元に戻す (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </button>
          <button onClick={handleRedo} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="やり直し (Ctrl+Shift+Z)">
            <Redo2 className="h-4 w-4" />
          </button>
          <div className="h-5 w-px bg-slate-300" />
          {/* ショートカット表示トグル */}
          <div className="relative">
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="ショートカット一覧"
            >
              <Keyboard className="h-4 w-4" />
            </button>
            {showShortcuts && (
              <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                <div className="mb-2 text-xs font-bold text-slate-600">ショートカット</div>
                <div className="space-y-1 text-[11px] text-slate-500">
                  <div className="flex justify-between"><span>保存</span><kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">Ctrl+S</kbd></div>
                  <div className="flex justify-between"><span>元に戻す</span><kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">Ctrl+Z</kbd></div>
                  <div className="flex justify-between"><span>やり直し</span><kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">Ctrl+Shift+Z</kbd></div>
                  <div className="flex justify-between"><span>ブロック削除</span><kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">Delete</kbd></div>
                </div>
              </div>
            )}
          </div>
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
        {/* 左パネル: ブロックパレット（カテゴリ分類） */}
        <div className="w-44 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50/80 p-3">
          {BLOCK_CATEGORIES.map((category) => {
            const typesInCategory = BLOCK_TYPES.filter((bt) => bt.category === category)
            return (
              <div key={category} className="mb-3">
                <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span className="h-px flex-1 bg-slate-300" />
                  <span className="px-1">{category}</span>
                  <span className="h-px flex-1 bg-slate-300" />
                </div>
                <div className="space-y-1">
                  {typesInCategory.map((bt) => (
                    <button
                      key={bt.type}
                      onClick={() => addBlock(bt.type)}
                      className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 transition-all duration-150 hover:bg-white hover:shadow-md hover:-translate-y-px"
                      title={bt.description}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200/60 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:ring-blue-200">
                        {bt.icon}
                      </span>
                      <div className="min-w-0">
                        <span className="block font-medium">{bt.label}</span>
                        <span className="block truncate text-[10px] text-slate-400">{bt.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* 中央パネル: メイン編集エリア */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4" onClick={() => setSelectedBlockId(null)}>
          <div className="mx-auto max-w-2xl space-y-2">
            {sortedBlocks.map((block, idx) => (
              <div
                key={block.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={handleDragEnd}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedBlockId(block.id)
                }}
                className={`group rounded-xl border bg-white shadow-sm transition-all duration-200 ${
                  dragOverIndex === idx && dragIndex !== idx
                    ? 'border-blue-400 ring-2 ring-blue-100 shadow-md'
                    : dragIndex === idx
                    ? 'border-blue-300 opacity-50 scale-[0.98]'
                    : selectedBlockId === block.id
                    ? 'border-blue-400 ring-2 ring-blue-100'
                    : 'border-slate-200 hover:border-blue-200 hover:shadow-md'
                }`}
              >
                {/* ブロックヘッダー（ブロック種別ラベル付き） */}
                <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/50 px-3 py-2">
                  <span className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing" title="ドラッグで移動">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <span className="flex items-center gap-1.5 rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/80 shadow-sm">
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
        <div className="w-[35%] shrink-0 overflow-y-auto border-l border-slate-200 bg-gradient-to-b from-slate-100 to-slate-200/50 p-6">
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
