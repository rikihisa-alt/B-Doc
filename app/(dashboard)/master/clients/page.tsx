import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

/**
 * 取引先マスタ管理ページ
 * TODO: 取引先テーブル作成後に実装
 */
export default function ClientsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">取引先管理</h1>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          新規追加
        </Button>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
        取引先マスタは準備中です
      </div>
    </div>
  )
}
