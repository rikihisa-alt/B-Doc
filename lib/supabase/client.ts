import { createBrowserClient } from '@supabase/ssr'

/**
 * ブラウザ用Supabaseクライアントを作成
 * クライアントコンポーネントで使用する
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url === 'https://xxxx.supabase.co') {
    throw new Error('Supabaseの接続情報が設定されていません。.env.local を確認してください。')
  }

  return createBrowserClient(url, key)
}
