'use client'

import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TemplateVariable } from '@/types'

interface DocumentFormProps {
  /** テンプレート変数の定義 */
  variables: TemplateVariable[]
  /** フォームの現在値 */
  values: Record<string, string>
  /** 値の変更ハンドラ */
  onChange: (values: Record<string, string>) => void
  /** フォーム無効化フラグ */
  disabled?: boolean
}

/**
 * 文書入力フォームコンポーネント
 * テンプレート変数の定義からフォームフィールドを動的に生成する
 */
export function DocumentForm({
  variables,
  values,
  onChange,
  disabled = false,
}: DocumentFormProps) {
  /** 個別フィールドの値変更ハンドラ */
  const handleFieldChange = useCallback(
    (key: string, value: string) => {
      onChange({ ...values, [key]: value })
    },
    [values, onChange]
  )

  if (variables.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        テンプレートを選択してください。
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {variables.map((variable) => (
        <FieldRenderer
          key={variable.name}
          variable={variable}
          value={values[variable.name] ?? variable.default_value ?? ''}
          onChange={(value) => handleFieldChange(variable.name, value)}
          disabled={disabled}
        />
      ))}
    </div>
  )
}

// ============================================================
// 個別フィールドレンダラー
// ============================================================

interface FieldRendererProps {
  variable: TemplateVariable
  value: string
  onChange: (value: string) => void
  disabled: boolean
}

/**
 * テンプレート変数の type に応じて適切な入力コンポーネントを描画する
 */
function FieldRenderer({ variable, value, onChange, disabled }: FieldRendererProps) {
  const { name: key, label, type, required, placeholder, options } = variable

  return (
    <div className="space-y-1.5">
      {/* ラベル（boolean 以外） */}
      {type !== 'boolean' && (
        <Label htmlFor={key} className="flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}

      {/* テキスト入力 */}
      {type === 'text' && (
        <Input
          id={key}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? undefined}
          required={required}
          disabled={disabled}
        />
      )}

      {/* 数値入力 */}
      {type === 'number' && (
        <Input
          id={key}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? undefined}
          required={required}
          disabled={disabled}
        />
      )}

      {/* 日付入力 */}
      {type === 'date' && (
        <Input
          id={key}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
        />
      )}

      {/* セレクト */}
      {type === 'select' && options && (
        <Select
          value={value}
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger id={key}>
            <SelectValue placeholder={placeholder ?? '選択してください'} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* チェックボックス */}
      {type === 'boolean' && (
        <div className="flex items-center gap-2">
          <input
            id={key}
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onChange(String(e.target.checked))}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <Label htmlFor={key} className="flex items-center gap-1">
            {label}
            {required && <span className="text-red-500">*</span>}
          </Label>
        </div>
      )}
    </div>
  )
}
