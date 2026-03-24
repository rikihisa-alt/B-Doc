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
  ChevronDown,
  Save,
  Check,
  Landmark,
  UserCheck,
  Monitor,
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

/** 折りたたみ可能なセクションカード */
function CollapsibleSection({
  title,
  icon,
  iconColor,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ReactNode
  iconColor: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer select-none pb-4 transition-colors hover:bg-slate-50/50"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg font-bold">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-opacity-10 ${iconColor}`}>
              {icon}
            </div>
            {title}
          </CardTitle>
          <ChevronDown
            className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
          />
        </div>
      </CardHeader>
      {open && (
        <CardContent className="border-t border-slate-100 pt-5">
          {children}
        </CardContent>
      )}
    </Card>
  )
}

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
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-slate-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
              <Settings className="h-5 w-5 text-slate-600" />
            </div>
            設定
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            アカウントと組織の設定を管理します
          </p>
        </div>
        <Button onClick={handleSave} size="lg" className={`gap-2 shadow-sm transition-all duration-200 ${saved ? 'bg-green-600 hover:bg-green-700' : ''}`}>
          {saved ? (
            <>
              <Check className="h-4 w-4" />
              保存しました
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              設定を保存
            </>
          )}
        </Button>
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

      {/* セクション1: 会社基本情報 */}
      <CollapsibleSection
        title="会社基本情報"
        icon={<Building2 className="h-5 w-5" />}
        iconColor="text-purple-600"
        defaultOpen={true}
      >
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
            <Label htmlFor="s-company-kana">会社名フリガナ</Label>
            <Input
              id="s-company-kana"
              value={settings.companyNameKana}
              onChange={(e) => updateField('companyNameKana', e.target.value)}
              placeholder="カブシキガイシャ..."
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="s-company-en">英語名</Label>
            <Input
              id="s-company-en"
              value={settings.companyNameEn}
              onChange={(e) => updateField('companyNameEn', e.target.value)}
              placeholder="Company Name Inc."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-postal">郵便番号</Label>
            <Input
              id="s-postal"
              value={settings.companyPostalCode}
              onChange={(e) => updateField('companyPostalCode', e.target.value)}
              placeholder="000-0000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-address">住所</Label>
            <Input
              id="s-address"
              value={settings.companyAddress}
              onChange={(e) => updateField('companyAddress', e.target.value)}
              placeholder="東京都○○区..."
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="s-building">建物名・階</Label>
            <Input
              id="s-building"
              value={settings.companyAddressBuilding}
              onChange={(e) => updateField('companyAddressBuilding', e.target.value)}
              placeholder="○○ビル 3F"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-phone">電話番号</Label>
            <Input
              id="s-phone"
              value={settings.companyPhone}
              onChange={(e) => updateField('companyPhone', e.target.value)}
              placeholder="03-0000-0000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-fax">FAX番号</Label>
            <Input
              id="s-fax"
              value={settings.companyFax}
              onChange={(e) => updateField('companyFax', e.target.value)}
              placeholder="03-0000-0001"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-email">メールアドレス</Label>
            <Input
              id="s-email"
              type="email"
              value={settings.companyEmail}
              onChange={(e) => updateField('companyEmail', e.target.value)}
              placeholder="info@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-website">Webサイト</Label>
            <Input
              id="s-website"
              value={settings.companyWebsite}
              onChange={(e) => updateField('companyWebsite', e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* セクション2: 代表者・法人情報 */}
      <CollapsibleSection
        title="代表者・法人情報"
        icon={<UserCheck className="h-5 w-5" />}
        iconColor="text-green-600"
        defaultOpen={false}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="s-rep-name">代表者名</Label>
            <Input
              id="s-rep-name"
              value={settings.companyRepresentativeName}
              onChange={(e) => updateField('companyRepresentativeName', e.target.value)}
              placeholder="山田 太郎"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-rep-title">代表者役職</Label>
            <Input
              id="s-rep-title"
              value={settings.companyRepresentativeTitle}
              onChange={(e) => updateField('companyRepresentativeTitle', e.target.value)}
              placeholder="代表取締役"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="s-reg-number">法人番号（インボイス登録番号）</Label>
            <Input
              id="s-reg-number"
              value={settings.companyRegistrationNumber}
              onChange={(e) => updateField('companyRegistrationNumber', e.target.value)}
              placeholder="T1234567890123"
            />
            <p className="text-xs text-slate-400">適格請求書発行事業者の登録番号（T+13桁）</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-established">設立日</Label>
            <Input
              id="s-established"
              type="date"
              value={settings.companyEstablishedDate}
              onChange={(e) => updateField('companyEstablishedDate', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-capital">資本金</Label>
            <Input
              id="s-capital"
              value={settings.companyCapital}
              onChange={(e) => updateField('companyCapital', e.target.value)}
              placeholder="10,000,000円"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* セクション3: 振込先情報 */}
      <CollapsibleSection
        title="振込先情報"
        icon={<Landmark className="h-5 w-5" />}
        iconColor="text-orange-600"
        defaultOpen={false}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="s-bank">銀行名</Label>
            <Input
              id="s-bank"
              value={settings.companyBankName}
              onChange={(e) => updateField('companyBankName', e.target.value)}
              placeholder="みずほ銀行"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-branch">支店名</Label>
            <Input
              id="s-branch"
              value={settings.companyBankBranch}
              onChange={(e) => updateField('companyBankBranch', e.target.value)}
              placeholder="本店営業部"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-acct-type">口座種別</Label>
            <select
              id="s-acct-type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={settings.companyBankAccountType}
              onChange={(e) => updateField('companyBankAccountType', e.target.value)}
            >
              <option value="普通">普通</option>
              <option value="当座">当座</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-acct-number">口座番号</Label>
            <Input
              id="s-acct-number"
              value={settings.companyBankAccountNumber}
              onChange={(e) => updateField('companyBankAccountNumber', e.target.value)}
              placeholder="1234567"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="s-acct-name">口座名義</Label>
            <Input
              id="s-acct-name"
              value={settings.companyBankAccountName}
              onChange={(e) => updateField('companyBankAccountName', e.target.value)}
              placeholder="カ）バックリー"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* セクション4: システム設定 */}
      <CollapsibleSection
        title="システム設定"
        icon={<Monitor className="h-5 w-5" />}
        iconColor="text-blue-600"
        defaultOpen={false}
      >
        <div className="grid gap-5 sm:grid-cols-2">
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
      </CollapsibleSection>

      {/* フッター保存ボタン */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} size="lg">
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
