'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LogOut, User } from 'lucide-react'
import { USER_ROLE_LABELS } from '@/types'

interface HeaderProps {
  userName: string
  userRole: string
}

export function Header({ userName, userRole }: HeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const roleLabel = USER_ROLE_LABELS[userRole as keyof typeof USER_ROLE_LABELS] ?? userRole

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700">{userName}</span>
          <Badge variant="secondary" className="text-xs">
            {roleLabel}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="ログアウト">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
