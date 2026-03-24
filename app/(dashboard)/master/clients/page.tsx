'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Plus, Search, Pencil, Trash2, Briefcase } from 'lucide-react'
import {
  getClients,
  saveClient,
  deleteClient,
} from '@/lib/store'
import type { LocalClient } from '@/lib/store'

// =============================================================================
// 取引先マスタ管理ページ（localStorage駆動）
// =============================================================================

/** 空のフォームデータ */
const emptyForm = (): Omit<LocalClient, 'id' | 'created_at'> => ({
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
})

export default function ClientsPage() {
  // --- 状態 ---
  const [clients, setClients] = useState<LocalClient[]>([])
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [deleteTarget, setDeleteTarget] = useState<LocalClient | null>(null)

  // --- 初期読み込み ---
  useEffect(() => {
    setClients(getClients())
  }, [])

  // --- 検索フィルタ ---
  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_person.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  // --- ダイアログを開く ---
  const openDialog = useCallback((client?: LocalClient) => {
    if (client) {
      setEditingId(client.id)
      setForm({
        name: client.name,
        contact_person: client.contact_person,
        email: client.email,
        phone: client.phone,
        address: client.address,
      })
    } else {
      setEditingId(null)
      setForm(emptyForm())
    }
    setDialogOpen(true)
  }, [])

  // --- 保存 ---
  const handleSave = useCallback(() => {
    const client: LocalClient = {
      id: editingId ?? `cli-${Date.now()}`,
      name: form.name,
      contact_person: form.contact_person,
      email: form.email,
      phone: form.phone,
      address: form.address,
      created_at: editingId
        ? clients.find((c) => c.id === editingId)?.created_at ?? new Date().toISOString()
        : new Date().toISOString(),
    }
    saveClient(client)
    setClients(getClients())
    setDialogOpen(false)
  }, [editingId, form, clients])

  // --- 削除確定 ---
  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteClient(deleteTarget.id)
    setClients(getClients())
    setDeleteTarget(null)
  }, [deleteTarget])

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <Briefcase className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">取引先管理</h1>
            <p className="text-sm text-slate-500">{filtered.length}件のデータ</p>
          </div>
        </div>
        <Button size="sm" onClick={() => openDialog()} className="gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" />
          新規追加
        </Button>
      </div>

      {/* 検索 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="会社名・担当者名・メールで検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {/* テーブル */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm table-zebra">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">会社名</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">担当者</th>
              <th className="hidden px-4 py-2.5 text-left font-medium text-slate-600 sm:table-cell">メール</th>
              <th className="hidden px-4 py-2.5 text-left font-medium text-slate-600 md:table-cell">電話番号</th>
              <th className="hidden px-4 py-2.5 text-left font-medium text-slate-600 lg:table-cell">住所</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Briefcase className="h-10 w-10 text-slate-200 empty-state-icon" />
                    <p className="text-sm font-medium text-slate-500">データがありません</p>
                    <p className="text-xs text-slate-400">「新規追加」から最初のデータを登録しましょう</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{c.contact_person}</td>
                  <td className="hidden px-4 py-2.5 text-slate-500 sm:table-cell">{c.email}</td>
                  <td className="hidden px-4 py-2.5 text-slate-500 md:table-cell">{c.phone}</td>
                  <td className="hidden px-4 py-2.5 text-slate-500 lg:table-cell">{c.address}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openDialog(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => setDeleteTarget(c)}
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
              {editingId ? '取引先を編集' : '取引先を追加'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              取引先の情報を入力してください。
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cli-name">会社名</Label>
              <Input
                id="cli-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例: 株式会社ABC"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cli-contact">担当者名</Label>
              <Input
                id="cli-contact"
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                placeholder="例: 鈴木一郎"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cli-email">メールアドレス</Label>
                <Input
                  id="cli-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="例: suzuki@abc.co.jp"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cli-phone">電話番号</Label>
                <Input
                  id="cli-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="例: 03-9999-8888"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cli-address">住所</Label>
              <Input
                id="cli-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="例: 東京都千代田区..."
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
