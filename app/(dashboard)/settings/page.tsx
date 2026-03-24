'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Settings,
  User,
  Building2,
  GitBranch,
  Shield,
  Users,
  Bell,
  ChevronRight,
  Save,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import { USER_ROLE_LABELS } from '@/types'
import { getSettings, saveSettings } from '@/lib/store'
import type { LocalSettings } from '@/lib/store'

// =============================================================================
// 設定ページ（localStorage駆動 - 全フィールド編集可能）
// =============================================================================

// デモ用プロフィールデータ（静的）
const demoProfile = {
  display_name: '管理者 太郎',
  email: 'taro@backlly.example.com',
  department: '人事部',
  position: '主任',
  roles: ['system_admin', 'document_issuer'],
  last_login_at: '2026-03-20T09:00:00Z',
}

const demoUserId = 'demo-user-001'

export default function SettingsPage() {
  // --- 状態 ---
  const [settings, setSettingsState] = useState<LocalSettings | null>(null)
  const [saved, setSaved] = useState(false)

  const profile = demoProfile
  const userRoles: string[] = profile.roles
  const isAdmin = userRoles.includes('system_admin')

  // --- 初期読み込み ---
  useEffect(() => {
    setSettingsState(getSettings())
  }, [])

  // --- 設定保存 ---
  const handleSave = useCallback(() => {
    if (!settings) return
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [settings])

  // --- 設定フィールド更新ヘルパー ---
  const updateField = useCallback(<K extends keyof LocalSettings>(key: K, value: LocalSettings[K]) => {
    setSettingsState((prev) => prev ? { ...prev, [key]: value } : prev)
  }, [])

  if (!settings) return null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Settings className="h-6 w-6 text-slate-600" />
          設定
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          アカウントと組織の設定を管理します
        </p>
      </div>

      {/* ユーザープロフィールセクション */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-blue-600" />
            ユーザープロフィール
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">氏名</p>
              <p className="mt-1.5 text-sm font-medium text-slate-900">{profile.display_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">メールアドレス</p>
              <p className="mt-1.5 text-sm text-slate-900">{profile.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">部署</p>
              <p className="mt-1.5 text-sm text-slate-900">{profile.department ?? '--'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">役職</p>
              <p className="mt-1.5 text-sm text-slate-900">{profile.position ?? '--'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">割り当てロール</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {userRoles.length > 0 ? (
                  userRoles.map((role: string) => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      {USER_ROLE_LABELS[role] ?? role}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="text-xs text-slate-400">閲覧者</Badge>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">最終ログイン</p>
              <p className="mt-1.5 text-sm text-slate-500">
                {profile.last_login_at
                  ? new Date(profile.last_login_at).toLocaleString('ja-JP')
                  : '--'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">ユーザーID</p>
              <code className="mt-1.5 block rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">
                {demoUserId}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* システム設定（編集可能） */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-purple-600" />
              システム設定
            </CardTitle>
            <Button size="sm" onClick={handleSave}>
              {saved ? (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  保存しました
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-4 w-4" />
                  設定を保存
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-company">会社名</Label>
              <Input
                id="s-company"
                value={settings.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-system">システム名</Label>
              <Input
                id="s-system"
                value={settings.systemName}
                onChange={(e) => updateField('systemName', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-prefix">文書番号プレフィックス</Label>
              <Input
                id="s-prefix"
                value={settings.defaultDocumentPrefix}
                onChange={(e) => updateField('defaultDocumentPrefix', e.target.value)}
              />
              <p className="text-xs text-slate-400">例: DOC, INV, EMP</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-interval">自動保存間隔（分）</Label>
              <Input
                id="s-interval"
                type="number"
                min={1}
                max={60}
                value={settings.autoSaveInterval}
                onChange={(e) => updateField('autoSaveInterval', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-watermark-draft">下書き透かし文字</Label>
              <Input
                id="s-watermark-draft"
                value={settings.pdfWatermarkDraft}
                onChange={(e) => updateField('pdfWatermarkDraft', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-watermark-conf">社外秘透かし文字</Label>
              <Input
                id="s-watermark-conf"
                value={settings.pdfWatermarkConfidential}
                onChange={(e) => updateField('pdfWatermarkConfidential', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* クイックリンク */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">各種設定</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {isAdmin && (
            <Link
              href="/settings/permissions"
              className="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-slate-900">権限管理</h3>
                <p className="text-xs text-slate-500">ユーザーとロールの管理</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1" />
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/settings/workflows"
              className="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                <GitBranch className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-slate-900">ワークフロー設定</h3>
                <p className="text-xs text-slate-500">承認フローの作成・編集</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1" />
            </Link>
          )}

          {(isAdmin || userRoles.includes('audit_viewer')) && (
            <Link
              href="/audit-logs"
              className="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-slate-900">監査ログ</h3>
                <p className="text-xs text-slate-500">操作履歴の確認・出力</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1" />
            </Link>
          )}

          <Link
            href="/settings"
            className="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <Bell className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-slate-900">通知設定</h3>
              <p className="text-xs text-slate-500">メール・Slack通知の管理</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  )
}
