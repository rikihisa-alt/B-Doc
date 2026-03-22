'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  GitBranch,
  ChevronLeft,
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Loader2,
  Save,
  Pencil,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DOCUMENT_TYPE_LABELS, USER_ROLE_LABELS } from '@/types'
import type { WorkflowStep, UserRole } from '@/types'

// =============================================================================
// ワークフロー設定ページ（Client Component）
// - 文書種別ごとのワークフロー定義一覧
// - ステップエディタ（追加/削除/並び替え + ロール割り当て）
// =============================================================================

/** ワークフロー定義の型 */
interface WorkflowDef {
  id: string
  name: string
  description: string | null
  target_category: string | null
  target_template_id: string | null
  steps: WorkflowStep[]
  is_active: boolean
  created_at: string
}

/** 利用可能なロール一覧 */
const AVAILABLE_ROLES: { value: string; label: string }[] = [
  { value: 'confirmer', label: '確認者' },
  { value: 'approver', label: '承認者' },
  { value: 'issuer', label: '発行者' },
  { value: 'doc_controller', label: '文書管理者' },
  { value: 'system_admin', label: 'システム管理者' },
]

/** ステップ種別の選択肢 */
const STEP_TYPES: { value: string; label: string }[] = [
  { value: 'confirm', label: '確認' },
  { value: 'approve', label: '承認' },
  { value: 'issue', label: '発行' },
]

export default function WorkflowsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [workflows, setWorkflows] = useState<WorkflowDef[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingSteps, setEditingSteps] = useState<Record<string, WorkflowStep[]>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ワークフロー一覧読み込み
  useEffect(() => {
    async function loadWorkflows() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('workflow_definitions')
          .select('*')
          .order('name')

        if (fetchErr) throw fetchErr
        setWorkflows((data as WorkflowDef[]) ?? [])
      } catch {
        setError('ワークフローの読み込みに失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    loadWorkflows()
  }, [supabase])

  /** ワークフロー展開トグル */
  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      const wf = workflows.find((w) => w.id === id)
      if (wf && !editingSteps[id]) {
        setEditingSteps((prev) => ({ ...prev, [id]: [...wf.steps] }))
      }
    }
  }

  /** ステップ追加 */
  const addStep = (workflowId: string) => {
    const currentSteps = editingSteps[workflowId] ?? []
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: '新しいステップ',
      order: currentSteps.length + 1,
      type: 'approve',
      assignee_ids: [],
      assignee_role: 'approver' as UserRole,
      required_count: null,
      skip_condition: null,
      auto_approve_condition: null,
      deadline_hours: 48,
      deadline_action: 'notify',
    }
    setEditingSteps((prev) => ({
      ...prev,
      [workflowId]: [...currentSteps, newStep],
    }))
  }

  /** ステップ削除 */
  const removeStep = (workflowId: string, stepId: string) => {
    setEditingSteps((prev) => {
      const updated = (prev[workflowId] ?? [])
        .filter((s) => s.id !== stepId)
        .map((s, i) => ({ ...s, order: i + 1 }))
      return { ...prev, [workflowId]: updated }
    })
  }

  /** ステップ並び替え */
  const moveStep = (workflowId: string, stepId: string, direction: 'up' | 'down') => {
    setEditingSteps((prev) => {
      const steps = [...(prev[workflowId] ?? [])]
      const index = steps.findIndex((s) => s.id === stepId)
      if (index < 0) return prev
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= steps.length) return prev
      ;[steps[index], steps[targetIndex]] = [steps[targetIndex], steps[index]]
      const reordered = steps.map((s, i) => ({ ...s, order: i + 1 }))
      return { ...prev, [workflowId]: reordered }
    })
  }

  /** ステップのプロパティ更新 */
  const updateStep = (
    workflowId: string,
    stepId: string,
    updates: Partial<WorkflowStep>
  ) => {
    setEditingSteps((prev) => ({
      ...prev,
      [workflowId]: (prev[workflowId] ?? []).map((s) =>
        s.id === stepId ? { ...s, ...updates } : s
      ),
    }))
  }

  /** ワークフロー保存 */
  const handleSave = async (workflowId: string) => {
    setSavingId(workflowId)
    setError(null)

    try {
      const steps = editingSteps[workflowId] ?? []
      const { error: updateErr } = await supabase
        .from('workflow_definitions')
        .update({
          steps,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowId)

      if (updateErr) throw updateErr

      // ローカル状態を更新
      setWorkflows((prev) =>
        prev.map((w) => (w.id === workflowId ? { ...w, steps } : w))
      )
    } catch {
      setError('保存に失敗しました')
    } finally {
      setSavingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/settings')}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            設定に戻る
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <GitBranch className="h-6 w-6 text-orange-600" />
              ワークフロー設定
            </h1>
            <p className="text-sm text-slate-500">
              文書種別ごとの承認フローを管理します
            </p>
          </div>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          新規フロー
        </Button>
      </div>

      {/* エラー表示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* ワークフロー一覧 */}
      {workflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GitBranch className="mb-3 h-10 w-10 text-slate-200" />
            <p className="text-sm text-slate-500">
              承認フローがまだ設定されていません
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => {
            const isExpanded = expandedId === wf.id
            const steps = editingSteps[wf.id] ?? wf.steps ?? []

            return (
              <Card key={wf.id} className={isExpanded ? 'ring-2 ring-blue-100' : ''}>
                {/* ワークフローヘッダー（クリックで展開） */}
                <div
                  className="flex cursor-pointer items-center justify-between px-6 py-4"
                  onClick={() => toggleExpand(wf.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                    <div>
                      <h3 className="font-medium text-slate-900">{wf.name}</h3>
                      {wf.target_category && (
                        <Badge variant="secondary" className="mt-0.5 text-[10px]">
                          {DOCUMENT_TYPE_LABELS[wf.target_category] ??
                            wf.target_category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* ステップの簡易表示 */}
                    <div className="hidden items-center gap-1 sm:flex">
                      {(wf.steps ?? [])
                        .sort((a, b) => a.order - b.order)
                        .map((step, i) => (
                          <div key={step.id} className="flex items-center gap-1">
                            {i > 0 && (
                              <span className="text-slate-300">→</span>
                            )}
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                              {step.name}
                            </span>
                          </div>
                        ))}
                    </div>
                    <Badge
                      className={
                        wf.is_active
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }
                    >
                      {wf.is_active ? '有効' : '無効'}
                    </Badge>
                  </div>
                </div>

                {/* ステップエディタ（展開時） */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-6 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        ステップ定義 ({steps.length}ステップ)
                      </h4>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => addStep(wf.id)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          ステップ追加
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleSave(wf.id)}
                          disabled={savingId === wf.id}
                        >
                          {savingId === wf.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="mr-1 h-3 w-3" />
                          )}
                          保存
                        </Button>
                      </div>
                    </div>

                    {/* ステップリスト */}
                    <div className="space-y-2">
                      {steps
                        .sort((a, b) => a.order - b.order)
                        .map((step, index) => (
                          <div
                            key={step.id}
                            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
                          >
                            {/* 並び替え */}
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                className="text-slate-300 hover:text-slate-500 disabled:opacity-30"
                                onClick={() => moveStep(wf.id, step.id, 'up')}
                                disabled={index === 0}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                className="text-slate-300 hover:text-slate-500 disabled:opacity-30"
                                onClick={() => moveStep(wf.id, step.id, 'down')}
                                disabled={index === steps.length - 1}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>

                            {/* 順序番号 */}
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                              {step.order}
                            </span>

                            {/* ステップ名 */}
                            <Input
                              value={step.name}
                              onChange={(e) =>
                                updateStep(wf.id, step.id, {
                                  name: e.target.value,
                                })
                              }
                              className="h-8 w-40 text-sm"
                              placeholder="ステップ名"
                            />

                            {/* 種別 */}
                            <select
                              value={step.type}
                              onChange={(e) =>
                                updateStep(wf.id, step.id, {
                                  type: e.target.value as WorkflowStep['type'],
                                })
                              }
                              className="h-8 rounded-md border border-slate-200 px-2 text-xs"
                            >
                              {STEP_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>

                            {/* 担当ロール */}
                            <select
                              value={step.assignee_role ?? ''}
                              onChange={(e) =>
                                updateStep(wf.id, step.id, {
                                  assignee_role: e.target.value as UserRole,
                                })
                              }
                              className="h-8 rounded-md border border-slate-200 px-2 text-xs"
                            >
                              <option value="">ロール選択</option>
                              {AVAILABLE_ROLES.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>

                            {/* 期限（時間） */}
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={step.deadline_hours ?? ''}
                                onChange={(e) =>
                                  updateStep(wf.id, step.id, {
                                    deadline_hours: e.target.value
                                      ? Number(e.target.value)
                                      : null,
                                  })
                                }
                                className="h-8 w-16 text-xs"
                                placeholder="時間"
                              />
                              <span className="text-[10px] text-slate-400">h</span>
                            </div>

                            {/* 削除 */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                              onClick={() => removeStep(wf.id, step.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}

                      {steps.length === 0 && (
                        <p className="py-4 text-center text-xs text-slate-400">
                          ステップがありません。「ステップ追加」で作成してください。
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
