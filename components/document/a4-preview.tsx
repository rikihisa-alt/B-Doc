'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

// =============================================================================
// A4 文書プレビューコンポーネント
// A4比率（210mm x 297mm）を維持した文書プレビューを表示する
// =============================================================================

/** 透かし文字のプリセット */
type WatermarkPreset = 'DRAFT' | '社外秘' | '見本' | '写し'

interface A4PreviewProps {
  /** 文書タイトル */
  title?: string
  /** テンプレート本文（{{variableName}} を含む） */
  bodyTemplate: string
  /** テンプレート変数の値 */
  values: Record<string, string>
  /** 文書番号 */
  documentNumber?: string
  /** 発行日 */
  issuedAt?: string
  /** 透かし文字（プリセットまたは任意文字列） */
  watermark?: WatermarkPreset | string
  /** 追加のクラス名 */
  className?: string
  /** ズームコントロールを表示するか */
  showZoomControls?: boolean
}

/** ズーム倍率の選択肢 */
const ZOOM_LEVELS = [50, 75, 100, 125, 150] as const

/**
 * A4プレビューコンポーネント
 *
 * - A4 比率（210mm x 297mm）をスケーリングして表示
 * - {{variableName}} 形式の変数を values で置換
 * - 未入力の変数は黄色ハイライトで表示
 * - 透かし文字を対角配置で表示
 * - オプションのズームコントロール
 */
export function A4Preview({
  title,
  bodyTemplate,
  values,
  documentNumber,
  issuedAt,
  watermark,
  className,
  showZoomControls = false,
}: A4PreviewProps) {
  const [zoom, setZoom] = useState(100)

  /** テンプレート内の変数を置換した本文を生成 */
  const renderedContent = useMemo(() => {
    if (!bodyTemplate) return ''

    return bodyTemplate.replace(
      /\{\{(\w+)\}\}/g,
      (_match, key: string) => {
        const value = values[key]
        // 値が入力されていない場合は黄色ハイライトで変数名を表示
        if (!value) {
          return `<span class="bg-yellow-200 text-yellow-800 px-1 rounded text-sm">{{${key}}}</span>`
        }
        return escapeHtml(value)
      },
    )
  }, [bodyTemplate, values])

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* ズームコントロール */}
      {showZoomControls && (
        <div className="mb-3 flex items-center gap-2">
          {ZOOM_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setZoom(level)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                zoom === level
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {level}%
            </button>
          ))}
        </div>
      )}

      {/* A4 用紙コンテナ */}
      <div
        className="overflow-auto"
        style={{
          // A4 比率をスケーリングして表示
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
        }}
      >
        <div
          className={cn(
            'relative mx-auto bg-white shadow-[0_2px_16px_rgba(0,0,0,0.10)]',
            'rounded-sm border border-gray-200',
          )}
          style={{
            // A4 サイズ: 210mm x 297mm
            width: '210mm',
            minHeight: '297mm',
            fontFamily: '"Noto Sans JP", "Yu Gothic", "Hiragino Sans", sans-serif',
          }}
        >
          {/* 透かし文字 */}
          {watermark && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
              aria-hidden="true"
            >
              <span
                className={cn(
                  'select-none font-bold uppercase tracking-widest opacity-[0.07]',
                  'rotate-[-30deg]',
                  // 日本語の透かしは少し小さめに
                  /^[a-zA-Z]+$/.test(watermark)
                    ? 'text-[100px] text-gray-600'
                    : 'text-[80px] text-gray-600',
                )}
              >
                {watermark}
              </span>
            </div>
          )}

          {/* A4 用紙コンテンツ */}
          <div className="relative z-0 p-[20mm]">
            {/* ヘッダー部 */}
            <div className="mb-8 border-b border-gray-300 pb-4">
              {/* 文書番号・発行日 */}
              <div className="mb-2 flex items-start justify-between text-xs text-gray-500">
                {documentNumber && (
                  <span>文書番号: {documentNumber}</span>
                )}
                {issuedAt && (
                  <span>発行日: {issuedAt}</span>
                )}
              </div>

              {/* 文書タイトル */}
              {title && (
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              )}
            </div>

            {/* 本文 */}
            {bodyTemplate ? (
              <div
                className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: renderedContent }}
              />
            ) : (
              <p className="py-20 text-center text-gray-400">
                テンプレートを選択するとプレビューが表示されます
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// ユーティリティ
// =============================================================================

/**
 * HTMLエスケープ処理
 * XSS防止のためユーザー入力値をエスケープする
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char] ?? char)
}
