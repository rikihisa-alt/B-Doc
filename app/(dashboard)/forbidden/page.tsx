import Link from 'next/link'
import { ShieldOff } from 'lucide-react'

/**
 * 403 アクセス禁止ページ
 * ロール不足等でアクセスが拒否された場合に表示
 */
export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.12))] items-center justify-center px-4">
      <div className="text-center">
        {/* アイコン */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <ShieldOff className="h-6 w-6 text-red-400" strokeWidth={1.5} />
        </div>

        {/* ステータスコード */}
        <p className="text-5xl font-bold text-slate-200">403</p>

        {/* メッセージ */}
        <h1 className="mt-4 text-lg font-semibold text-slate-800">
          アクセス権限がありません
        </h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          このページを閲覧するために必要な権限がありません。
          アクセスが必要な場合はシステム管理者にお問い合わせください。
        </p>

        {/* ダッシュボードへのリンク */}
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          ダッシュボードへ戻る
        </Link>
      </div>
    </div>
  )
}
