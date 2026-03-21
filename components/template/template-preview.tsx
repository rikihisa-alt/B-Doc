'use client'

import { useMemo } from 'react'
import type { TemplateVariable, TemplateLayout } from '@/types'

// ============================================================
// テンプレート本文ブロック（プレビュー用ローカル型）
// DB側では content が HTML/JSON 文字列として保存される
// ============================================================
export interface PreviewBlock {
  /** ブロックID */
  id: string
  /** ブロック種別 */
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'divider' | 'variable'
  /** ブロック内容 */
  content: string
  /** 表示順 */
  order: number
}

// ============================================================
// デフォルトレイアウト設定
// ============================================================
const DEFAULT_LAYOUT: TemplateLayout = {
  paper_size: 'A4',
  orientation: 'portrait',
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  header: { enabled: true, content: null, height: 20 },
  footer: { enabled: true, content: null, height: 15 },
}

// ============================================================
// サンプルデータ生成
// 変数定義からプレビュー用のサンプル値を自動生成する
// ============================================================
function generateSampleValue(variable: TemplateVariable): string {
  switch (variable.type) {
    case 'text':
      return variable.default_value ?? `【${variable.label || variable.name}】`
    case 'number':
      return variable.default_value ?? '1,000'
    case 'date':
      return variable.default_value ?? '2026-01-01'
    case 'select':
      return variable.options?.[0]?.label ?? `【${variable.label || variable.name}】`
    case 'boolean':
      return variable.default_value === 'true' ? 'はい' : 'いいえ'
    default:
      return `【${variable.name}】`
  }
}

// ============================================================
// テンプレート本文の変数を置換
// {{variable_name}} の形式をサンプル値で置き換える
// ============================================================
function replaceVariables(
  content: string,
  sampleData: Record<string, string>
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return sampleData[key] ?? match
  })
}

// ============================================================
// Props定義
// ============================================================
interface TemplatePreviewProps {
  /** テンプレート名 */
  templateName?: string
  /** 本文ブロック（ブロックエディタから渡される） */
  blocks: PreviewBlock[]
  /** 変数定義 */
  variables: TemplateVariable[]
  /** レイアウト設定 */
  layout?: TemplateLayout | null
}

// ============================================================
// A4プレビューコンポーネント
// テンプレートの仕上がりイメージをA4用紙風に表示する
// ============================================================
export function TemplatePreview({
  templateName,
  blocks,
  variables,
  layout,
}: TemplatePreviewProps) {
  const currentLayout = layout ?? DEFAULT_LAYOUT

  // サンプルデータを変数定義から生成
  const sampleData = useMemo(() => {
    const data: Record<string, string> = {}
    variables.forEach((v) => {
      data[v.name] = generateSampleValue(v)
    })
    return data
  }, [variables])

  // ブロックをソートして表示
  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order - b.order),
    [blocks]
  )

  // 用紙方向
  const isLandscape = currentLayout.orientation === 'landscape'

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">プレビュー</h3>
      <div className="overflow-auto rounded-lg border bg-gray-100 p-4">
        {/* A4用紙 */}
        <div
          className="mx-auto bg-white shadow-lg"
          style={{
            width: isLandscape ? '420px' : '297px',
            minHeight: isLandscape ? '297px' : '420px',
            padding: `${currentLayout.margins.top * 0.7}px ${currentLayout.margins.right * 0.7}px ${currentLayout.margins.bottom * 0.7}px ${currentLayout.margins.left * 0.7}px`,
          }}
        >
          {/* ヘッダー */}
          {currentLayout.header.enabled && (
            <div className="border-b pb-2 mb-3">
              <p className="text-[10px] text-gray-400">
                {currentLayout.header.content ?? 'B-Doc テンプレートプレビュー'}
              </p>
            </div>
          )}

          {/* テンプレート名 */}
          {templateName && (
            <h1 className="text-sm font-bold text-gray-900 mb-3 text-center">
              {templateName}
            </h1>
          )}

          {/* 本文ブロック */}
          <div className="space-y-2">
            {sortedBlocks.length === 0 && (
              <p className="text-[10px] text-gray-300 text-center py-8">
                本文ブロックがありません
              </p>
            )}
            {sortedBlocks.map((block) => (
              <PreviewBlockRenderer
                key={block.id}
                block={block}
                sampleData={sampleData}
              />
            ))}
          </div>

          {/* フッター */}
          {currentLayout.footer.enabled && (
            <div className="border-t pt-2 mt-4">
              <p className="text-[8px] text-gray-400 text-center">
                {currentLayout.footer.content ?? '-- ページ 1 / 1 --'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 個別ブロックの描画
// ============================================================
function PreviewBlockRenderer({
  block,
  sampleData,
}: {
  block: PreviewBlock
  sampleData: Record<string, string>
}) {
  const content = replaceVariables(block.content, sampleData)

  switch (block.type) {
    case 'heading':
      return (
        <h2 className="text-xs font-bold text-gray-800 border-b border-gray-200 pb-1">
          {content}
        </h2>
      )
    case 'paragraph':
      return (
        <p className="text-[10px] text-gray-700 leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      )
    case 'list':
      return (
        <ul className="text-[10px] text-gray-700 list-disc pl-4 space-y-0.5">
          {content.split('\n').map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )
    case 'table':
      return (
        <div className="overflow-hidden rounded border text-[9px]">
          <table className="w-full">
            <tbody>
              {content.split('\n').map((row, ri) => (
                <tr key={ri} className={ri === 0 ? 'bg-gray-50 font-semibold' : ''}>
                  {row.split('|').map((cell, ci) => (
                    <td key={ci} className="border px-1 py-0.5">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'divider':
      return <hr className="border-gray-300" />
    case 'variable':
      return (
        <span className="inline-block rounded bg-blue-50 px-1 py-0.5 text-[10px] text-blue-700 border border-blue-200">
          {content}
        </span>
      )
    default:
      return <p className="text-[10px] text-gray-700">{content}</p>
  }
}
