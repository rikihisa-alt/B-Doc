'use client'

/**
 * 印影作成・編集コンポーネント
 * リアルタイムプレビュー付きの印影エディター
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SealPreview } from '@/components/seal/seal-preview'
import { saveSeal, createSeal } from '@/lib/store'
import type { LocalSeal } from '@/lib/store'

/** 印影タイプの定義 */
const SEAL_TYPES: { value: LocalSeal['type']; label: string; description: string }[] = [
  { value: 'round', label: '丸印（代表者印）', description: '会社の代表者印として使用' },
  { value: 'square', label: '角印（社印）', description: '会社の社印として使用' },
  { value: 'personal', label: '認印（個人印）', description: '個人の認印として使用' },
]

/** プリセットカラー */
const PRESET_COLORS = [
  { value: '#cc0000', label: '朱色' },
  { value: '#b30000', label: '濃朱色' },
  { value: '#e60000', label: '赤' },
  { value: '#990000', label: '暗赤' },
  { value: '#ff3333', label: '明赤' },
  { value: '#333333', label: '墨色' },
]

interface SealCreatorProps {
  /** 編集対象の印影（新規作成時はundefined） */
  editSeal?: LocalSeal
  /** 保存完了時のコールバック */
  onSave: (seal: LocalSeal) => void
  /** キャンセル時のコールバック */
  onCancel: () => void
}

export function SealCreator({ editSeal, onSave, onCancel }: SealCreatorProps) {
  // フォーム状態の初期化
  const [name, setName] = useState(editSeal?.name ?? '')
  const [type, setType] = useState<LocalSeal['type']>(editSeal?.type ?? 'round')
  const [textLine1, setTextLine1] = useState(editSeal?.text_line1 ?? '')
  const [textLine2, setTextLine2] = useState(editSeal?.text_line2 ?? '')
  const [textLine3, setTextLine3] = useState(editSeal?.text_line3 ?? '')
  const [size, setSize] = useState(editSeal?.size ?? 42)
  const [color, setColor] = useState(editSeal?.color ?? '#cc0000')
  const [borderWidth, setBorderWidth] = useState(editSeal?.border_width ?? 2)

  /** プレビュー用の一時的な印影オブジェクト */
  const previewSeal: LocalSeal = {
    id: editSeal?.id ?? 'preview',
    name,
    type,
    text_line1: textLine1,
    text_line2: textLine2,
    text_line3: textLine3,
    size,
    color,
    border_width: borderWidth,
    font_family: 'serif',
    created_at: editSeal?.created_at ?? new Date().toISOString(),
  }

  /** 印影を保存する */
  const handleSave = useCallback(() => {
    if (!textLine1.trim()) return

    if (editSeal) {
      // 既存印影の更新
      const updated: LocalSeal = {
        ...editSeal,
        name: name || textLine1,
        type,
        text_line1: textLine1,
        text_line2: textLine2,
        text_line3: textLine3,
        size,
        color,
        border_width: borderWidth,
        font_family: 'serif',
      }
      saveSeal(updated)
      onSave(updated)
    } else {
      // 新規印影の作成
      const newSeal = createSeal({
        name: name || textLine1,
        type,
        text_line1: textLine1,
        text_line2: textLine2,
        text_line3: textLine3,
        size,
        color,
        border_width: borderWidth,
        font_family: 'serif',
      })
      onSave(newSeal)
    }
  }, [editSeal, name, type, textLine1, textLine2, textLine3, size, color, borderWidth, onSave])

  /** タイプ変更時にサイズのデフォルト値を設定 */
  const handleTypeChange = useCallback((newType: LocalSeal['type']) => {
    setType(newType)
    if (newType === 'round') setSize(42)
    else if (newType === 'square') setSize(24)
    else setSize(12)
  }, [])

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-bold text-slate-900">
          {editSeal ? '印影を編集' : '印影作成'}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-2">
        {/* 左: 設定パネル */}
        <div className="space-y-5">
          {/* 印影タイプ選択 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">印影タイプ</Label>
            <div className="space-y-2">
              {SEAL_TYPES.map((st) => (
                <label
                  key={st.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${
                    type === st.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="seal-type"
                    value={st.value}
                    checked={type === st.value}
                    onChange={() => handleTypeChange(st.value)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{st.label}</p>
                    <p className="text-xs text-slate-500">{st.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 印影名 */}
          <div className="space-y-1.5">
            <Label htmlFor="seal-name" className="text-sm font-medium text-slate-700">
              印影名
            </Label>
            <Input
              id="seal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 代表者印"
              className="text-sm"
            />
          </div>

          {/* 上段テキスト */}
          <div className="space-y-1.5">
            <Label htmlFor="text-line1" className="text-sm font-medium text-slate-700">
              {type === 'personal' ? 'テキスト' : '上段テキスト'}{' '}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="text-line1"
              value={textLine1}
              onChange={(e) => setTextLine1(e.target.value)}
              placeholder={type === 'personal' ? '例: 田中' : '例: B-Doc'}
              className="text-sm"
            />
          </div>

          {/* 下段テキスト（丸印・角印のみ） */}
          {type !== 'personal' && (
            <div className="space-y-1.5">
              <Label htmlFor="text-line2" className="text-sm font-medium text-slate-700">
                {type === 'round' ? '下段テキスト' : '中段テキスト'}
              </Label>
              <Input
                id="text-line2"
                value={textLine2}
                onChange={(e) => setTextLine2(e.target.value)}
                placeholder={type === 'round' ? '例: 代表者印' : '例: 株式会社'}
                className="text-sm"
              />
            </div>
          )}

          {/* 3行目テキスト（角印のみ） */}
          {type === 'square' && (
            <div className="space-y-1.5">
              <Label htmlFor="text-line3" className="text-sm font-medium text-slate-700">
                下段テキスト
              </Label>
              <Input
                id="text-line3"
                value={textLine3}
                onChange={(e) => setTextLine3(e.target.value)}
                placeholder="例: 之印"
                className="text-sm"
              />
            </div>
          )}

          {/* サイズスライダー */}
          <div className="space-y-1.5">
            <Label htmlFor="seal-size" className="text-sm font-medium text-slate-700">
              サイズ: <span className="font-mono">{size}</span>mm
            </Label>
            <input
              id="seal-size"
              type="range"
              min={12}
              max={60}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>12mm</span>
              <span>60mm</span>
            </div>
          </div>

          {/* 色選択 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">色</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((pc) => (
                <button
                  key={pc.value}
                  type="button"
                  onClick={() => setColor(pc.value)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                    color === pc.value ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
                  }`}
                  style={{ backgroundColor: pc.value }}
                  title={pc.label}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="custom-color" className="shrink-0 text-xs text-slate-500">
                カスタム:
              </Label>
              <Input
                id="custom-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-12 cursor-pointer p-0.5"
              />
              <span className="font-mono text-xs text-slate-500">{color}</span>
            </div>
          </div>

          {/* 枠線太さスライダー */}
          <div className="space-y-1.5">
            <Label htmlFor="border-width" className="text-sm font-medium text-slate-700">
              枠線太さ: <span className="font-mono">{borderWidth}</span>px
            </Label>
            <input
              id="border-width"
              type="range"
              min={1}
              max={4}
              step={0.5}
              value={borderWidth}
              onChange={(e) => setBorderWidth(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>細い</span>
              <span>太い</span>
            </div>
          </div>
        </div>

        {/* 右: プレビュー */}
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8">
          <p className="mb-4 text-sm font-medium text-slate-500">プレビュー</p>
          <div className="flex items-center justify-center rounded-lg bg-white p-6 shadow-sm">
            <SealPreview seal={previewSeal} size={160} />
          </div>
          <p className="mt-3 text-xs text-slate-400">
            実際のサイズ: {size}mm
          </p>
        </div>
      </div>

      {/* フッターボタン */}
      <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
        <Button variant="outline" size="sm" onClick={onCancel}>
          キャンセル
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!textLine1.trim()}
        >
          {editSeal ? '更新する' : '保存する'}
        </Button>
      </div>
    </div>
  )
}
