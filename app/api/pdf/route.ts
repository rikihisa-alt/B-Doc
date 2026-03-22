import { NextRequest, NextResponse } from 'next/server'
import ReactPDF from '@react-pdf/renderer'
import { createElement } from 'react'
import { DocumentPdf } from '@/lib/pdf/document-pdf'

/**
 * PDF生成API
 * POST /api/pdf
 * Body: { title, document_number, document_type, values, body_template, issued_at }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, document_number, document_type, values, body_template, issued_at } = body

    if (!title) {
      return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 })
    }

    // テンプレートの変数を置換した本文を生成
    let renderedBody = body_template || ''
    if (values && typeof values === 'object') {
      for (const [key, value] of Object.entries(values)) {
        renderedBody = renderedBody.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          String(value || '')
        )
      }
    }

    // React PDFでPDFを生成
    const element = createElement(DocumentPdf, {
      title: title || '文書',
      documentNumber: document_number || '未採番',
      documentType: document_type || '',
      body: renderedBody,
      issuedAt: issued_at || new Date().toISOString(),
      companyName: 'B-Doc デモ株式会社',
    })

    const pdfStream = await ReactPDF.renderToStream(element)

    // ストリームをBufferに変換
    const chunks: Uint8Array[] = []
    for await (const chunk of pdfStream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    const pdfBuffer = Buffer.concat(chunks)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PDF生成に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
