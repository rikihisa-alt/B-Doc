'use client'

/**
 * 印影マスタ管理ページ
 * 印影の一覧表示・新規作成・編集・削除を行う
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { SealPreview } from '@/components/seal/seal-preview'
import { SealCreator } from '@/components/seal/seal-creator'
import { getSeals, deleteSeal } from '@/lib/store'
import type { LocalSeal } from '@/lib/store'
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

/** 印影タイプの日本語ラベル */
const TYPE_LABELS: Record<LocalSeal['type'], string> = {
  round: '丸印',
  square: '角印',
  personal: '認印',
}

export default function SealsPage() {
  const [seals, setSeals] = useState<LocalSeal[]>([])
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editTarget, setEditTarget] = useState<LocalSeal | undefined>(undefined)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  /** 印影一覧を読み込む */
  const loadSeals = useCallback(() => {
    setSeals(getSeals())
  }, [])

  useEffect(() => {
    loadSeals()
  }, [loadSeals])

  /** 新規作成モードへ */
  const handleCreate = useCallback(() => {
    setEditTarget(undefined)
    setMode('create')
  }, [])

  /** 編集モードへ */
  const handleEdit = useCallback((seal: LocalSeal) => {
    setEditTarget(seal)
    setMode('edit')
  }, [])

  /** 保存完了後に一覧に戻る */
  const handleSave = useCallback(() => {
    loadSeals()
    setMode('list')
    setEditTarget(undefined)
  }, [loadSeals])

  /** キャンセルして一覧に戻る */
  const handleCancel = useCallback(() => {
    setMode('list')
    setEditTarget(undefined)
  }, [])

  /** 印影を削除 */
  const handleDelete = useCallback(
    (id: string) => {
      deleteSeal(id)
      loadSeals()
      setDeleteConfirmId(null)
    },
    [loadSeals]
  )

  // 作成・編集モード
  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="space-y-4">
        <button
          onClick={handleCancel}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          一覧に戻る
        </button>
        <SealCreator
          editSeal={editTarget}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    )
  }

  // 一覧モード
  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/master"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            マスタ管理
          </Link>
          <h1 className="text-lg font-bold text-slate-900">印影管理</h1>
        </div>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          新規作成
        </Button>
      </div>

      {/* 印影一覧グリッド */}
      {seals.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          印影が登録されていません。「新規作成」から追加してください。
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seals.map((seal) => (
            <div
              key={seal.id}
              className="group relative rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
            >
              {/* プレビュー */}
              <div className="flex items-center justify-center rounded-md bg-slate-50 p-6">
                <SealPreview seal={seal} size={120} />
              </div>

              {/* 印影情報 */}
              <div className="mt-3 space-y-1">
                <p className="text-sm font-medium text-slate-900">{seal.name}</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {TYPE_LABELS[seal.type]}
                  </span>
                  <span className="text-xs text-slate-400">{seal.size}mm</span>
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-slate-200"
                    style={{ backgroundColor: seal.color }}
                  />
                </div>
              </div>

              {/* 操作ボタン */}
              <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleEdit(seal)}
                >
                  <Pencil className="mr-1 h-3 w-3" />
                  編集
                </Button>

                {deleteConfirmId === seal.id ? (
                  <div className="flex flex-1 items-center gap-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handleDelete(seal.id)}
                    >
                      削除
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setDeleteConfirmId(null)}
                    >
                      戻す
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setDeleteConfirmId(seal.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    削除
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
