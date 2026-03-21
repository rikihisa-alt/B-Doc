import { cn } from '@/lib/utils'

// =============================================================================
// ステータスバッジ定義
// 各ステータスに対応するラベルとTailwindクラスを静的に定義
// =============================================================================

/** ステータスごとのバッジ表示情報 */
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft:            { label: '下書き',       className: 'bg-gray-100 text-gray-700 border border-gray-300' },
  pending_confirm:  { label: '確認待ち',     className: 'bg-amber-50 text-amber-700 border border-amber-300' },
  returned:         { label: '差戻し',       className: 'bg-red-50 text-red-700 border border-red-400 font-semibold' },
  pending_approval: { label: '承認待ち',     className: 'bg-blue-50 text-blue-700 border border-blue-300' },
  approved:         { label: '承認済み',     className: 'bg-emerald-50 text-emerald-700 border border-emerald-300' },
  issuing:          { label: '発行準備中',   className: 'bg-violet-50 text-violet-700 border border-violet-300' },
  issued:           { label: '発行済み',     className: 'bg-emerald-600 text-white' },
  sent:             { label: '送付済み',     className: 'bg-teal-600 text-white' },
  cancelled:        { label: '取消',         className: 'bg-red-700 text-white' },
  expired:          { label: '失効',         className: 'bg-gray-500 text-white' },
  superseded:       { label: '差替済み',     className: 'bg-gray-400 text-white' },
}

interface StatusBadgeProps {
  /** 文書ステータス文字列 */
  status: string
  /** 追加のクラス名 */
  className?: string
}

/**
 * 文書ステータスバッジコンポーネント
 *
 * 全ステータスに対応する色・ラベルを静的に定義し、
 * cn() でインラインに合成することで Tailwind の JIT で確実にクラスが生成される。
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const badge = STATUS_BADGE[status]

  // 未定義ステータスのフォールバック
  if (!badge) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          'bg-gray-100 text-gray-600 border border-gray-300',
          className,
        )}
      >
        {status}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        badge.className,
        className,
      )}
    >
      {badge.label}
    </span>
  )
}
