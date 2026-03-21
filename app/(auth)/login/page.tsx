'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, AlertTriangle } from 'lucide-react'

/**
 * 企業向けログインページ
 * - 中央カード配置、ニュートラル背景
 * - ソーシャルログイン・サインアップリンクなし
 * - 企業内利用者専用の警告表示
 */
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('メールアドレスまたはパスワードが正しくありません')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('ログイン中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        {/* ログインカード */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          {/* ヘッダー */}
          <div className="border-b border-slate-100 px-6 pt-8 pb-6 text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded bg-slate-900">
              <Lock className="h-5 w-5 text-white" strokeWidth={1.75} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              B-Doc
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              企業文書発行・統制システム
            </p>
          </div>

          {/* フォーム */}
          <div className="px-6 py-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {/* エラーメッセージ */}
              {error && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* メールアドレス */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              {/* パスワード */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              {/* ログインボタン */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'ログイン中...' : 'ログイン'}
              </button>
            </form>
          </div>
        </div>

        {/* セキュリティ警告 */}
        <div className="mt-4 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
          <div className="text-[10px] leading-relaxed text-amber-800">
            <p className="font-medium">このシステムは企業内利用者専用です</p>
            <p className="text-amber-700">
              不正アクセスは記録・監視されています
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
