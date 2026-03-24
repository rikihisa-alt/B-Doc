'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Plus, Search, Pencil, Trash2, Users } from 'lucide-react'
import {
  getEmployees,
  saveEmployee,
  deleteEmployee,
} from '@/lib/store'
import type { LocalEmployee } from '@/lib/store'
import { USER_ROLE_LABELS } from '@/types'

// =============================================================================
// 従業員マスタ管理ページ（localStorage駆動）
// =============================================================================

/** 部署選択肢 */
const DEPARTMENTS = ['営業部', '総務部', '開発部', '経理部', '人事部', '企画部', '法務部']

/** ロール選択肢 */
const ROLES = [
  { value: 'system_admin', label: 'システム管理者' },
  { value: 'doc_controller', label: '文書管理者' },
  { value: 'creator', label: '作成者' },
  { value: 'confirmer', label: '確認者' },
  { value: 'approver', label: '承認者' },
  { value: 'issuer', label: '発行者' },
  { value: 'viewer', label: '閲覧者' },
]

/** 空のフォームデータ */
const emptyForm = (): Omit<LocalEmployee, 'id' | 'joined_at'> => ({
  name: '',
  email: '',
  department: '',
  position: '',
  role: 'viewer',
})

export default function EmployeesPage() {
  // --- 状態 ---
  const [employees, setEmployees] = useState<LocalEmployee[]>([])
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [deleteTarget, setDeleteTarget] = useState<LocalEmployee | null>(null)

  // --- 初期読み込み ---
  useEffect(() => {
    setEmployees(getEmployees())
  }, [])

  // --- フィルタ ---
  const filtered = employees.filter((e) => {
    const matchSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())
    const matchDept = deptFilter === 'all' || e.department === deptFilter
    return matchSearch && matchDept
  })

  // --- 部署一覧（実データから取得） ---
  const existingDepts = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)))

  // --- ダイアログを開く ---
  const openDialog = useCallback((emp?: LocalEmployee) => {
    if (emp) {
      setEditingId(emp.id)
      setForm({
        name: emp.name,
        email: emp.email,
        department: emp.department,
        position: emp.position,
        role: emp.role,
      })
    } else {
      setEditingId(null)
      setForm(emptyForm())
    }
    setDialogOpen(true)
  }, [])

  // --- 保存 ---
  const handleSave = useCallback(() => {
    const emp: LocalEmployee = {
      id: editingId ?? `emp-${Date.now()}`,
      name: form.name,
      email: form.email,
      department: form.department,
      position: form.position,
      role: form.role,
      joined_at: editingId
        ? employees.find((e) => e.id === editingId)?.joined_at ?? new Date().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    }
    saveEmployee(emp)
    setEmployees(getEmployees())
    setDialogOpen(false)
  }, [editingId, form, employees])

  // --- 削除確定 ---
  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteEmployee(deleteTarget.id)
    setEmployees(getEmployees())
    setDeleteTarget(null)
  }, [deleteTarget])

  // --- ロールのバッジ色 ---
  const roleBadgeColor = (role: string): string => {
    const map: Record<string, string> = {
      system_admin: 'bg-red-50 text-red-700 border-red-200',
      doc_controller: 'bg-purple-50 text-purple-700 border-purple-200',
      creator: 'bg-green-50 text-green-700 border-green-200',
      confirmer: 'bg-teal-50 text-teal-700 border-teal-200',
      approver: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      issuer: 'bg-orange-50 text-orange-700 border-orange-200',
      viewer: 'bg-gray-50 text-gray-700 border-gray-200',
    }
    return map[role] ?? 'bg-gray-50 text-gray-700 border-gray-200'
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">従業員管理</h1>
            <p className="text-sm text-slate-500">{filtered.length}件のデータ</p>
          </div>
        </div>
        <Button size="sm" onClick={() => openDialog()} className="gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" />
          新規追加
        </Button>
      </div>

      {/* 検索＋フィルタ */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="氏名・メールで検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="部署で絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべての部署</SelectItem>
            {existingDepts.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* テーブル */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm table-zebra">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">氏名</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">メール</th>
              <th className="hidden px-4 py-2.5 text-left font-medium text-slate-600 sm:table-cell">部署</th>
              <th className="hidden px-4 py-2.5 text-left font-medium text-slate-600 md:table-cell">役職</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">ロール</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-10 w-10 text-slate-200 empty-state-icon" />
                    <p className="text-sm font-medium text-slate-500">データがありません</p>
                    <p className="text-xs text-slate-400">「新規追加」から最初のデータを登録しましょう</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((emp) => (
                <tr key={emp.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{emp.name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{emp.email}</td>
                  <td className="hidden px-4 py-2.5 text-slate-500 sm:table-cell">{emp.department || '-'}</td>
                  <td className="hidden px-4 py-2.5 text-slate-500 md:table-cell">{emp.position || '-'}</td>
                  <td className="px-4 py-2.5">
                    <Badge className={`text-[10px] ${roleBadgeColor(emp.role)}`}>
                      {USER_ROLE_LABELS[emp.role] ?? emp.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openDialog(emp)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => setDeleteTarget(emp)}
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
              {editingId ? '従業員を編集' : '従業員を追加'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              従業員の情報を入力してください。
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="emp-name">氏名</Label>
              <Input
                id="emp-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例: 田中太郎"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-email">メールアドレス</Label>
              <Input
                id="emp-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="例: tanaka@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>部署</Label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="部署を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-position">役職</Label>
                <Input
                  id="emp-position"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  placeholder="例: 部長"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ロール</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="ロールを選択" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave} disabled={!form.name.trim() || !form.email.trim()}>
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
