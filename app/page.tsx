import { redirect } from 'next/navigation'

// ルートページはダッシュボードにリダイレクト
export default function Home() {
  redirect('/login')
}
