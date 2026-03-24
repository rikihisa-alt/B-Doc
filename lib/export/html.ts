// =============================================================================
// B-Doc HTML エクスポート機能
// A4 プレビューの内容を完全な HTML ドキュメントとして保存する
// =============================================================================

// =============================================================================
// 型定義
// =============================================================================

/** HTML エクスポートに必要なパラメータ */
export interface HtmlExportParams {
  /** 文書タイトル */
  docTitle: string
  /** 作成者名 */
  creatorName: string
  /** 作成日 */
  creationDate: string
}

// =============================================================================
// メインエクスポート関数
// =============================================================================

/**
 * A4 プレビュー領域の HTML を完全な HTML ファイルとして保存する
 */
export function exportToHtml(params: HtmlExportParams): void {
  const { docTitle, creatorName, creationDate } = params

  // プレビュー領域の HTML を取得
  const previewEl = document.getElementById('a4-preview-content')
  if (!previewEl) {
    throw new Error('プレビュー領域が見つかりません。')
  }

  const previewHtml = previewEl.innerHTML

  // 完全な HTML ドキュメントを構築
  const fullHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(docTitle)}</title>
<meta name="author" content="${escapeHtml(creatorName)}" />
<meta name="date" content="${escapeHtml(creationDate)}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=Noto+Serif+JP:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  /* リセットと基本スタイル */
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    background: #e5e7eb;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;
    font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", "Noto Sans JP", sans-serif;
  }

  /* ドキュメント情報ヘッダー */
  .doc-info {
    max-width: 210mm;
    width: 100%;
    margin-bottom: 16px;
    padding: 12px 20px;
    background: #fff;
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    font-size: 13px;
    color: #555;
  }
  .doc-info strong {
    color: #333;
  }

  /* A4 用紙 */
  .a4-page {
    width: 210mm;
    min-height: 297mm;
    padding: 20mm;
    background: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", "Noto Sans JP", sans-serif;
    font-size: 12px;
    line-height: 1.6;
    color: #1a1a1a;
  }

  /* テーブルスタイル */
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th, td {
    border: 1px solid #9ca3af;
    padding: 4px 8px;
    text-align: left;
    font-size: 11px;
  }
  th {
    background: #f3f4f6;
    font-weight: 600;
  }

  /* 区切り線 */
  hr {
    border: none;
    border-top: 1px solid #999;
    margin: 8px 0;
  }

  /* ユーティリティクラス */
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .text-left { text-align: left; }
  .font-bold { font-weight: bold; }
  .font-medium { font-weight: 500; }
  .font-semibold { font-weight: 600; }
  .my-1 { margin-top: 4px; margin-bottom: 4px; }
  .my-2 { margin-top: 8px; margin-bottom: 8px; }
  .my-3 { margin-top: 12px; margin-bottom: 12px; }
  .my-4 { margin-top: 16px; margin-bottom: 16px; }
  .whitespace-pre-wrap { white-space: pre-wrap; }

  h1 { font-size: 20px; font-weight: bold; margin: 8px 0; }
  h2 { font-size: 17px; font-weight: 600; margin: 8px 0; }
  h3 { font-size: 15px; font-weight: 600; margin: 8px 0; }

  /* 印刷用スタイル */
  @media print {
    body {
      background: none;
      padding: 0;
    }
    .doc-info {
      display: none;
    }
    .a4-page {
      box-shadow: none;
      width: 100%;
      min-height: auto;
    }
    @page {
      size: A4;
      margin: 20mm;
    }
  }
</style>
</head>
<body>
<div class="doc-info">
  <strong>${escapeHtml(docTitle)}</strong>
  &nbsp;|&nbsp; 作成者: ${escapeHtml(creatorName)}
  &nbsp;|&nbsp; 作成日: ${escapeHtml(creationDate)}
</div>
<div class="a4-page">
${previewHtml}
</div>
</body>
</html>`

  // Blob を作成してダウンロード
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${docTitle}_${creationDate}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// =============================================================================
// ヘルパー関数
// =============================================================================

/** HTML 特殊文字をエスケープする */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
