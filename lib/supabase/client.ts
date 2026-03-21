import { createBrowserClient } from '@supabase/ssr'

/**
 * ブラウザ用Supabaseクライアントを作成
 * クライアントコンポーネントで使用する
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
