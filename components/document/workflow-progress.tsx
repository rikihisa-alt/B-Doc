import { cn } from '@/lib/utils'

// =============================================================================
// ワークフロー進行状況コンポーネント
// 承認フローの各ステップを縦型のステッパーで表示する
// =============================================================================

/** ワークフローステップの表示情報 */
interface WorkflowStepItem {
  /** ステップのラベル（例: 確認者による確認） */
  label: string
  /** ステップのステータス */
  status: 'completed' | 'current' | 'pending'
  /** 担当者名（任意） */
  actor?: string
  /** 完了日時（任意、表示用にフォーマット済みの文字列） */
  date?: string
}

interface WorkflowProgressProps {
  /** ワークフローのステップ一覧 */
  steps: WorkflowStepItem[]
  /** 追加のクラス名 */
  className?: string
}

/**
 * ワークフロー進行状況コンポーネント
 *
 * 縦型のステッパーUIで、承認フローの進行状況を表示する:
 * - 完了ステップ: 緑のチェックマーク
 * - 現在のステップ: 青のドット（パルスアニメーション付き）
 * - 未来のステップ: グレーの空円
 */
export function WorkflowProgress({ steps, className }: WorkflowProgressProps) {
  return (
    <nav className={cn('flex flex-col', className)} aria-label="ワークフロー進行状況">
      <ol className="relative space-y-0">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1

          return (
            <li key={index} className="relative flex gap-3">
              {/* 縦線（最後のステップ以外） */}
              {!isLast && (
                <div
                  className={cn(
                    'absolute left-[11px] top-[24px] w-0.5',
                    // 次のステップまでの縦線の高さ（ステップ間の距離に合わせる）
                    'h-[calc(100%-0px)]',
                    step.status === 'completed'
                      ? 'bg-emerald-300'
                      : 'bg-gray-200',
                  )}
                  aria-hidden="true"
                />
              )}

              {/* ステップアイコン */}
              <div className="relative z-10 flex shrink-0 items-start pt-0.5">
                {step.status === 'completed' && (
                  /* 完了: 緑のチェックマーク */
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                    <svg
                      className="h-3.5 w-3.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </div>
                )}

                {step.status === 'current' && (
                  /* 現在: 青のドット（パルスアニメーション付き） */
                  <div className="relative flex h-6 w-6 items-center justify-center">
                    {/* パルスリング */}
                    <span className="absolute h-6 w-6 animate-ping rounded-full bg-blue-400 opacity-20" />
                    {/* メインドット */}
                    <span className="relative h-3 w-3 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                  </div>
                )}

                {step.status === 'pending' && (
                  /* 未来: グレーの空円 */
                  <div className="flex h-6 w-6 items-center justify-center">
                    <span className="h-3 w-3 rounded-full border-2 border-gray-300 bg-white" />
                  </div>
                )}
              </div>

              {/* ステップ情報 */}
              <div className={cn('min-w-0 pb-6', isLast && 'pb-0')}>
                <p
                  className={cn(
                    'text-sm font-medium leading-6',
                    step.status === 'completed' && 'text-emerald-700',
                    step.status === 'current' && 'text-blue-700',
                    step.status === 'pending' && 'text-gray-400',
                  )}
                >
                  {step.label}
                </p>

                {/* 担当者・日時（完了または現在ステップの場合） */}
                {(step.actor || step.date) && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                    {step.actor && <span>{step.actor}</span>}
                    {step.actor && step.date && (
                      <span className="text-gray-300" aria-hidden="true">|</span>
                    )}
                    {step.date && <span>{step.date}</span>}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
