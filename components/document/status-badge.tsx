import { Badge } from '@/components/ui/badge'
import { STATUS_BADGE_MAP, type DocumentStatus } from '@/types'
import { cn } from '@/lib/utils'

// ステータスの色をTailwindクラスにマッピング
const COLOR_CLASSES: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  emerald: 'bg-emerald-600 text-white border-emerald-600',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

interface StatusBadgeProps {
  /** 文書ステータス */
  status: DocumentStatus
  /** 追加のクラス名 */
  className?: string
}

/**
 * 文書ステータスバッジコンポーネント
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const badgeInfo = STATUS_BADGE_MAP[status]

  if (!badgeInfo) {
    return (
      <Badge variant="outline" className={className}>
        {status}
      </Badge>
    )
  }

  const colorClass = COLOR_CLASSES[badgeInfo.color] ?? COLOR_CLASSES.gray

  return (
    <Badge variant="outline" className={cn(colorClass, className)}>
      {badgeInfo.label}
    </Badge>
  )
}
