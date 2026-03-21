'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Clock, RotateCcw } from 'lucide-react'

/** 承認ステップの情報 */
interface ApprovalStep {
  /** ステップID */
  id: string
  /** ステップ順序 */
  stepOrder: number
  /** 承認者名 */
  approverName: string
  /** 承認者の役割 */
  approverRole: string
  /** アクション状態 */
  action: 'approved' | 'rejected' | 'returned' | 'pending'
  /** コメント */
  comment: string | null
  /** 決定日時 */
  decidedAt: string | null
}

interface ApprovalTimelineProps {
  /** 承認ステップ一覧 */
  steps: ApprovalStep[]
  /** 現在のステップ番号 */
  currentStep?: number
  /** 追加CSSクラス */
  className?: string
}

/** アクションに対応するアイコンとスタイル */
const ACTION_CONFIG: Record<
  ApprovalStep['action'],
  {
    icon: typeof CheckCircle2
    label: string
    color: string
    bgColor: string
    borderColor: string
    lineColor: string
  }
> = {
  approved: {
    icon: CheckCircle2,
    label: '承認',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    lineColor: 'bg-green-300',
  },
  rejected: {
    icon: XCircle,
    label: '却下',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    lineColor: 'bg-red-300',
  },
  returned: {
    icon: RotateCcw,
    label: '差戻し',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    lineColor: 'bg-orange-300',
  },
  pending: {
    icon: Clock,
    label: '未処理',
    color: 'text-gray-400',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    lineColor: 'bg-gray-200',
  },
}

/**
 * 承認タイムライン表示コンポーネント
 * ワークフローの各ステップの承認状況をタイムライン形式で表示する
 */
export function ApprovalTimeline({
  steps,
  currentStep,
  className,
}: ApprovalTimelineProps) {
  if (steps.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-500">
        承認ステップがありません。
      </p>
    )
  }

  return (
    <div className={cn('space-y-0', className)}>
      {steps.map((step, index) => {
        const config = ACTION_CONFIG[step.action]
        const Icon = config.icon
        const isLast = index === steps.length - 1
        const isCurrent = currentStep === step.stepOrder

        return (
          <div key={step.id} className="relative flex gap-4">
            {/* タイムラインの線とアイコン */}
            <div className="flex flex-col items-center">
              {/* アイコン */}
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2',
                  config.bgColor,
                  config.borderColor,
                  isCurrent && 'ring-2 ring-blue-400 ring-offset-2'
                )}
              >
                <Icon className={cn('h-5 w-5', config.color)} />
              </div>
              {/* 接続線 */}
              {!isLast && (
                <div
                  className={cn('w-0.5 flex-1 min-h-[24px]', config.lineColor)}
                />
              )}
            </div>

            {/* コンテンツ */}
            <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
              <div
                className={cn(
                  'rounded-lg border p-3',
                  config.borderColor,
                  config.bgColor
                )}
              >
                {/* ヘッダー */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      ステップ {step.stepOrder}: {step.approverName}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({step.approverRole})
                    </span>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                      config.color,
                      config.bgColor
                    )}
                  >
                    {config.label}
                  </span>
                </div>

                {/* 日時 */}
                {step.decidedAt && (
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(step.decidedAt).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}

                {/* コメント */}
                {step.comment && (
                  <p className="mt-2 rounded bg-white/60 p-2 text-sm text-gray-700">
                    {step.comment}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export type { ApprovalStep, ApprovalTimelineProps }
