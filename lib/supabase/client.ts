import { createBrowserClient } from '@supabase/ssr'

/**
 * ブラウザ用Supabaseクライアントを作成
 * 環境変数未設定時はダミークライアントを返す
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url === 'https://xxxx.supabase.co') {
    return createDummyClient()
  }

  return createBrowserClient(url, key)
}

/**
 * Supabase未接続時のダミークライアント
 * 全クエリが空結果を返すProxyベースの実装
 */
function createDummyClient() {
  // チェーン可能なクエリビルダーのモック
  const createChain = (): Record<string, unknown> => {
    const result = { data: [] as unknown[], error: null, count: 0 }
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop: string) {
        // 終端メソッド
        if (prop === 'then') return undefined
        if (prop === 'data') return result.data
        if (prop === 'error') return result.error
        if (prop === 'count') return result.count
        // 非同期終端
        if (prop === 'single' || prop === 'maybeSingle') {
          return async () => ({ data: null, error: null })
        }
        // チェーンメソッド（select, eq, in, is, order, limit, range, etc.）
        return (..._args: unknown[]) => new Proxy({} as Record<string, unknown>, handler)
      },
    }
    return new Proxy({} as Record<string, unknown>, handler)
  }

  const dummy = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: 'Supabase未接続: 環境変数を設定してください' },
      }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: () => createChain(),
    rpc: async () => ({ data: null, error: null }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return dummy as any
}
