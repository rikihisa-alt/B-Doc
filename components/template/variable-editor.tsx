'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import type { TemplateVariable } from '@/types'

// ============================================================
// 変数型の表示ラベルマップ
// ============================================================
const VARIABLE_TYPE_LABELS: Record<TemplateVariable['type'], string> = {
  text: 'テキスト',
  number: '数値',
  date: '日付',
  select: '選択肢',
  boolean: 'はい/いいえ',
}

// ============================================================
// Props定義
// ============================================================
interface VariableEditorProps {
  /** 現在の変数リスト */
  variables: TemplateVariable[]
  /** 変数リスト更新コールバック */
  onChange: (variables: TemplateVariable[]) => void
}

// ============================================================
// 変数エディタコンポーネント
// テンプレートの変数を追加・削除・編集するためのUI
// ============================================================
export function VariableEditor({ variables, onChange }: VariableEditorProps) {
  /** ドラッグ中のインデックス */
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  /** 新しい変数を追加 */
  const handleAdd = useCallback(() => {
    const newVar: TemplateVariable = {
      name: `var_${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      default_value: null,
      placeholder: null,
      help_text: null,
      validation: null,
      options: null,
      display_order: variables.length,
      visible_condition: null,
    }
    onChange([...variables, newVar])
  }, [variables, onChange])

  /** 変数を削除 */
  const handleRemove = useCallback(
    (index: number) => {
      const updated = variables.filter((_, i) => i !== index)
      // display_order を再採番
      onChange(updated.map((v, i) => ({ ...v, display_order: i })))
    },
    [variables, onChange]
  )

  /** 変数フィールドを更新 */
  const handleUpdate = useCallback(
    (index: number, field: keyof TemplateVariable, value: unknown) => {
      const updated = variables.map((v, i) => {
        if (i !== index) return v
        const next = { ...v, [field]: value }
        // select以外に変更した場合はoptionsをクリア
        if (field === 'type' && value !== 'select') {
          next.options = null
        }
        return next
      })
      onChange(updated)
    },
    [variables, onChange]
  )

  /** 選択肢を追加 */
  const handleAddOption = useCallback(
    (varIndex: number) => {
      const updated = variables.map((v, i) => {
        if (i !== varIndex) return v
        const current = v.options ?? []
        return {
          ...v,
          options: [...current, { value: '', label: '' }],
        }
      })
      onChange(updated)
    },
    [variables, onChange]
  )

  /** 選択肢を更新 */
  const handleUpdateOption = useCallback(
    (varIndex: number, optIndex: number, field: 'value' | 'label', val: string) => {
      const updated = variables.map((v, i) => {
        if (i !== varIndex) return v
        const opts = [...(v.options ?? [])]
        opts[optIndex] = { ...opts[optIndex], [field]: val }
        return { ...v, options: opts }
      })
      onChange(updated)
    },
    [variables, onChange]
  )

  /** 選択肢を削除 */
  const handleRemoveOption = useCallback(
    (varIndex: number, optIndex: number) => {
      const updated = variables.map((v, i) => {
        if (i !== varIndex) return v
        return {
          ...v,
          options: (v.options ?? []).filter((_, j) => j !== optIndex),
        }
      })
      onChange(updated)
    },
    [variables, onChange]
  )

  // ドラッグ&ドロップによる並び替え
  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    const reordered = [...variables]
    const [removed] = reordered.splice(dragIndex, 1)
    reordered.splice(index, 0, removed)
    onChange(reordered.map((v, i) => ({ ...v, display_order: i })))
    setDragIndex(index)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">変数定義</h3>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-1 h-4 w-4" />
          変数を追加
        </Button>
      </div>

      {/* 変数が無い場合 */}
      {variables.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-6 border border-dashed rounded-lg">
          変数がありません。「変数を追加」をクリックして追加してください。
        </p>
      )}

      {/* 変数リスト */}
      <div className="space-y-3">
        {variables.map((variable, index) => (
          <div
            key={`${variable.name}-${index}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`rounded-lg border bg-white p-4 space-y-3 transition-shadow ${
              dragIndex === index ? 'shadow-md ring-2 ring-primary/30' : ''
            }`}
          >
            {/* 上段: ドラッグハンドル + 変数名 + ラベル + 型 + 必須 + 削除 */}
            <div className="flex items-start gap-3">
              {/* ドラッグハンドル */}
              <div className="flex items-center pt-7 cursor-grab text-gray-400 hover:text-gray-600">
                <GripVertical className="h-5 w-5" />
              </div>

              {/* 変数名 */}
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-gray-500">変数名</Label>
                <Input
                  value={variable.name}
                  onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                  placeholder="variable_name"
                  className="mt-1"
                />
              </div>

              {/* 表示ラベル */}
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-gray-500">表示名</Label>
                <Input
                  value={variable.label}
                  onChange={(e) => handleUpdate(index, 'label', e.target.value)}
                  placeholder="表示ラベル"
                  className="mt-1"
                />
              </div>

              {/* 型選択 */}
              <div className="w-36">
                <Label className="text-xs text-gray-500">型</Label>
                <Select
                  value={variable.type}
                  onValueChange={(val) =>
                    handleUpdate(index, 'type', val as TemplateVariable['type'])
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.keys(VARIABLE_TYPE_LABELS) as TemplateVariable['type'][]
                    ).map((t) => (
                      <SelectItem key={t} value={t}>
                        {VARIABLE_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 必須トグル */}
              <div className="flex flex-col items-center pt-5">
                <Label className="text-xs text-gray-500 mb-1">必須</Label>
                <input
                  type="checkbox"
                  checked={variable.required}
                  onChange={(e) => handleUpdate(index, 'required', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </div>

              {/* 削除ボタン */}
              <div className="pt-6">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(index)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* select型の場合: 選択肢エディタ */}
            {variable.type === 'select' && (
              <div className="ml-8 space-y-2">
                <Label className="text-xs text-gray-500">選択肢</Label>
                {(variable.options ?? []).map((opt, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-2">
                    <Input
                      value={opt.label}
                      onChange={(e) =>
                        handleUpdateOption(index, optIdx, 'label', e.target.value)
                      }
                      placeholder={`ラベル ${optIdx + 1}`}
                      className="flex-1"
                    />
                    <Input
                      value={opt.value}
                      onChange={(e) =>
                        handleUpdateOption(index, optIdx, 'value', e.target.value)
                      }
                      placeholder={`値 ${optIdx + 1}`}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index, optIdx)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddOption(index)}
                  className="text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  選択肢を追加
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
