'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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
import { Plus, Search, Pencil, Trash2, X, Building2 } from 'lucide-react'
import {
  getOrganizations,
  saveOrganization,
  deleteOrganization,
} from '@/lib/store'
import type { LocalOrganization } from '@/lib/store'

// =============================================================================
// 会社・事業所マスタ管理ページ（localStorage駆動）
// =============================================================================

/** 空のフォームデータ */
const emptyForm = (): Omit<LocalOrganization, 'id' | 'created_at'> => ({
  name: '',
  address: '',
  phone: '',
  representative: '',
})

export default function OrganizationsPage() {
  // --- 状態 ---
  const [organizations, setOrganizations] = useState<LocalOrganization[]>([])
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [deleteTarget, setDeleteTarget] = useState<LocalOrganization | null>(null)

  // --- 初期読み込み ---
  useEffect(() => {
    setOrganizations(getOrganizations())
  }, [])

  // --- 検索フィルタ ---
  const filtered = organizations.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.representative.toLowerCase().includes(search.toLowerCase())
  )

  // --- ダイアログを開く（新規 or 編集） ---
  const openDialog = useCallback((org?: LocalOrganization) => {
    if (org) {
      setEditingId(org.id)
      setForm({ name: org.name, address: org.address, phone: org.phone, representative: org.representative })
    } else {
      setEditingId(null)
      setForm(emptyForm())
    }
    setDialogOpen(true)
  }, [])

  // --- 保存 ---
  const handleSave = useCallback(() => {
    const org: LocalOrganization = {
      id: editingId ?? `org-${Date.now()}`,
      name: form.name,
      address: form.address,
      phone: form.phone,
      representative: form.representative,
      created_at: editingId
        ? organizations.find((o) => o.id === editingId)?.created_at ?? new Date().toISOString()
        : new Date().toISOString(),
    }
    saveOrganization(org)
    setOrganizations(getOrganizations())
    setDialogOpen(false)
  }, [editingId, form, organizations])

  // --- 削除確定 ---
  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteOrganization(deleteTarget.id)
    setOrganizations(getOrganizations())
    setDeleteTarget(null)
  }, [deleteTarget])

  return (
    <div className="space-y-4">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Building2 className="h-5 w-5 text-purple-600" />
          会社・事業所管理
        </h1>
        <Button size="sm" onClick={() => openDialog()}>
          <Plus className="mr-1.5 h-4 w-4" />
          新規追加
        </Button>
      </div>

      {/* 検索 */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="会社名・代表者名で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* テーブル */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">会社名</th>
              <th className="hidden px-4 py-2.5 text-left font-medium text-slate-600 sm:table-cell">住所</th>
              <th className="hidden px-4 py-2.5 text-left font-medium text-slate-600 md:table-cell">電話番号</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">代表者</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">登録日</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  データがありません
                </td>
              </tr>
            ) : (
              filtered.map((org) => (
                <tr key={org.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{org.name}</td>
                  <td className="hidden px-4 py-2.5 text-slate-500 sm:table-cell">{org.address}</td>
                  <td className="hidden px-4 py-2.5 text-slate-500 md:table-cell">{org.phone}</td>
                  <td className="px-4 py-2.5 text-slate-500">{org.representative}</td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {new Date(org.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openDialog(org)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => setDeleteTarget(org)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 追加・編集ダイアログ */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editingId ? '会社・事業所を編集' : '会社・事業所を追加'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              必要な情報を入力してください。
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">会社名</Label>
              <Input
                id="org-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例: 株式会社Backlly"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-address">住所</Label>
              <Input
                id="org-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="例: 東京都渋谷区..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-phone">電話番号</Label>
              <Input
                id="org-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="例: 03-1234-5678"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-rep">代表者名</Label>
              <Input
                id="org-rep"
                value={form.representative}
                onChange={(e) => setForm({ ...form, representative: e.target.value })}
                placeholder="例: 山田太郎"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave} disabled={!form.name.trim()}>
              {editingId ? '更新' : '追加'}
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
              「{deleteTarget?.name}」を削除してもよろしいですか？この操作は取り消せません。
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
