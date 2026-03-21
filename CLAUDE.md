# CLAUDE.md

## プロジェクト概要
- システム名: B-Doc（ドキュメント発行システム / Document Issuance System）
- 目的: 企業内文書の作成→承認→発行→保管→監査までのライフサイクルを一元管理する
- スコープ: Phase 1（ログイン/権限・テンプレート・文書作成・承認・PDF発行・監査ログ）

## 技術スタック（変更禁止）
- フロントエンド: Next.js 14 App Router / TypeScript / Tailwind CSS v3
- バックエンド: Supabase (PostgreSQL + Storage + Auth + Edge Functions)
- PDF生成: @react-pdf/renderer
- デプロイ: Vercel

## Tailwind CSS 厳守事項
- バージョンは必ず v3（v4は使用禁止）
- postcss.config.js は `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }` の形式を使う
- tailwind.config.js の content に `./app/**/*.{ts,tsx}` と `./components/**/*.{ts,tsx}` を含める

## コーディング規約
- 関数はすべてasync/awaitで書く（Promiseチェーン禁止）
- Server ComponentsとClient Componentsを明確に分離する（use clientは最小限）
- Supabaseクライアントはサーバーサイドとクライアントサイドで使い分ける
- エラーハンドリングは必ずtry-catchで行い、ユーザーに分かりやすいメッセージを返す
- 型定義を先に書いてから実装する（型推論任せにしない）
- コメントは日本語で書く

## 禁止事項
- `any` 型の使用
- console.logの本番コード残存
- クライアントコンポーネントでの直接DB参照
- ハードコードされたユーザーID・パスワード
- v4 Tailwind構文の使用

## セキュリティ要件
- 承認前の文書はPDF発行不可（APIレベルで制御）
- 発行済み文書の本文は更新不可（DB制約 + APIレベル）
- 機密区分に応じたRLSポリシーを実装する
- 全重要操作は監査ログに記録する
