import { cn } from '@/lib/utils'

// =============================================================================
// 差戻し通知コンポーネント
// 差戻し・却下時にページ上部に表示する赤い警告バー
// =============================================================================

interface ReturnNoticeProps {
  /** 差戻しを行った人の名前 */
  returnerName: string
  /** 差戻しを行った人の役割（例: 承認者、部長） */
  returnerRole: string
  /** 差戻しコメント */
  comment: string
  /** 差戻し日時（表示用にフォーマット済みの文字列） */
  returnedAt: string
  /** 追加のクラス名 */
  className?: string
}

/**
 * 差戻し通知コンポーネント
 *
 * 文書が差し戻された際にページ上部に表示する。
 * 赤い背景の目立つアラートで、差戻し者・理由・日時を表示する。
 */
export function ReturnNotice({
  returnerName,
  returnerRole,
  comment,
  returnedAt,
  className,
}: ReturnNoticeProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-red-300 bg-red-50 px-4 py-3',
        className,
      )}
      role="alert"
    >
      {/* 差戻し者情報 */}
      <div className="flex items-start gap-2">
        {/* 警告アイコン */}
        <svg
          className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>

        <div className="flex-1 space-y-1">
          {/* ヘッダー行 */}
          <p className="text-sm font-semibold text-red-800">
            差戻し：{returnerRole} {returnerName} より
          </p>

          {/* コメント本文 */}
          <p className="text-sm leading-relaxed text-red-700">
            「{comment}」
          </p>

          {/* 日時 */}
          <p className="text-xs text-red-500">{returnedAt}</p>
        </div>
      </div>
    </div>
  )
}
