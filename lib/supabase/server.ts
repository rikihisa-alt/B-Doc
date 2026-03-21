import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * サーバー用Supabaseクライアントを作成
 * 環境変数未設定時はダミークライアントを返す
 */
export async function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url === 'https://xxxx.supabase.co') {
    return createDummyServerClient()
  }

  const cookieStore = await cookies()

  return createSSRServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Record<string, unknown>)
          )
        } catch {
          // Server Component
        }
      },
    },
  })
}

function createDummyServerClient() {
  const createChain = (): Record<string, unknown> => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop: string) {
        if (prop === 'then') return undefined
        if (prop === 'data') return []
        if (prop === 'error') return null
        if (prop === 'count') return 0
        if (prop === 'single' || prop === 'maybeSingle') {
          return async () => ({ data: null, error: null })
        }
        return (..._args: unknown[]) => new Proxy({} as Record<string, unknown>, handler)
      },
    }
    return new Proxy({} as Record<string, unknown>, handler)
  }

  const dummy = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: () => createChain(),
    rpc: async () => ({ data: null, error: null }),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return dummy as any
}
