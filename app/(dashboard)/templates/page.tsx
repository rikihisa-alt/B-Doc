'use client'

/**
 * テンプレート一覧ページ
 * テンプレートの一覧表示・承認ワークフロー・作成・編集・削除を管理する
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Layers,
  Variable,
  Blocks,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  LayoutGrid,
  List,
} from 'lucide-react'
import Link from 'next/link'
import { DOCUMENT_TYPE_LABELS } from '@/types'
import {
  getTemplates,
  deleteTemplate,
  saveTemplate,
  addAuditLog,
  getCurrentUser,
  canApproveTemplates,
  USER_ROLE_TYPE_LABELS,
} from '@/lib/store'
import type { LocalTemplate, TemplateApprovalStatus, CurrentUser } from '@/lib/store'

/** 表示モードの型 */
type ViewMode = 'card' | 'list'

/** localStorage キー */
const VIEW_MODE_STORAGE_KEY = 'bdoc_template_view_mode'

// =============================================================================
// テンプレート一覧ページ（Client Component - ストアベース版）
// =============================================================================

/** テンプレート承認ステータスの日本語ラベル */
const TEMPLATE_STATUS_LABELS: Record<TemplateApprovalStatus, string> = {
  draft: '下書き',
  pending_approval: '承認待ち',
  approved: '承認済み',
  rejected: '差戻し',
}

/** テンプレート承認ステータスのバッジ色 */
const TEMPLATE_STATUS_COLORS: Record<TemplateApprovalStatus, string> = {
  draft: 'border-slate-300 bg-slate-50 text-slate-600',
  pending_approval: 'border-amber-200 bg-amber-50 text-amber-700',
  approved: 'border-green-200 bg-green-50 text-green-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
}

/** テンプレートカードの左ボーダー色 */
const TEMPLATE_CARD_BORDER: Record<TemplateApprovalStatus, string> = {
  draft: 'border-l-slate-300',
  pending_approval: 'border-l-amber-400',
  approved: 'border-l-green-500',
  rejected: 'border-l-red-400',
}

/** テンプレート承認ステータスのアイコン */
const TEMPLATE_STATUS_ICONS: Record<TemplateApprovalStatus, typeof Clock> = {
  draft: Pencil,
  pending_approval: Clock,
  approved: CheckCircle,
  rejected: AlertTriangle,
}

/** ステータスバッジの表示 */
function TemplateApprovalBadge({ status }: { status: TemplateApprovalStatus }) {
  const label = TEMPLATE_STATUS_LABELS[status]
  const colorClass = TEMPLATE_STATUS_COLORS[status]
  const IconComp = TEMPLATE_STATUS_ICONS[status]
  return (
    <Badge className={colorClass}>
      <IconComp className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  )
}

/** ブロック数を計算 */
function getBlockCount(template: LocalTemplate): number {
  return template.blocks?.length ?? 0
}

/** 変数数を計算 */
function getVariableCount(template: LocalTemplate): number {
  if (template.blocks) {
    const keys = new Set<string>()
    for (const b of template.blocks) {
      if (b.type === 'variable_line' && b.variableKey) {
        keys.add(b.variableKey)
      }
    }
    return keys.size
  }
  return template.variables.length
}

/** ミニプレビュー：テンプレートブロックの簡易サムネイル */
function TemplateMiniPreview({ template }: { template: LocalTemplate }) {
  const blocks = template.blocks ?? []
  if (blocks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-300">
        <FileText className="h-6 w-6" />
      </div>
    )
  }

  const sorted = [...blocks].sort((a, b) => a.order - b.order).slice(0, 8)
  return (
    <div className="space-y-0.5 overflow-hidden p-1.5">
      {sorted.map((block) => {
        switch (block.type) {
          case 'heading':
            return (
              <div key={block.id} className={`truncate text-[6px] font-bold ${block.align === 'center' ? 'text-center' : block.align === 'right' ? 'text-right' : 'text-left'}`}>
                {block.content || '見出し'}
              </div>
            )
          case 'paragraph':
            return <div key={block.id} className="truncate text-[5px] text-slate-500">{block.content || '本文...'}</div>
          case 'variable_line':
            return <div key={block.id} className="text-[5px] text-slate-400">{block.variableLabel}: <span className="text-amber-500">{`{{${block.variableKey}}}`}</span></div>
          case 'divider':
            return <hr key={block.id} className="border-slate-200" />
          case 'spacer':
            return <div key={block.id} style={{ height: `${Math.max(1, (block.spacerHeight ?? 5) * 0.3)}px` }} />
          case 'table':
            return <div key={block.id} className="h-2 rounded border border-slate-200 bg-slate-50" />
          case 'seal':
            return <div key={block.id} className="flex justify-end"><div className="h-3 w-3 rounded-full border border-red-300" /></div>
          case 'signature':
            return <div key={block.id} className="text-right text-[5px] text-slate-400">{block.companyName || '署名欄'}</div>
          default:
            return <div key={block.id} className="h-1 bg-slate-100" />
        }
      })}
    </div>
  )
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<LocalTemplate[]>([])
  const [loaded, setLoaded] = useState(false)
  const [currentUser, setCurrentUserLocal] = useState<CurrentUser | null>(null)
  // 表示モード（カード/リスト）
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  // 差戻し理由入力ダイアログ
  const [rejectingTemplateId, setRejectingTemplateId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // データ読み込み・表示モード復元
  useEffect(() => {
    setTemplates(getTemplates())
    setCurrentUserLocal(getCurrentUser())
    // localStorageから表示モードを復元
    const savedMode = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    if (savedMode === 'card' || savedMode === 'list') {
      setViewMode(savedMode)
    }
    setLoaded(true)
  }, [])

  /** 表示モード切替 */
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  }, [])

  const userRole = currentUser?.role ?? 'staff'
  const isApprover = canApproveTemplates(userRole)

  /** テンプレートの承認ステータスを取得（未設定の場合はdraft） */
  const getStatus = useCallback((t: LocalTemplate): TemplateApprovalStatus => {
    return t.status ?? 'draft'
  }, [])

  /** テンプレート削除 */
  const handleDelete = useCallback((id: string, name: string) => {
    if (!window.confirm(`テンプレート「${name}」を削除しますか？\nこの操作は取り消せません。`)) return
    deleteTemplate(id)
    setTemplates(getTemplates())
  }, [])

  /** 承認申請 */
  const handleSubmitForApproval = useCallback((template: LocalTemplate) => {
    const user = getCurrentUser()
    const updated: LocalTemplate = {
      ...template,
      status: 'pending_approval',
      submitted_by: user.name,
      submitted_at: new Date().toISOString(),
    }
    saveTemplate(updated)

    // 監査ログ
    addAuditLog({
      user_name: user.name,
      user_role: user.role,
      target_type: 'template',
      target_id: template.id,
      target_label: template.name,
      operation: 'template_submit',
      before_value: { status: template.status ?? 'draft' },
      after_value: { status: 'pending_approval' },
      success: true,
      comment: 'テンプレート承認申請',
    })

    setTemplates(getTemplates())
  }, [])

  /** 承認 */
  const handleApprove = useCallback((template: LocalTemplate) => {
    const user = getCurrentUser()
    const updated: LocalTemplate = {
      ...template,
      status: 'approved',
      approved_by: user.name,
      approved_at: new Date().toISOString(),
      rejection_reason: undefined,
    }
    saveTemplate(updated)

    // 監査ログ
    addAuditLog({
      user_name: user.name,
      user_role: user.role,
      target_type: 'template',
      target_id: template.id,
      target_label: template.name,
      operation: 'template_approve',
      before_value: { status: 'pending_approval' },
      after_value: { status: 'approved', approved_by: user.name },
      success: true,
      comment: 'テンプレート承認',
    })

    setTemplates(getTemplates())
  }, [])

  /** 差戻しダイアログを開く */
  const handleOpenReject = useCallback((templateId: string) => {
    setRejectingTemplateId(templateId)
    setRejectionReason('')
  }, [])

  /** 差戻し確定 */
  const handleRejectConfirm = useCallback(() => {
    if (!rejectingTemplateId) return
    const template = templates.find((t) => t.id === rejectingTemplateId)
    if (!template) return

    const user = getCurrentUser()
    const reason = rejectionReason.trim() || '理由未記載'
    const updated: LocalTemplate = {
      ...template,
      status: 'rejected',
      rejection_reason: reason,
      approved_by: undefined,
      approved_at: undefined,
    }
    saveTemplate(updated)

    // 監査ログ
    addAuditLog({
      user_name: user.name,
      user_role: user.role,
      target_type: 'template',
      target_id: template.id,
      target_label: template.name,
      operation: 'template_reject',
      before_value: { status: 'pending_approval' },
      after_value: { status: 'rejected', rejection_reason: reason },
      success: true,
      comment: `テンプレート差戻し: ${reason}`,
    })

    setRejectingTemplateId(null)
    setRejectionReason('')
    setTemplates(getTemplates())
  }, [rejectingTemplateId, rejectionReason, templates])

  // 集計情報
  const totalCount = templates.length
  const approvedCount = templates.filter((t) => getStatus(t) === 'approved').length
  const pendingCount = templates.filter((t) => getStatus(t) === 'pending_approval').length
  const draftCount = templates.filter((t) => getStatus(t) === 'draft').length

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">テンプレート管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            文書テンプレートの作成・承認・管理を行います
            <span className="ml-2 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200/80">
              {USER_ROLE_TYPE_LABELS[userRole]}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 表示モード切替ボタン */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => handleViewModeChange('card')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'card'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="カード表示"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">カード</span>
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="リスト表示"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">リスト</span>
            </button>
          </div>
          <Button asChild className="gap-2 shadow-sm">
            <Link href="/templates/new">
              <Plus className="h-4 w-4" />
              新規テンプレート
            </Link>
          </Button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Layers className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
              <p className="text-xs text-slate-500">全テンプレート</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{approvedCount}</p>
              <p className="text-xs text-slate-500">承認済み</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
              <p className="text-xs text-slate-500">承認待ち</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50">
              <Pencil className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{draftCount}</p>
              <p className="text-xs text-slate-500">下書き</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 差戻し理由入力モーダル */}
      {rejectingTemplateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-base font-semibold text-slate-900">差戻し理由を入力</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="差戻し理由を入力してください..."
              className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectingTemplateId(null)}
              >
                キャンセル
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleRejectConfirm}
              >
                差戻し確定
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* テンプレート一覧 */}
      {templates.length > 0 ? (
        viewMode === 'card' ? (
          /* カード表示 */
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => {
              const status = getStatus(template)
              return (
                <Card key={template.id} className={`group overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-l-4 ${TEMPLATE_CARD_BORDER[status]}`}>
                  {/* ミニプレビュー */}
                  <div className="relative h-32 border-b border-slate-100 bg-slate-50">
                    <TemplateMiniPreview template={template} />
                    {/* ホバー時のオーバーレイ */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/80 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button asChild size="sm" variant="outline" className="h-8">
                        <Link href={`/templates/${template.id}/edit`}>
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          編集
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-8">
                        <Link href={`/templates/${template.id}`}>
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          詳細
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/templates/${template.id}/edit`}
                          className="block truncate text-sm font-semibold text-slate-900 hover:text-blue-600"
                        >
                          {template.name}
                        </Link>
                        {template.description && (
                          <p className="mt-0.5 truncate text-xs text-slate-400">{template.description}</p>
                        )}
                      </div>
                      <TemplateApprovalBadge status={status} />
                    </div>

                    {/* 差戻し理由の表示 */}
                    {status === 'rejected' && template.rejection_reason && (
                      <div className="mt-2 rounded bg-red-50 px-2 py-1.5 text-xs text-red-600">
                        <span className="font-medium">差戻し理由:</span> {template.rejection_reason}
                      </div>
                    )}

                    {/* メタ情報 */}
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                      <Badge variant="secondary" className="text-[10px]">
                        {DOCUMENT_TYPE_LABELS[template.document_type] ?? template.document_type}
                      </Badge>
                      <span className="inline-flex items-center gap-0.5">
                        <Blocks className="h-3 w-3" />
                        {getBlockCount(template)}
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <Variable className="h-3 w-3" />
                        {getVariableCount(template)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium">
                        v{template.version}
                      </span>
                    </div>

                    {/* 承認ワークフローボタン + 操作ボタン */}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-1">
                        {/* 一般社員: 下書き・差戻しテンプレートに承認申請ボタン */}
                        {!isApprover && (status === 'draft' || status === 'rejected') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={() => handleSubmitForApproval(template)}
                          >
                            <Send className="mr-1 h-3 w-3" />
                            承認申請
                          </Button>
                        )}

                        {/* 管理職/管理者: 承認待ちテンプレートに承認・差戻しボタン */}
                        {isApprover && status === 'pending_approval' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleApprove(template)}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              承認
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleOpenReject(template.id)}
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              差戻し
                            </Button>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">
                          {new Date(template.created_at).toLocaleDateString('ja-JP')}
                        </span>
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                          <Link href={`/templates/${template.id}/edit`}>
                            <Pencil className="mr-1 h-3 w-3" />
                            編集
                          </Link>
                        </Button>
                        <button
                          onClick={() => handleDelete(template.id, template.name)}
                          className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          title="削除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          /* リスト表示 */
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">テンプレート名</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">種別</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">ステータス</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">ブロック数</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">変数数</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">バージョン</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">作成日</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {templates.map((template) => {
                    const status = getStatus(template)
                    return (
                      <tr key={template.id} className="transition-colors duration-150 hover:bg-blue-50/40">
                        {/* テンプレート名 */}
                        <td className="px-5 py-3">
                          <Link
                            href={`/templates/${template.id}/edit`}
                            className="text-sm font-medium text-slate-900 hover:text-blue-600"
                          >
                            {template.name}
                          </Link>
                          {template.description && (
                            <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">{template.description}</p>
                          )}
                        </td>
                        {/* 種別 */}
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-[10px]">
                            {DOCUMENT_TYPE_LABELS[template.document_type] ?? template.document_type}
                          </Badge>
                        </td>
                        {/* ステータス */}
                        <td className="px-4 py-3">
                          <TemplateApprovalBadge status={status} />
                        </td>
                        {/* ブロック数 */}
                        <td className="px-4 py-3 text-center text-xs text-slate-600 tabular-nums">
                          {getBlockCount(template)}
                        </td>
                        {/* 変数数 */}
                        <td className="px-4 py-3 text-center text-xs text-slate-600 tabular-nums">
                          {getVariableCount(template)}
                        </td>
                        {/* バージョン */}
                        <td className="px-4 py-3 text-center">
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                            v{template.version}
                          </span>
                        </td>
                        {/* 作成日 */}
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(template.created_at).toLocaleDateString('ja-JP')}
                        </td>
                        {/* 操作ボタン */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {/* 承認申請ボタン（一般社員） */}
                            {!isApprover && (status === 'draft' || status === 'rejected') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                                onClick={() => handleSubmitForApproval(template)}
                              >
                                <Send className="mr-1 h-3 w-3" />
                                承認申請
                              </Button>
                            )}
                            {/* 承認・差戻しボタン（管理職/管理者） */}
                            {isApprover && status === 'pending_approval' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50"
                                  onClick={() => handleApprove(template)}
                                >
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  承認
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleOpenReject(template.id)}
                                >
                                  <XCircle className="mr-1 h-3 w-3" />
                                  差戻し
                                </Button>
                              </>
                            )}
                            {/* 編集ボタン */}
                            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                              <Link href={`/templates/${template.id}/edit`}>
                                <Pencil className="mr-1 h-3 w-3" />
                                編集
                              </Link>
                            </Button>
                            {/* 削除ボタン */}
                            <button
                              onClick={() => handleDelete(template.id, template.name)}
                              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                              title="削除"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="rounded-2xl bg-slate-100 p-5">
              <FileText className="h-12 w-12 text-slate-300 empty-state-icon" />
            </div>
            <div className="text-center">
              <p className="text-base font-medium text-slate-600">テンプレートがありません</p>
              <p className="mt-1 text-sm text-slate-400">最初のテンプレートを作成して文書発行を始めましょう</p>
            </div>
            <Button asChild className="mt-2 gap-2 shadow-sm">
              <Link href="/templates/new">
                <Plus className="h-4 w-4" />
                最初のテンプレートを作成
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
