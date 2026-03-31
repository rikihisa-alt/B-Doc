import { cn } from '@/lib/utils'

// =============================================================================
// ステータスバッジ定義
// 各ステータスに対応するラベルとTailwindクラスを静的に定義
// =============================================================================

/** ステータスごとのバッジ表示情報 */
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft:            { label: '下書き',       className: 'bg-transparent text-gray-500 border border-gray-300' },
  pending_confirm:  { label: '確認待ち',     className: 'bg-transparent text-gray-700 border border-gray-400' },
  returned:         { label: '差戻し',       className: 'bg-gray-900 text-white border border-gray-900' },
  pending_approval: { label: '承認待ち',     className: 'bg-transparent text-gray-700 border border-gray-600' },
  approved:         { label: '承認済み',     className: 'bg-transparent text-gray-700 border border-gray-500' },
  issuing:          { label: '発行準備中',   className: 'bg-transparent text-gray-600 border border-gray-400' },
  issued:           { label: '発行済み',     className: 'bg-gray-900 text-white border border-gray-900' },
  sent:             { label: '送付済み',     className: 'bg-gray-700 text-white border border-gray-700' },
  cancelled:        { label: '取消',         className: 'bg-transparent text-gray-400 border border-gray-300 line-through' },
  expired:          { label: '失効',         className: 'bg-transparent text-gray-400 border border-gray-300' },
  superseded:       { label: '差替済み',     className: 'bg-transparent text-gray-400 border border-gray-300' },
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
          'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium',
          'bg-transparent text-gray-500 border border-gray-300',
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
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium',
        badge.className,
        className,
      )}
    >
      {badge.label}
    </span>
  )
}
