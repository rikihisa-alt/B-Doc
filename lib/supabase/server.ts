import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * サーバー用Supabaseクライアントを作成
 * Server Component / Route Handler / Server Action で使用する
 * 環境変数未設定時はダミークライアントを返す
 */
export async function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 環境変数が未設定またはプレースホルダーの場合
  if (!url || !key || url === 'https://xxxx.supabase.co') {
    const dummy = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }), data: [], error: null, count: 0, order: () => ({ limit: () => ({ data: [], error: null }), data: [], error: null, range: () => ({ data: [], error: null }) }) }), in: () => ({ data: [], error: null }), is: () => ({ single: async () => ({ data: null, error: null }), data: [], error: null }), order: () => ({ data: [], error: null, limit: () => ({ data: [], error: null }) }), data: [], error: null, count: 0 }),
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }), error: null }),
        update: () => ({ eq: () => ({ error: null, select: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
        delete: () => ({ eq: () => ({ error: null }) }),
      }),
      rpc: async () => ({ data: null, error: null }),
    }
    return dummy as ReturnType<typeof createSSRServerClient>
  }

  const cookieStore = await cookies()

  return createSSRServerClient(
    url,
    key,
    {
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
            // Server Component からの呼び出し時はcookieを設定できないため無視する
          }
        },
      },
    }
  )
}
