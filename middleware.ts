import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 認証が不要なパス
const PUBLIC_PATHS = ['/login']

export async function middleware(request: NextRequest) {
  // TODO: Supabase接続後に認証を有効化する
  // 現在は認証をバイパスして全ページアクセス可能にしている
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
