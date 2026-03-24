'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  GitBranch,
  ChevronLeft,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Check,
  Pencil,
  ChevronRight,
  ChevronDown,
  Power,
  PowerOff,
} from 'lucide-react'
import {
  getWorkflows,
  saveWorkflow,
  deleteWorkflow,
} from '@/lib/store'
import type { LocalWorkflow } from '@/lib/store'

// =============================================================================
// ワークフロー設定ページ（localStorage駆動）
// =============================================================================

/** 文書種別の選択肢 */
const DOC_TYPES = [
  { value: 'employment_cert', label: '在職証明書' },
  { value: 'income_cert', label: '収入証明書' },
  { value: 'retirement_cert', label: '退職証明書' },
  { value: 'invoice', label: '請求書' },
  { value: 'quotation', label: '見積書' },
  { value: 'contract', label: '契約書' },
  { value: 'other', label: 'その他' },
]

/** ステップ種別 */
const STEP_TYPES = [
  { value: 'confirm', label: '確認' },
  { value: 'approve', label: '承認' },
  { value: 'issue', label: '発行' },
]

/** 担当ロール */
const STEP_ROLES = [
  { value: 'confirmer', label: '確認者' },
  { value: 'approver', label: '承認者' },
  { value: 'issuer', label: '発行者' },
  { value: 'doc_controller', label: '文書管理者' },
  { value: 'system_admin', label: 'システム管理者' },
]

/** 空のステップ */
const emptyStep = (order: number) => ({
  order,
  name: '新しいステップ',
  type: 'approve',
  role: 'approver',
  deadline_hours: 48,
})

/** ワークフローフォーム型 */
interface WorkflowForm {
  name: string
  document_type: string
  steps: LocalWorkflow['steps']
  is_active: boolean
}

const emptyWorkflowForm = (): WorkflowForm => ({
  name: '',
  document_type: 'employment_cert',
  steps: [emptyStep(1)],
  is_active: true,
})

export default function WorkflowsPage() {
  const router = useRouter()

  // --- 状態 ---
  const [workflows, setWorkflows] = useState<LocalWorkflow[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingSteps, setEditingSteps] = useState<Record<string, LocalWorkflow['steps']>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<WorkflowForm>(emptyWorkflowForm())
  const [deleteTarget, setDeleteTarget] = useState<LocalWorkflow | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  // --- 初期読み込み ---
  useEffect(() => {
    setWorkflows(getWorkflows())
  }, [])

  // --- ワークフロー展開トグル ---
  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => {
      if (prev === id) return null
      // 展開時にステップをコピー
      const wf = workflows.find((w) => w.id === id)
      if (wf) {
        setEditingSteps((es) => ({ ...es, [id]: [...wf.steps] }))
      }
      return id
    })
  }, [workflows])

  // --- ステップ追加（展開中のワークフロー） ---
  const addStepToExpanded = useCallback((wfId: string) => {
    setEditingSteps((prev) => {
      const steps = prev[wfId] ?? []
      return { ...prev, [wfId]: [...steps, emptyStep(steps.length + 1)] }
    })
  }, [])

  // --- ステップ削除（展開中のワークフロー） ---
  const removeStepFromExpanded = useCallback((wfId: string, order: number) => {
    setEditingSteps((prev) => {
      const updated = (prev[wfId] ?? [])
        .filter((s) => s.order !== order)
        .map((s, i) => ({ ...s, order: i + 1 }))
      return { ...prev, [wfId]: updated }
    })
  }, [])

  // --- ステップ並び替え（展開中のワークフロー） ---
  const moveStepInExpanded = useCallback((wfId: string, order: number, direction: 'up' | 'down') => {
    setEditingSteps((prev) => {
      const steps = [...(prev[wfId] ?? [])]
      const index = steps.findIndex((s) => s.order === order)
      if (index < 0) return prev
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= steps.length) return prev
      const temp = steps[index]
      steps[index] = steps[targetIndex]
      steps[targetIndex] = temp
      const reordered = steps.map((s, i) => ({ ...s, order: i + 1 }))
      return { ...prev, [wfId]: reordered }
    })
  }, [])

  // --- ステッププロパティ更新（展開中のワークフロー） ---
  const updateStepInExpanded = useCallback(
    (wfId: string, order: number, updates: Partial<LocalWorkflow['steps'][0]>) => {
      setEditingSteps((prev) => ({
        ...prev,
        [wfId]: (prev[wfId] ?? []).map((s) =>
          s.order === order ? { ...s, ...updates } : s
        ),
      }))
    },
    []
  )

  // --- 展開中のワークフローのステップを保存 ---
  const saveExpandedSteps = useCallback((wfId: string) => {
    const wf = workflows.find((w) => w.id === wfId)
    if (!wf) return
    const updatedWf: LocalWorkflow = { ...wf, steps: editingSteps[wfId] ?? wf.steps }
    saveWorkflow(updatedWf)
    setWorkflows(getWorkflows())
    setSavedId(wfId)
    setTimeout(() => setSavedId(null), 2000)
  }, [workflows, editingSteps])

  // --- 有効/無効トグル ---
  const toggleActive = useCallback((wfId: string) => {
    const wf = workflows.find((w) => w.id === wfId)
    if (!wf) return
    const updatedWf: LocalWorkflow = { ...wf, is_active: !wf.is_active }
    saveWorkflow(updatedWf)
    setWorkflows(getWorkflows())
  }, [workflows])

  // --- 新規/編集ダイアログを開く ---
  const openDialog = useCallback((wf?: LocalWorkflow) => {
    if (wf) {
      setEditingId(wf.id)
      setForm({
        name: wf.name,
        document_type: wf.document_type,
        steps: [...wf.steps],
        is_active: wf.is_active,
      })
    } else {
      setEditingId(null)
      setForm(emptyWorkflowForm())
    }
    setDialogOpen(true)
  }, [])

  // --- フォーム内のステップ操作 ---
  const addFormStep = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      steps: [...prev.steps, emptyStep(prev.steps.length + 1)],
    }))
  }, [])

  const removeFormStep = useCallback((order: number) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps
        .filter((s) => s.order !== order)
        .map((s, i) => ({ ...s, order: i + 1 })),
    }))
  }, [])

  const updateFormStep = useCallback((order: number, updates: Partial<LocalWorkflow['steps'][0]>) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.order === order ? { ...s, ...updates } : s
      ),
    }))
  }, [])

  // --- 保存（新規/編集ダイアログ） ---
  const handleSaveDialog = useCallback(() => {
    const wf: LocalWorkflow = {
      id: editingId ?? `wf-${Date.now()}`,
      name: form.name,
      document_type: form.document_type,
      steps: form.steps,
      is_active: form.is_active,
    }
    saveWorkflow(wf)
    setWorkflows(getWorkflows())
    setDialogOpen(false)
  }, [editingId, form])

  // --- 削除確定 ---
  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteWorkflow(deleteTarget.id)
    setWorkflows(getWorkflows())
    setDeleteTarget(null)
    if (expandedId === deleteTarget.id) setExpandedId(null)
  }, [deleteTarget, expandedId])

  // --- 文書種別ラベル ---
  const docTypeLabel = (val: string): string => {
    return DOC_TYPES.find((d) => d.value === val)?.label ?? val
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
        <Button size="sm" onClick={() => openDialog()}>
          <Plus className="mr-1.5 h-4 w-4" />
          新規フロー
        </Button>
      </div>

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
                {/* ワークフローヘッダー */}
                <div className="flex items-center justify-between px-6 py-4">
                  <div
                    className="flex flex-1 cursor-pointer items-center gap-3"
                    onClick={() => toggleExpand(wf.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                    <div>
                      <h3 className="font-medium text-slate-900">{wf.name}</h3>
                      <Badge variant="secondary" className="mt-0.5 text-[10px]">
                        {docTypeLabel(wf.document_type)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* ステップの簡易表示 */}
                    <div className="hidden items-center gap-1 sm:flex">
                      {wf.steps
                        .sort((a, b) => a.order - b.order)
                        .map((step, i) => (
                          <div key={step.order} className="flex items-center gap-1">
                            {i > 0 && <span className="text-slate-300">&rarr;</span>}
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                              {step.name}
                            </span>
                          </div>
                        ))}
                    </div>
                    {/* 有効/無効トグル */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => toggleActive(wf.id)}
                      title={wf.is_active ? '無効にする' : '有効にする'}
                    >
                      {wf.is_active ? (
                        <Power className="h-4 w-4 text-green-600" />
                      ) : (
                        <PowerOff className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                    <Badge
                      className={
                        wf.is_active
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }
                    >
                      {wf.is_active ? '有効' : '無効'}
                    </Badge>
                    {/* 編集・削除 */}
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDialog(wf)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                      onClick={() => setDeleteTarget(wf)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
                          onClick={() => addStepToExpanded(wf.id)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          ステップ追加
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => saveExpandedSteps(wf.id)}
                        >
                          {savedId === wf.id ? (
                            <>
                              <Check className="mr-1 h-3 w-3" />
                              保存済
                            </>
                          ) : (
                            <>
                              <Save className="mr-1 h-3 w-3" />
                              保存
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* ステップリスト */}
                    <div className="space-y-2">
                      {steps
                        .sort((a, b) => a.order - b.order)
                        .map((step, index) => (
                          <div
                            key={step.order}
                            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
                          >
                            {/* 並び替え */}
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                className="text-slate-300 hover:text-slate-500 disabled:opacity-30"
                                onClick={() => moveStepInExpanded(wf.id, step.order, 'up')}
                                disabled={index === 0}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                className="text-slate-300 hover:text-slate-500 disabled:opacity-30"
                                onClick={() => moveStepInExpanded(wf.id, step.order, 'down')}
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
                                updateStepInExpanded(wf.id, step.order, { name: e.target.value })
                              }
                              className="h-8 w-40 text-sm"
                              placeholder="ステップ名"
                            />

                            {/* 種別 */}
                            <select
                              value={step.type}
                              onChange={(e) =>
                                updateStepInExpanded(wf.id, step.order, { type: e.target.value })
                              }
                              className="h-8 rounded-md border border-slate-200 px-2 text-xs"
                            >
                              {STEP_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>

                            {/* 担当ロール */}
                            <select
                              value={step.role}
                              onChange={(e) =>
                                updateStepInExpanded(wf.id, step.order, { role: e.target.value })
                              }
                              className="h-8 rounded-md border border-slate-200 px-2 text-xs"
                            >
                              {STEP_ROLES.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>

                            {/* 期限（時間） */}
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={step.deadline_hours}
                                onChange={(e) =>
                                  updateStepInExpanded(wf.id, step.order, {
                                    deadline_hours: Number(e.target.value) || 0,
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
                              onClick={() => removeStepFromExpanded(wf.id, step.order)}
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

      {/* 新規/編集ダイアログ */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editingId ? 'ワークフローを編集' : '新規ワークフロー作成'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              承認フローの基本情報とステップを設定してください。
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2">
            {/* 基本情報 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="wf-name">フロー名</Label>
                <Input
                  id="wf-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例: 標準承認フロー"
                />
              </div>
              <div className="space-y-1.5">
                <Label>文書種別</Label>
                <Select
                  value={form.document_type}
                  onValueChange={(v) => setForm({ ...form, document_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ステップ */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>ステップ</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addFormStep}>
                  <Plus className="mr-1 h-3 w-3" />
                  追加
                </Button>
              </div>
              <div className="space-y-2">
                {form.steps.map((step) => (
                  <div
                    key={step.order}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 p-2"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                      {step.order}
                    </span>
                    <Input
                      value={step.name}
                      onChange={(e) => updateFormStep(step.order, { name: e.target.value })}
                      className="h-7 w-32 text-xs"
                      placeholder="名前"
                    />
                    <select
                      value={step.type}
                      onChange={(e) => updateFormStep(step.order, { type: e.target.value })}
                      className="h-7 rounded-md border border-slate-200 px-1.5 text-xs"
                    >
                      {STEP_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <select
                      value={step.role}
                      onChange={(e) => updateFormStep(step.order, { role: e.target.value })}
                      className="h-7 rounded-md border border-slate-200 px-1.5 text-xs"
                    >
                      {STEP_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      value={step.deadline_hours}
                      onChange={(e) => updateFormStep(step.order, { deadline_hours: Number(e.target.value) || 0 })}
                      className="h-7 w-14 text-xs"
                    />
                    <span className="text-[10px] text-slate-400">h</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                      onClick={() => removeFormStep(step.order)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveDialog} disabled={!form.name.trim()}>
              {editingId ? '更新' : '作成'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除の確認</AlertDialogTitle>
            <AlertDialogDescription>
              ワークフロー「{deleteTarget?.name}」を削除してもよろしいですか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
