import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middlewareでセッションをリフレッシュするヘルパー
 * middleware.ts から呼び出して、認証セッションを最新に保つ
 */
export async function updateSession(request: NextRequest) {
  // レスポンスを作成（後でcookieを書き込む）
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          // リクエストcookieを更新（Server Componentが最新値を読めるように）
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // レスポンスを再作成してcookieをセット
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // セッションをリフレッシュ（期限切れトークンの更新）
  // getUser() を呼ぶことでトークンのリフレッシュが自動的に行われる
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 未認証ユーザーを認証ページにリダイレクト
  // 公開ページのパスはここで除外する
  const publicPaths = ['/login', '/signup', '/auth/callback', '/auth/confirm']
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
