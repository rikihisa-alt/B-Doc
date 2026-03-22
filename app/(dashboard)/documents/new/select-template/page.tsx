'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DOCUMENT_TYPE_LABELS } from '@/types'
import { getTemplates } from '@/lib/store'
import type { LocalTemplate } from '@/lib/store'
import {
  FileText,
  ChevronLeft,
  ArrowRight,
  Loader2,
  Paperclip,
} from 'lucide-react'

/**
 * テンプレート選択ページ（Client Component）
 * ストアからテンプレートを取得して表示
 */
export default function SelectTemplatePage() {
  const router = useRouter()

  // テンプレート一覧
  const [templates, setTemplates] = useState<LocalTemplate[]>([])
  const [loading, setLoading] = useState(true)

  // 選択中のテンプレート
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // テンプレート一覧の取得（公開済みのみ）
  useEffect(() => {
    const allTemplates = getTemplates()
    setTemplates(allTemplates.filter((t) => t.is_published))
    setLoading(false)
  }, [])

  // 選択中のテンプレートオブジェクト
  const selected = templates.find((t) => t.id === selectedId) ?? null

  // テンプレートで作成ボタン押下時
  const handleCreate = () => {
    if (!selectedId) return
    router.push(`/documents/new?template_id=${selectedId}`)
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 pb-4">
        <Link href="/documents">
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
            <ChevronLeft className="h-4 w-4" />
            戻る
          </Button>
        </Link>
        <h1 className="text-lg font-bold text-gray-900">
          テンプレートを選択
        </h1>
      </div>

      {/* メインコンテンツ: 2分割パネル */}
      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden rounded-lg border bg-white">
        {/* 左パネル: テンプレート一覧 */}
        <div className="flex w-1/2 flex-col border-r">
          <div className="border-b bg-gray-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              テンプレート一覧
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {templates.length}件のテンプレート
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-400">読み込み中...</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="px-4 py-20 text-center text-sm text-gray-400">
                公開されたテンプレートがありません。
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {templates.map((t) => {
                  const isActive = selectedId === t.id
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(t.id)}
                        className={`
                          w-full text-left px-4 py-3 transition-colors
                          ${
                            isActive
                              ? 'border-l-[3px] border-l-blue-600 bg-blue-50/70'
                              : 'border-l-[3px] border-l-transparent hover:bg-gray-50'
                          }
                        `}
                      >
                        <p className={`text-sm font-medium ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                          {t.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 font-medium">
                            {DOCUMENT_TYPE_LABELS[t.document_type] ?? t.document_type}
                          </span>
                          <span>v{t.version}</span>
                        </div>
                        {t.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-gray-400">{t.description}</p>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* 右パネル: テンプレート詳細 */}
        <div className="flex w-1/2 flex-col">
          {selected ? (
            <>
              <div className="border-b bg-gray-50/80 px-6 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  テンプレート詳細
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
                    {DOCUMENT_TYPE_LABELS[selected.document_type] ?? selected.document_type}
                  </span>
                  <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-500">
                    バージョン {selected.version}
                  </span>
                </div>

                {selected.description && (
                  <div className="mt-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">説明</h3>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                      {selected.description}
                    </p>
                  </div>
                )}

                {/* 変数一覧（入力項目のプレビュー） */}
                {selected.variables && selected.variables.length > 0 && (
                  <div className="mt-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      入力項目（{selected.variables.length}項目）
                    </h3>
                    <div className="mt-1.5 rounded border bg-gray-50 p-3">
                      <ul className="space-y-1">
                        {selected.variables.map((v) => (
                          <li key={v.key} className="flex items-center text-xs text-gray-600">
                            <span className="mr-2 font-medium">{v.label}</span>
                            {v.required && (
                              <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] font-medium text-red-600">
                                必須
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* A4プレビュー サムネイル */}
                <div className="mt-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    プレビュー
                  </h3>
                  <div className="mt-2 flex aspect-[210/297] w-48 items-center justify-center rounded border border-gray-200 bg-white shadow-sm">
                    <div className="text-center">
                      <FileText className="mx-auto h-8 w-8 text-gray-300" />
                      <p className="mt-1 text-[10px] text-gray-400">A4 プレビュー</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 作成ボタン（フッター固定） */}
              <div className="border-t bg-white px-6 py-4">
                <Button onClick={handleCreate} className="w-full">
                  このテンプレートで作成する
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <FileText className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm text-gray-400">
                  左からテンプレートを選択してください
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
