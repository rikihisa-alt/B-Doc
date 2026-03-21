import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer'

/** PDF生成オプション */
export interface PdfGenerateOptions {
  title: string
  documentNumber: string
  documentType: string
  content: string
  organizationName?: string
  authorName?: string
  issuedAt?: string
}

// スタイル定義
const styles = StyleSheet.create({
  page: {
    fontSize: 10,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 50,
    color: '#333333',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 4,
    textAlign: 'center',
  },
  documentNumber: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
  },
  content: {
    lineHeight: 1.8,
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
})

/**
 * PDF文書のReactコンポーネント
 */
function DocumentPdf(props: PdfGenerateOptions) {
  const {
    title,
    documentNumber,
    content,
    issuedAt,
  } = props

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      // ヘッダー
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, title),
        React.createElement(
          Text,
          { style: styles.documentNumber },
          `文書番号: ${documentNumber}`
        )
      ),
      // 本文
      React.createElement(
        View,
        null,
        React.createElement(Text, { style: styles.content }, content)
      ),
      // フッター
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(
          Text,
          { style: styles.footerText },
          `文書番号: ${documentNumber}${issuedAt ? ` | 発行日: ${issuedAt}` : ''}`
        )
      )
    )
  )
}

/**
 * PDFバイナリ（Blob）を生成する
 */
export async function generatePdf(options: PdfGenerateOptions): Promise<Blob> {
  const element = React.createElement(DocumentPdf, options)
  const blob = await pdf(element).toBlob()
  return blob
}

/**
 * PDFのダウンロードURLを生成する
 */
export async function generatePdfUrl(options: PdfGenerateOptions): Promise<string> {
  const blob = await generatePdf(options)
  return URL.createObjectURL(blob)
}
