# B-Doc - ドキュメント発行システム

企業内文書の作成・承認・発行・保管・監査までのライフサイクルを一元管理するシステムです。

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router) / TypeScript / Tailwind CSS v3
- **バックエンド**: Supabase (PostgreSQL + Storage + Auth)
- **PDF生成**: @react-pdf/renderer
- **デプロイ**: Vercel

## セットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.local.example .env.local
# .env.local を編集してSupabaseの接続情報を設定

# 開発サーバー起動
npm run dev
```

## 機能 (Phase 1)

- 認証・権限管理 (Supabase Auth)
- テンプレート管理 (CRUD + バージョン管理)
- 文書作成・プレビュー (2カラム構成)
- 承認ワークフロー
- PDF発行・文書番号採番
- 監査ログ
- 文書検索・一覧
