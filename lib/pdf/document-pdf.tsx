import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

/**
 * PDF文書コンポーネント（@react-pdf/renderer用）
 * リッチブロック対応版 — テンプレートのブロック構造をPDFにレンダリング
 */

// NotoSansJP フォントの登録
Font.register({
  family: 'NotoSansJP',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.1/files/noto-sans-jp-japanese-400-normal.woff', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.1/files/noto-sans-jp-japanese-700-normal.woff', fontWeight: 700 },
  ],
})

// ============================================================
// 型定義
// ============================================================

interface PdfBlock {
  id: string
  type: string
  order: number
  content?: string
  align?: 'left' | 'center' | 'right'
  level?: number
  letterSpacing?: number
  fontSize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  lineHeight?: number
  variableKey?: string
  variableLabel?: string
  tableRows?: number
  tableCols?: number
  tableCells?: string[][]
  tableHeaders?: string[]
  sealId?: string
  sealPosition?: 'left' | 'center' | 'right'
  companyName?: string
  representativeTitle?: string
  representativeName?: string
  dividerStyle?: 'solid' | 'dashed' | 'dotted'
  dividerThickness?: number
  spacerHeight?: number
  noticeStyle?: string
  addressCompany?: string
  addressDepartment?: string
  addressName?: string
  addressSuffix?: string
}

interface PdfSeal {
  id: string
  type: 'round' | 'square' | 'personal'
  text_line1: string
  text_line2: string
  text_line3?: string
  size: number
  color: string
  border_width: number
}

export interface DocumentPdfProps {
  title: string
  documentNumber: string
  documentType: string
  issuedAt: string
  companyName: string
  isDraft?: boolean
  // レガシー互換
  body?: string
  // リッチブロック
  blocks?: PdfBlock[]
  values?: Record<string, string>
  seals?: PdfSeal[]
}

// ============================================================
// スタイル
// ============================================================

const s = StyleSheet.create({
  page: { padding: 50, fontFamily: 'NotoSansJP', fontSize: 10, lineHeight: 1.6, color: '#1a1a1a' },
  // 見出し
  h1: { fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 12, marginTop: 8 },
  h2: { fontSize: 16, fontWeight: 700, marginBottom: 10, marginTop: 6 },
  h3: { fontSize: 13, fontWeight: 700, marginBottom: 8, marginTop: 4 },
  h4: { fontSize: 11, fontWeight: 700, marginBottom: 6, marginTop: 2 },
  // 本文
  paragraph: { fontSize: 10, lineHeight: 1.8, marginBottom: 6 },
  // 変数行
  variableLine: { flexDirection: 'row', marginBottom: 4, fontSize: 10 },
  variableLabel: { width: 120, color: '#333', fontWeight: 700 },
  variableValue: { flex: 1, borderBottom: '0.5px solid #ccc', paddingBottom: 1 },
  // テーブル
  table: { marginVertical: 8 },
  tableRow: { flexDirection: 'row' },
  tableHeaderCell: { flex: 1, padding: 4, backgroundColor: '#f5f5f5', borderWidth: 0.5, borderColor: '#333', fontSize: 9, fontWeight: 700, textAlign: 'center' },
  tableCell: { flex: 1, padding: 4, borderWidth: 0.5, borderColor: '#666', fontSize: 9 },
  // 区切り線
  divider: { marginVertical: 8 },
  // 余白
  spacer: {},
  // 署名欄
  signatureBlock: { marginTop: 30, alignItems: 'flex-end' },
  signatureCompany: { fontSize: 10, marginBottom: 3 },
  signatureTitle: { fontSize: 9, color: '#444', marginBottom: 2 },
  signatureName: { fontSize: 12, fontWeight: 700, marginBottom: 4 },
  // 注意書き
  noticeBox: { borderWidth: 1, borderColor: '#999', padding: 10, marginVertical: 8, backgroundColor: '#fafafa' },
  noticeText: { fontSize: 8, color: '#555', lineHeight: 1.6 },
  // 宛名
  addressBlock: { marginBottom: 16 },
  addressCompany: { fontSize: 12, fontWeight: 700 },
  addressDept: { fontSize: 10, color: '#444', marginLeft: 4 },
  addressName: { fontSize: 14, fontWeight: 700, marginTop: 2 },
  // 日付行
  dateLine: { textAlign: 'right', fontSize: 10, marginBottom: 12 },
  // 印影
  sealContainer: { marginTop: 10, marginBottom: 10 },
  // フッター
  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, borderTop: '0.5px solid #ccc', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#999' },
  // 透かし
  watermark: { position: 'absolute', top: '40%', left: '15%', fontSize: 60, color: '#e0e0e0', transform: 'rotate(-30deg)', opacity: 0.2 },
})

// ============================================================
// 変数置換
// ============================================================

function replaceVars(text: string, values: Record<string, string>): string {
  if (!text) return ''
  let result = text
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '')
  }
  return result
}

// ============================================================
// 印影レンダリング（View + Textベースで印影を再現）
// ============================================================

function PdfSealRender({ seal }: { seal: PdfSeal }) {
  const sizePt = seal.size * 2.835 // mmをptに変換

  // 共通スタイル
  const containerStyle = {
    width: sizePt,
    height: sizePt,
    borderWidth: seal.border_width,
    borderColor: seal.color,
    borderRadius: seal.type === 'round' ? sizePt / 2 : seal.type === 'personal' ? sizePt / 2 : 3,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    opacity: 0.85,
  }

  const textStyle1 = { fontSize: Math.max(6, sizePt * 0.18), color: seal.color, fontWeight: 700 as const, fontFamily: 'NotoSansJP' as const }
  const textStyle2 = { fontSize: Math.max(5, sizePt * 0.14), color: seal.color, fontWeight: 700 as const, fontFamily: 'NotoSansJP' as const }

  return (
    <View style={containerStyle}>
      <Text style={textStyle1}>{seal.text_line1}</Text>
      {seal.type === 'round' && (
        <View style={{ width: sizePt * 0.6, borderBottomWidth: 0.5, borderBottomColor: seal.color, marginVertical: 1, opacity: 0.5 }} />
      )}
      {seal.text_line2 ? <Text style={textStyle2}>{seal.text_line2}</Text> : null}
      {seal.text_line3 ? <Text style={{ ...textStyle2, fontSize: Math.max(4, sizePt * 0.12) }}>{seal.text_line3}</Text> : null}
    </View>
  )
}

// ============================================================
// メインコンポーネント
// ============================================================

export function DocumentPdf({
  title,
  documentNumber,
  documentType,
  issuedAt,
  companyName,
  isDraft = false,
  body,
  blocks,
  values = {},
  seals = [],
}: DocumentPdfProps) {
  const formattedDate = new Date(issuedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

  // 印影のIDマップ
  const sealMap = new Map(seals.map((sl) => [sl.id, sl]))

  // レガシーモード（blocksなし）
  if (!blocks || blocks.length === 0) {
    const renderedBody = replaceVars(body || '', values)
    const lines = renderedBody.split('\n')
    return (
      <Document title={title} author={companyName}>
        <Page size="A4" style={s.page}>
          {isDraft && <Text style={s.watermark}>下書き</Text>}
          <Text style={s.h1}>{title}</Text>
          <Text style={{ ...s.dateLine, marginBottom: 20 }}>文書番号: {documentNumber}　　発行日: {formattedDate}</Text>
          <View style={{ marginBottom: 30 }}>
            {lines.map((line, i) => (
              <Text key={i} style={s.paragraph}>{line || ' '}</Text>
            ))}
          </View>
          <View style={s.footer}>
            <Text>{companyName}</Text>
            <Text>{documentNumber}</Text>
          </View>
        </Page>
      </Document>
    )
  }

  // リッチブロックモード
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order)

  return (
    <Document title={title} author={companyName}>
      <Page size="A4" style={s.page}>
        {isDraft && <Text style={s.watermark}>下書き</Text>}

        {sortedBlocks.map((block) => {
          const key = block.id

          switch (block.type) {
            case 'heading': {
              const levelStyle = block.level === 1 ? s.h1 : block.level === 2 ? s.h2 : block.level === 3 ? s.h3 : s.h4
              return (
                <Text key={key} style={{
                  ...levelStyle,
                  textAlign: block.align || 'center',
                  letterSpacing: block.letterSpacing || 0,
                }}>
                  {replaceVars(block.content || '', values)}
                </Text>
              )
            }

            case 'paragraph': {
              return (
                <Text key={key} style={{
                  ...s.paragraph,
                  fontSize: block.fontSize || 10,
                  fontWeight: block.bold ? 700 : 400,
                  fontStyle: block.italic ? 'italic' : 'normal',
                  textDecoration: block.underline ? 'underline' : 'none',
                  textAlign: block.align || 'left',
                  lineHeight: block.lineHeight || 1.8,
                }}>
                  {replaceVars(block.content || '', values)}
                </Text>
              )
            }

            case 'variable_line': {
              const val = values[block.variableKey || ''] || ''
              return (
                <View key={key} style={s.variableLine}>
                  <Text style={s.variableLabel}>{block.variableLabel || block.variableKey}:</Text>
                  <Text style={s.variableValue}>{val || '　'}</Text>
                </View>
              )
            }

            case 'table': {
              const headers = block.tableHeaders || []
              const cells = block.tableCells || []
              return (
                <View key={key} style={s.table}>
                  {headers.length > 0 && (
                    <View style={s.tableRow}>
                      {headers.map((h, ci) => (
                        <Text key={ci} style={s.tableHeaderCell}>{replaceVars(h, values)}</Text>
                      ))}
                    </View>
                  )}
                  {cells.map((row, ri) => (
                    <View key={ri} style={s.tableRow}>
                      {row.map((cell, ci) => (
                        <Text key={ci} style={s.tableCell}>{replaceVars(cell, values)}</Text>
                      ))}
                    </View>
                  ))}
                </View>
              )
            }

            case 'seal': {
              const seal = sealMap.get(block.sealId || '')
              if (!seal) return null
              const alignItems = block.sealPosition === 'left' ? 'flex-start' : block.sealPosition === 'center' ? 'center' : 'flex-end'
              return (
                <View key={key} style={{ ...s.sealContainer, alignItems }}>
                  <PdfSealRender seal={seal} />
                </View>
              )
            }

            case 'signature': {
              return (
                <View key={key} style={s.signatureBlock}>
                  <Text style={s.signatureCompany}>{replaceVars(block.companyName || companyName, values)}</Text>
                  {block.representativeTitle && (
                    <Text style={s.signatureTitle}>{replaceVars(block.representativeTitle, values)}</Text>
                  )}
                  {block.representativeName && (
                    <Text style={s.signatureName}>{replaceVars(block.representativeName, values)}</Text>
                  )}
                </View>
              )
            }

            case 'divider': {
              const borderStyle = block.dividerStyle === 'dashed' ? 'dashed' : block.dividerStyle === 'dotted' ? 'dotted' : 'solid'
              return (
                <View key={key} style={{
                  ...s.divider,
                  borderBottomWidth: block.dividerThickness || 1,
                  borderBottomColor: '#333',
                  borderBottomStyle: borderStyle,
                }} />
              )
            }

            case 'spacer': {
              return <View key={key} style={{ height: (block.spacerHeight || 10) * 2.835 }} />
            }

            case 'page_break': {
              return <View key={key} break />
            }

            case 'notice': {
              return (
                <View key={key} style={s.noticeBox}>
                  <Text style={s.noticeText}>{replaceVars(block.content || '', values)}</Text>
                </View>
              )
            }

            case 'date_line': {
              return (
                <Text key={key} style={s.dateLine}>
                  {replaceVars(block.content || formattedDate, values)}
                </Text>
              )
            }

            case 'address_block': {
              return (
                <View key={key} style={s.addressBlock}>
                  <Text style={s.addressCompany}>{replaceVars(block.addressCompany || '', values)}</Text>
                  {block.addressDepartment && (
                    <Text style={s.addressDept}>{replaceVars(block.addressDepartment, values)}</Text>
                  )}
                  <Text style={s.addressName}>
                    {replaceVars(block.addressName || '', values)}　{block.addressSuffix || '様'}
                  </Text>
                </View>
              )
            }

            default:
              return null
          }
        })}

        {/* フッター */}
        <View style={s.footer}>
          <Text>{companyName}</Text>
          <Text>{documentNumber}</Text>
          <Text>B-Doc</Text>
        </View>
      </Page>
    </Document>
  )
}
