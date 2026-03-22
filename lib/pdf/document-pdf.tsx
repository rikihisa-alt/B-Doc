import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// NotoSansJP フォントの登録（Google Fonts CDN）
Font.register({
  family: 'NotoSansJP',
  fonts: [
    {
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.1/files/noto-sans-jp-japanese-400-normal.woff',
      fontWeight: 400,
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.1/files/noto-sans-jp-japanese-700-normal.woff',
      fontWeight: 700,
    },
  ],
})

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'NotoSansJP',
    fontSize: 10,
    lineHeight: 1.8,
    color: '#1a1a1a',
  },
  header: {
    marginBottom: 30,
    borderBottom: '1px solid #333',
    paddingBottom: 15,
  },
  companyName: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 4,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#666',
    marginTop: 5,
  },
  body: {
    marginTop: 20,
    marginBottom: 40,
    fontSize: 10,
    lineHeight: 2.0,
  },
  bodyLine: {
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 50,
    right: 50,
    borderTop: '1px solid #ccc',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#999',
  },
  seal: {
    marginTop: 40,
    alignItems: 'flex-end',
  },
  sealBox: {
    width: 60,
    height: 60,
    border: '2px solid #cc0000',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sealText: {
    fontSize: 8,
    color: '#cc0000',
    fontWeight: 700,
  },
  watermark: {
    position: 'absolute',
    top: '40%',
    left: '20%',
    fontSize: 60,
    color: '#f0f0f0',
    transform: 'rotate(-30deg)',
    opacity: 0.3,
  },
})

interface DocumentPdfProps {
  title: string
  documentNumber: string
  documentType: string
  body: string
  issuedAt: string
  companyName: string
  isDraft?: boolean
}

/**
 * PDF文書コンポーネント（@react-pdf/renderer用）
 */
export function DocumentPdf({
  title,
  documentNumber,
  documentType,
  body,
  issuedAt,
  companyName,
  isDraft = false,
}: DocumentPdfProps) {
  const lines = body.split('\n')
  const formattedDate = new Date(issuedAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // 文書種別の日本語ラベル
  const typeLabels: Record<string, string> = {
    employment_cert: '在職証明書',
    invoice: '請求書',
    quotation: '見積書',
    resignation: '退職証明書',
  }

  return (
    <Document title={title} author={companyName}>
      <Page size="A4" style={styles.page}>
        {/* 下書き透かし */}
        {isDraft && (
          <Text style={styles.watermark}>下書き</Text>
        )}

        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.title}>
            {typeLabels[documentType] || title}
          </Text>
          <View style={styles.meta}>
            <Text>文書番号: {documentNumber}</Text>
            <Text>発行日: {formattedDate}</Text>
          </View>
        </View>

        {/* 本文 */}
        <View style={styles.body}>
          {lines.map((line, i) => (
            <Text key={i} style={styles.bodyLine}>
              {line || ' '}
            </Text>
          ))}
        </View>

        {/* 印影 */}
        <View style={styles.seal}>
          <View style={styles.sealBox}>
            <Text style={styles.sealText}>B-Doc</Text>
            <Text style={styles.sealText}>発行</Text>
          </View>
        </View>

        {/* フッター */}
        <View style={styles.footer}>
          <Text>{companyName}</Text>
          <Text>文書番号: {documentNumber}</Text>
          <Text>B-Doc 文書管理システム</Text>
        </View>
      </Page>
    </Document>
  )
}
