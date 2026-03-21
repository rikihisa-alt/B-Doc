'use client'

import { useMemo } from 'react'
import type { DocumentStatus } from '@/types'

interface DocumentPreviewProps {
  /** テンプレート本文（{{変数名}} を含む） */
  bodyTemplate: string
  /** フォーム入力値 */
  values: Record<string, string>
  /** 文書タイトル */
  title?: string
  /** 文書番号 */
  documentNumber?: string
  /** 文書ステータス */
  status?: DocumentStatus
}

/**
 * A4プレビューコンポーネント
 * テンプレート内の {{変数名}} をフォーム入力値でリアルタイムに置換して表示する
 * 下書き状態の場合は「DRAFT」透かしを表示する
 */
export function DocumentPreview({
  bodyTemplate,
  values,
  title,
  documentNumber,
  status = 'draft',
}: DocumentPreviewProps) {
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
      }
    )
  }, [bodyTemplate, values])

  return (
    <div className="relative mx-auto w-full max-w-[210mm] overflow-hidden rounded-sm border bg-white shadow-lg">
      {/* DRAFT 透かし */}
      {status === 'draft' && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="select-none text-[80px] font-bold uppercase tracking-widest text-gray-200 opacity-60 rotate-[-30deg]">
            DRAFT
          </span>
        </div>
      )}

      {/* A4 用紙コンテンツ */}
      <div
        className="relative z-0 min-h-[297mm] p-[20mm]"
        style={{ fontFamily: '"Noto Sans JP", "Yu Gothic", sans-serif' }}
      >
        {/* ヘッダー部 */}
        <div className="mb-8 border-b pb-4">
          {documentNumber && (
            <p className="text-xs text-gray-500 mb-1">
              文書番号: {documentNumber}
            </p>
          )}
          {title && (
            <h1 className="text-xl font-bold text-gray-900">
              {title}
            </h1>
          )}
        </div>

        {/* 本文 */}
        {bodyTemplate ? (
          <div
            className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        ) : (
          <p className="text-center text-gray-400 py-20">
            テンプレートを選択するとプレビューが表示されます
          </p>
        )}
      </div>
    </div>
  )
}

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
