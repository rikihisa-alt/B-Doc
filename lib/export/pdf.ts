// =============================================================================
// B-Doc PDF エクスポート機能
// html2canvas + jsPDF を使用して、プレビュー領域をPDFとして直接ダウンロードする
// =============================================================================

import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { PageSize } from '@/lib/store'
import { PAGE_SIZE_DIMENSIONS } from '@/lib/store'

// =============================================================================
// 型定義
// =============================================================================

/** PDF エクスポートに必要なパラメータ */
export interface PdfExportParams {
  /** プレビュー要素のID */
  elementId: string
  /** 文書タイトル */
  docTitle: string
  /** 作成者名 */
  creatorName: string
  /** 作成日 */
  creationDate: string
  /** 用紙サイズ */
  pageSize?: PageSize
  /** 用紙方向 */
  pageOrientation?: 'portrait' | 'landscape'
  /** ページ余白 (mm) */
  pageMargin?: { top: number; bottom: number; left: number; right: number }
}

// =============================================================================
// メインエクスポート関数
// =============================================================================

/**
 * プレビュー領域を html2canvas でキャプチャし、jsPDF で PDF ファイルとしてダウンロードする
 */
export async function exportToPdf(params: PdfExportParams): Promise<void> {
  const {
    elementId,
    docTitle,
    creatorName,
    creationDate,
    pageSize = 'A4',
    pageOrientation = 'portrait',
    pageMargin = { top: 20, bottom: 20, left: 20, right: 20 },
  } = params

  // プレビュー要素を取得
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error('プレビュー領域が見つかりません。')
  }

  // 用紙寸法を取得 (mm)
  const dims = PAGE_SIZE_DIMENSIONS[pageSize] ?? PAGE_SIZE_DIMENSIONS.A4
  const pdfWidth = pageOrientation === 'landscape' ? dims.height : dims.width
  const pdfHeight = pageOrientation === 'landscape' ? dims.width : dims.height

  // コンテンツ描画領域 (mm)
  const contentWidth = pdfWidth - pageMargin.left - pageMargin.right
  const contentHeight = pdfHeight - pageMargin.top - pageMargin.bottom

  // html2canvas でキャプチャ（高解像度）
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  })

  // キャンバスの寸法
  const canvasWidth = canvas.width
  const canvasHeight = canvas.height

  // コンテンツ領域にフィットするスケールを計算
  const scaleX = contentWidth / canvasWidth
  const imgWidthMm = contentWidth
  const imgHeightMm = canvasHeight * scaleX

  // jsPDF のフォーマット指定用寸法配列
  const format: [number, number] = [pdfWidth, pdfHeight]

  // PDF ドキュメントを作成
  const pdf = new jsPDF({
    orientation: pageOrientation === 'landscape' ? 'landscape' : 'portrait',
    unit: 'mm',
    format,
  })

  // メタデータを設定
  pdf.setProperties({
    title: docTitle,
    author: creatorName,
    subject: `作成日: ${creationDate}`,
    creator: 'B-Doc ドキュメント発行システム',
  })

  // ページ分割して描画
  const imgData = canvas.toDataURL('image/png')
  const totalPages = Math.ceil(imgHeightMm / contentHeight)

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      pdf.addPage(format, pageOrientation === 'landscape' ? 'landscape' : 'portrait')
    }

    // このページで描画するキャンバス部分の Y オフセット (mm)
    const srcYMm = page * contentHeight

    // ソース領域のキャンバス上のピクセル座標
    const srcY = srcYMm / scaleX
    const srcH = Math.min(contentHeight / scaleX, canvasHeight - srcY)

    if (srcH <= 0) break

    // ページ用のキャンバスを切り出し
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvasWidth
    pageCanvas.height = Math.ceil(srcH)

    const ctx = pageCanvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas コンテキストの取得に失敗しました。')
    }

    ctx.drawImage(
      canvas,
      0, Math.floor(srcY), canvasWidth, Math.ceil(srcH),
      0, 0, canvasWidth, Math.ceil(srcH),
    )

    const pageImgData = pageCanvas.toDataURL('image/png')
    const drawHeight = srcH * scaleX

    // ページに画像を配置
    pdf.addImage(
      pageImgData,
      'PNG',
      pageMargin.left,
      pageMargin.top,
      imgWidthMm,
      drawHeight,
    )

    // フッター: ページ番号
    pdf.setFontSize(8)
    pdf.setTextColor(150, 150, 150)
    const pageNumText = `${page + 1} / ${totalPages}`
    const textWidth = pdf.getTextWidth(pageNumText)
    pdf.text(pageNumText, (pdfWidth - textWidth) / 2, pdfHeight - pageMargin.bottom / 2)
  }

  // ファイル名を生成してダウンロード
  const fileName = `${docTitle}_${creationDate}.pdf`
  pdf.save(fileName)
}
