'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { DOCUMENT_TYPE_LABELS } from '@/types'
import type { Template, TemplateVersion } from '@/types'
import {
  FileText,
  ChevronLeft,
  ArrowRight,
  Loader2,
  Paperclip,
} from 'lucide-react'

/** テンプレート + 最新バージョン情報 */
interface TemplateWithVersion extends Template {
  latest_version?: TemplateVersion | null
}

/**
 * テンプレート選択ページ（Client Component）
 * 左パネル: テンプレート一覧（スクロール）
 * 右パネル: 選択テンプレート詳細 + A4プレビュー
 */
export default function SelectTemplatePage() {
  const router = useRouter()
  const supabase = createClient()

  // テンプレート一覧
  const [templates, setTemplates] = useState<TemplateWithVersion[]>([])
  const [loading, setLoading] = useState(true)

  // 選択中のテンプレート
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // テンプレート一覧の取得（公開済みのみ）
  useEffect(() => {
    async function fetchTemplates() {
      setLoading(true)

      // テンプレート本体を取得
      const { data: templateList } = await supabase
        .from('templates')
        .select('*')
        .eq('is_published', true)
        .is('deleted_at', null)
        .order('document_type')
        .order('name')

      if (!templateList || templateList.length === 0) {
        setTemplates([])
        setLoading(false)
        return
      }

      // 各テンプレートの最新バージョンを取得
      const templateIds = templateList.map((t) => t.id)
      const { data: versions } = await supabase
        .from('template_versions')
        .select('*')
        .in('template_id', templateIds)
        .eq('is_draft', false)
        .order('version', { ascending: false })

      // テンプレートIDごとに最新バージョンをマッピング
      const versionMap = new Map<string, TemplateVersion>()
      if (versions) {
        for (const v of versions) {
          if (!versionMap.has(v.template_id)) {
            versionMap.set(v.template_id, v as TemplateVersion)
          }
        }
      }

      const merged: TemplateWithVersion[] = templateList.map((t) => ({
        ...(t as Template),
        latest_version: versionMap.get(t.id) ?? null,
      }))

      setTemplates(merged)
      setLoading(false)
    }

    fetchTemplates()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 選択中のテンプレートオブジェクト
  const selected = templates.find((t) => t.id === selectedId) ?? null

  // テンプレートで作成ボタン押下時
  const handleCreate = () => {
    if (!selectedId) return
    // 新規文書作成ページにテンプレートIDを渡す
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
        {/* ====== 左パネル: テンプレート一覧 ====== */}
        <div className="flex w-1/2 flex-col border-r">
          {/* パネルヘッダー */}
          <div className="border-b bg-gray-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              テンプレート一覧
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {templates.length}件のテンプレート
            </p>
          </div>

          {/* スクロール可能なリスト */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-400">
                  読み込み中...
                </span>
              </div>
            ) : templates.length === 0 ? (
              <div className="px-4 py-20 text-center text-sm text-gray-400">
                公開されたテンプレートがありません。
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {templates.map((t) => {
                  const isActive = selectedId === t.id
                  const version = t.latest_version
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
                        {/* テンプレート名 */}
                        <p
                          className={`text-sm font-medium ${
                            isActive ? 'text-blue-900' : 'text-gray-900'
                          }`}
                        >
                          {t.name}
                        </p>

                        {/* メタ情報行 */}
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 font-medium">
                            {DOCUMENT_TYPE_LABELS[t.document_type] ??
                              t.document_type}
                          </span>
                          {version ? (
                            <span>v{version.version}</span>
                          ) : null}
                        </div>

                        {/* 説明文（2行まで） */}
                        {t.description ? (
                          <p className="mt-1 line-clamp-2 text-xs text-gray-400">
                            {t.description}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ====== 右パネル: テンプレート詳細 ====== */}
        <div className="flex w-1/2 flex-col">
          {selected ? (
            <>
              {/* 詳細ヘッダー */}
              <div className="border-b bg-gray-50/80 px-6 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  テンプレート詳細
                </p>
              </div>

              {/* 詳細コンテンツ（スクロール可） */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {/* テンプレート名 */}
                <h2 className="text-lg font-bold text-gray-900">
                  {selected.name}
                </h2>

                {/* メタ情報 */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
                    {DOCUMENT_TYPE_LABELS[selected.document_type] ??
                      selected.document_type}
                  </span>
                  {selected.latest_version ? (
                    <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-500">
                      バージョン {selected.latest_version?.version}
                    </span>
                  ) : null}
                </div>

                {/* 説明文 */}
                {selected.description ? (
                  <div className="mt-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      説明
                    </h3>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                      {selected.description}
                    </p>
                  </div>
                ) : null}

                {/* 用途・目的（メタデータから取得、あれば表示） */}
                {selected.latest_version?.body &&
                  typeof selected.latest_version.body === 'object' &&
                  'purpose' in selected.latest_version.body && (
                    <div className="mt-5">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        用途・目的
                      </h3>
                      <p className="mt-1.5 text-sm text-gray-700">
                        {String(
                          (
                            selected.latest_version.body as {
                              purpose?: string
                            }
                          ).purpose ?? ''
                        )}
                      </p>
                    </div>
                  )}

                {/* 必要添付書類 */}
                {selected.latest_version?.body &&
                  typeof selected.latest_version.body === 'object' &&
                  'required_attachments' in selected.latest_version.body && (
                    <div className="mt-5">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        必要添付書類
                      </h3>
                      <ul className="mt-1.5 space-y-1">
                        {(
                          (
                            selected.latest_version.body as {
                              required_attachments?: string[]
                            }
                          ).required_attachments ?? []
                        ).map((att, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-1.5 text-sm text-gray-700"
                          >
                            <Paperclip className="h-3.5 w-3.5 text-gray-400" />
                            {att}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* 変数一覧（入力項目のプレビュー） */}
                {selected.latest_version?.variables &&
                  selected.latest_version.variables.length > 0 && (
                    <div className="mt-5">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        入力項目（{selected.latest_version.variables.length}
                        項目）
                      </h3>
                      <div className="mt-1.5 rounded border bg-gray-50 p-3">
                        <ul className="space-y-1">
                          {selected.latest_version.variables.map((v) => (
                            <li
                              key={v.name}
                              className="flex items-center text-xs text-gray-600"
                            >
                              <span className="mr-2 font-medium">
                                {v.label}
                              </span>
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
                      <p className="mt-1 text-[10px] text-gray-400">
                        A4 プレビュー
                      </p>
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
            /* 未選択状態 */
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
