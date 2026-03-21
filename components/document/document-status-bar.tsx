import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/document/status-badge'

// =============================================================================
// 文書ステータスバー
// 現在のステータス・責任者・次のアクションをコンパクトに表示する
// =============================================================================

interface DocumentStatusBarProps {
  /** 現在の文書ステータス */
  status: string
  /** 責任者の表示名 */
  responsibleName: string
  /** 責任者の役割（例: 承認者、確認者） */
  responsibleRole: string
  /** 次に必要なアクションの説明 */
  nextAction: string
  /** 追加のクラス名 */
  className?: string
}

/**
 * 文書ステータスバーコンポーネント
 *
 * 文書詳細ページ上部に配置し、現在の進行状況を一目で把握できるようにする。
 * [ステータスバッジ] | 責任者: 名前（役割） | 次のアクション: 説明
 */
export function DocumentStatusBar({
  status,
  responsibleName,
  responsibleRole,
  nextAction,
  className,
}: DocumentStatusBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm',
        className,
      )}
    >
      {/* ステータスバッジ */}
      <StatusBadge status={status} />

      {/* 区切り線 */}
      <div className="hidden h-4 w-px bg-gray-300 sm:block" aria-hidden="true" />

      {/* 責任者情報 */}
      <div className="flex items-center gap-1 text-gray-600">
        <span className="font-medium text-gray-500">責任者:</span>
        <span className="text-gray-900">
          {responsibleName}
          <span className="ml-0.5 text-gray-500">（{responsibleRole}）</span>
        </span>
      </div>

      {/* 区切り線 */}
      <div className="hidden h-4 w-px bg-gray-300 sm:block" aria-hidden="true" />

      {/* 次のアクション */}
      <div className="flex items-center gap-1 text-gray-600">
        <span className="font-medium text-gray-500">次のアクション:</span>
        <span className="text-gray-900">{nextAction}</span>
      </div>
    </div>
  )
}
