'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'

/**
 * 会社・事業所マスタ管理ページ
 */
export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<{ id: string; name: string; created_at: string }[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const { data } = await supabase
        .from('organizations')
        .select('id, name, created_at')
        .is('deleted_at', null)
        .order('name')
      setOrganizations(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [])

  const filtered = organizations.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">会社・事業所管理</h1>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          新規追加
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="会社名で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">会社名</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">登録日</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">読み込み中...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">データがありません</td>
              </tr>
            ) : (
              filtered.map((org) => (
                <tr key={org.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{org.name}</td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {new Date(org.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="sm">編集</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
