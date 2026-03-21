import { createBrowserClient } from '@supabase/ssr'

/**
 * ブラウザ用Supabaseクライアントを作成
 * クライアントコンポーネントで使用する
 * 環境変数未設定時はダミークライアントを返す
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 環境変数が未設定またはプレースホルダーの場合はダミーを返す
  if (!url || !key || url === 'https://xxxx.supabase.co') {
    // ダミークライアント: 全クエリが空結果を返す
    const dummy = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase未接続' } }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }), maybeSingle: async () => ({ data: null, error: null }), order: () => ({ limit: async () => ({ data: [], error: null }), data: [], error: null, range: () => ({ data: [], error: null }) }), data: [], error: null, count: 0 }), in: () => ({ data: [], error: null, order: () => ({ data: [], error: null }) }), is: () => ({ single: async () => ({ data: null, error: null }), data: [], error: null }), order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }), data: [], error: null }), range: () => ({ data: [], error: null }), data: [], error: null }), ilike: () => ({ data: [], error: null }), or: () => ({ data: [], error: null }), gte: () => ({ data: [], error: null, lte: () => ({ data: [], error: null }) }), lte: () => ({ data: [], error: null }), like: () => ({ data: [], error: null, count: 0 }), data: [], error: null, count: 0 }),
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }), data: null, error: null }),
        update: () => ({ eq: () => ({ data: null, error: null, select: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
        delete: () => ({ eq: () => ({ data: null, error: null }) }),
        upsert: () => ({ data: null, error: null }),
      }),
      rpc: async () => ({ data: null, error: null }),
      storage: { from: () => ({ upload: async () => ({ data: null, error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return dummy as any
  }

  return createBrowserClient(url, key)
}
