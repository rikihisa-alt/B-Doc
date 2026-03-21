import Link from 'next/link'

/**
 * 404 ページ
 * シンプルな中央配置レイアウトでダッシュボードへの導線を提供
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        {/* ステータスコード */}
        <p className="text-6xl font-bold text-slate-200">404</p>

        {/* メッセージ */}
        <h1 className="mt-4 text-lg font-semibold text-slate-800">
          ページが見つかりません
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          お探しのページは存在しないか、移動した可能性があります。
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
