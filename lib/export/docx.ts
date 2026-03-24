// =============================================================================
// B-Doc Word(.docx) エクスポート機能
// テンプレートブロックを docx 要素に変換し、.docx ファイルとして保存する
// =============================================================================

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  PageBreak,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} from 'docx'
import { saveAs } from 'file-saver'
import type { TemplateBlock, LocalSettings } from '@/lib/store'

// =============================================================================
// 型定義
// =============================================================================

/** エクスポートに必要なパラメータ */
export interface DocxExportParams {
  /** テンプレートブロック配列 */
  blocks: TemplateBlock[]
  /** フォーム入力値 */
  formValues: Record<string, string>
  /** 文書タイトル */
  docTitle: string
  /** 作成者名 */
  creatorName: string
  /** 作成日 */
  creationDate: string
  /** 会社設定（変数補完用） */
  companySettings?: LocalSettings
  /** 変数置換関数 */
  replaceVars: (text: string, values: Record<string, string>, settings?: LocalSettings) => string
}

// =============================================================================
// フォントマッピング
// Google Font名 → 標準 Word フォント名
// =============================================================================

const FONT_MAP: Record<string, string> = {
  'Noto Sans JP': 'MS ゴシック',
  'Noto Serif JP': 'MS 明朝',
  'M PLUS 1p': 'MS ゴシック',
  'M PLUS Rounded 1c': 'MS ゴシック',
  'Sawarabi Gothic': 'MS ゴシック',
  'Sawarabi Mincho': 'MS 明朝',
  'Kosugi Maru': 'MS ゴシック',
  'Kosugi': 'MS ゴシック',
  'Shippori Mincho': 'MS 明朝',
  'BIZ UDGothic': 'MS ゴシック',
  'BIZ UDMincho': 'MS 明朝',
}

/** Google Font名を Word 互換フォントに変換する */
function mapFont(fontFamily?: string): string {
  if (!fontFamily) return 'MS 明朝'
  return FONT_MAP[fontFamily] ?? fontFamily
}

/** ポイントをハーフポイント（docx内部単位）に変換する */
function pxToHalfPoint(px: number): number {
  // 1px ≈ 0.75pt, 1pt = 2 half-points
  return Math.round(px * 0.75 * 2)
}

/** アライメントを docx の AlignmentType に変換する */
function mapAlignment(align?: 'left' | 'center' | 'right'): typeof AlignmentType[keyof typeof AlignmentType] {
  switch (align) {
    case 'center':
      return AlignmentType.CENTER
    case 'right':
      return AlignmentType.RIGHT
    default:
      return AlignmentType.LEFT
  }
}

// =============================================================================
// ブロック変換関数
// =============================================================================

/** 単一ブロックを docx の Paragraph/Table 要素に変換する */
function convertBlock(
  block: TemplateBlock,
  formValues: Record<string, string>,
  replaceVarsFn: (text: string, values: Record<string, string>, settings?: LocalSettings) => string,
  companySettings?: LocalSettings,
): (Paragraph | Table)[] {
  const content = block.content
    ? replaceVarsFn(block.content, formValues, companySettings)
    : ''
  const font = mapFont(block.fontFamily)

  switch (block.type) {
    // ----- 見出し -----
    case 'heading': {
      const levelMap: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
      }
      return [
        new Paragraph({
          heading: levelMap[block.level ?? 1] ?? HeadingLevel.HEADING_1,
          alignment: mapAlignment(block.align),
          children: [
            new TextRun({
              text: content,
              font,
              bold: true,
              characterSpacing: block.letterSpacing ? block.letterSpacing * 20 : undefined,
            }),
          ],
        }),
      ]
    }

    // ----- 本文 -----
    case 'paragraph': {
      return [
        new Paragraph({
          alignment: mapAlignment(block.align),
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: content,
              font,
              size: block.fontSize ? pxToHalfPoint(block.fontSize) : undefined,
              bold: block.bold ?? false,
              italics: block.italic ?? false,
              underline: block.underline ? { type: 'single' } : undefined,
            }),
          ],
        }),
      ]
    }

    // ----- 変数行 -----
    case 'variable_line': {
      const val = block.variableKey ? formValues[block.variableKey] ?? '' : ''
      const displayVal = val.trim().length > 0 ? val : '（未入力）'
      return [
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `${block.variableLabel ?? ''}: `,
              font,
              bold: true,
              size: 22,
            }),
            new TextRun({
              text: displayVal,
              font,
              size: 22,
            }),
          ],
        }),
      ]
    }

    // ----- 表 -----
    case 'table': {
      if (!block.tableCells) return []
      const rows: TableRow[] = []

      // ヘッダー行
      if (block.tableHeaders) {
        rows.push(
          new TableRow({
            children: block.tableHeaders.map(
              (h) =>
                new TableCell({
                  width: { size: 100 / (block.tableHeaders?.length ?? 1), type: WidthType.PERCENTAGE },
                  shading: { type: ShadingType.SOLID, color: 'F0F0F0', fill: 'F0F0F0' },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: replaceVarsFn(h, formValues, companySettings),
                          font,
                          bold: true,
                          size: 20,
                        }),
                      ],
                    }),
                  ],
                }),
            ),
          }),
        )
      }

      // データ行
      for (const row of block.tableCells) {
        rows.push(
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: replaceVarsFn(cell, formValues, companySettings),
                          font,
                          size: 20,
                        }),
                      ],
                    }),
                  ],
                }),
            ),
          }),
        )
      }

      if (rows.length === 0) return []

      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows,
        }),
      ]
    }

    // ----- 区切り線 -----
    case 'divider': {
      const styleMap: Record<string, typeof BorderStyle[keyof typeof BorderStyle]> = {
        solid: BorderStyle.SINGLE,
        dashed: BorderStyle.DASHED,
        dotted: BorderStyle.DOTTED,
      }
      return [
        new Paragraph({
          spacing: { before: 120, after: 120 },
          border: {
            bottom: {
              style: styleMap[block.dividerStyle ?? 'solid'] ?? BorderStyle.SINGLE,
              size: (block.dividerThickness ?? 1) * 8,
              color: '999999',
            },
          },
          children: [],
        }),
      ]
    }

    // ----- 余白 -----
    case 'spacer': {
      const height = block.spacerHeight ?? 10
      return [
        new Paragraph({
          spacing: { before: height * 10, after: height * 10 },
          children: [],
        }),
      ]
    }

    // ----- 改ページ -----
    case 'page_break': {
      return [
        new Paragraph({
          children: [new PageBreak()],
        }),
      ]
    }

    // ----- 注意書き -----
    case 'notice': {
      const colorMap: Record<string, { fill: string; border: string }> = {
        info: { fill: 'EBF5FF', border: '3B82F6' },
        warning: { fill: 'FFFBEB', border: 'F59E0B' },
        bordered: { fill: 'FAFAFA', border: '999999' },
      }
      const colors = colorMap[block.noticeStyle ?? 'bordered'] ?? colorMap['bordered']
      return [
        new Paragraph({
          spacing: { before: 80, after: 80 },
          shading: { type: ShadingType.SOLID, color: colors.fill, fill: colors.fill },
          border: {
            top: { style: BorderStyle.SINGLE, size: 4, color: colors.border },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: colors.border },
            left: { style: BorderStyle.SINGLE, size: 4, color: colors.border },
            right: { style: BorderStyle.SINGLE, size: 4, color: colors.border },
          },
          children: [
            new TextRun({
              text: content,
              font,
              size: 20,
            }),
          ],
        }),
      ]
    }

    // ----- 日付行 -----
    case 'date_line': {
      return [
        new Paragraph({
          alignment: mapAlignment(block.align),
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: content,
              font,
              size: 22,
            }),
          ],
        }),
      ]
    }

    // ----- 宛名ブロック -----
    case 'address_block': {
      const paragraphs: Paragraph[] = []
      const company = block.addressCompany
        ? replaceVarsFn(block.addressCompany, formValues, companySettings)
        : ''
      const dept = block.addressDepartment
        ? replaceVarsFn(block.addressDepartment, formValues, companySettings)
        : ''
      const name = block.addressName
        ? replaceVarsFn(block.addressName, formValues, companySettings)
        : ''
      const suffix = block.addressSuffix ?? ''

      if (company) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${company} ${suffix}`, font, bold: true, size: 22 }),
            ],
          }),
        )
      }
      if (dept) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: dept, font, size: 22 })],
          }),
        )
      }
      if (name) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${name}${suffix && !company ? ` ${suffix}` : ''}`,
                font,
                size: 22,
              }),
            ],
          }),
        )
      }
      return paragraphs
    }

    // ----- 署名欄 -----
    case 'signature': {
      const paragraphs: Paragraph[] = []
      if (block.companyName) {
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: block.companyName, font, size: 22 })],
          }),
        )
      }
      if (block.representativeTitle) {
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: block.representativeTitle, font, size: 22 })],
          }),
        )
      }
      if (block.representativeName) {
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: block.representativeName, font, bold: true, size: 22 }),
            ],
          }),
        )
      }
      return paragraphs
    }

    // ----- 印影（docx では非サポート、スキップ） -----
    case 'seal': {
      return [
        new Paragraph({
          alignment: mapAlignment(block.sealPosition),
          spacing: { before: 80, after: 80 },
          children: [
            new TextRun({
              text: '（印）',
              font,
              size: 22,
              color: 'CC0000',
            }),
          ],
        }),
      ]
    }

    // ----- 画像プレースホルダー -----
    case 'image': {
      return [
        new Paragraph({
          spacing: { before: 80, after: 80 },
          children: [
            new TextRun({
              text: '（画像）',
              font,
              size: 20,
              color: '999999',
            }),
          ],
        }),
      ]
    }

    default:
      return []
  }
}

// =============================================================================
// メインエクスポート関数
// =============================================================================

/**
 * テンプレートブロックを Word(.docx) に変換してダウンロードする
 */
export async function exportToDocx(params: DocxExportParams): Promise<void> {
  const {
    blocks,
    formValues,
    docTitle,
    creatorName,
    creationDate,
    companySettings,
    replaceVars: replaceVarsFn,
  } = params

  // ブロックを order 順にソート
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order)

  // 全ブロックを docx 要素に変換
  const children: (Paragraph | Table)[] = []
  for (const block of sortedBlocks) {
    const elements = convertBlock(block, formValues, replaceVarsFn, companySettings)
    children.push(...elements)
  }

  // ドキュメント生成
  const doc = new Document({
    creator: creatorName,
    title: docTitle,
    description: `作成日: ${creationDate}`,
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 幅 (210mm) in twips
              height: 16838, // A4 高さ (297mm) in twips
            },
            margin: {
              top: 1134, // 20mm in twips
              right: 1134,
              bottom: 1134,
              left: 1134,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 100 },
                children: [
                  new TextRun({
                    text: docTitle,
                    font: 'MS 明朝',
                    size: 18,
                    color: '666666',
                  }),
                  new TextRun({
                    text: `    作成者: ${creatorName}`,
                    font: 'MS 明朝',
                    size: 16,
                    color: '999999',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: 'MS 明朝',
                    size: 18,
                    color: '999999',
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })

  // Blob に変換してダウンロード
  const blob = await Packer.toBlob(doc)
  const fileName = `${docTitle}_${creationDate}.docx`
  saveAs(blob, fileName)
}
