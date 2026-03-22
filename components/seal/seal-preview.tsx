'use client'

/**
 * 印影プレビューコンポーネント
 * SVGで丸印・角印・認印の3タイプをレンダリングする
 */

import { cn } from '@/lib/utils'
import type { LocalSeal } from '@/lib/store'

interface SealPreviewProps {
  seal: LocalSeal
  /** 表示サイズ（px）。省略時はsealのsizeから自動計算 */
  size?: number
  className?: string
}

/**
 * 丸印（代表者印）のSVGレンダリング
 * 上段テキストを円弧に沿って配置、下段テキストを中央に表示
 */
function RoundSeal({ seal, viewSize }: { seal: LocalSeal; viewSize: number }) {
  const cx = viewSize / 2
  const cy = viewSize / 2
  const radius = viewSize / 2 - seal.border_width * 2
  const innerRadius = radius * 0.65

  return (
    <svg
      width={viewSize}
      height={viewSize}
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* フィルターで印影のかすれ感を出す */}
      <defs>
        <filter id={`seal-texture-${seal.id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="gray-noise" />
          <feComponentTransfer in="gray-noise" result="threshold-noise">
            <feFuncA type="discrete" tableValues="0 0 0 0 0 0 1 1 1 1" />
          </feComponentTransfer>
          <feComposite operator="in" in="SourceGraphic" in2="threshold-noise" />
        </filter>
      </defs>

      <g filter={`url(#seal-texture-${seal.id})`} opacity="0.85">
        {/* 外円 */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={seal.color}
          strokeWidth={seal.border_width * 1.5}
        />

        {/* 上段テキスト（円弧に沿う） */}
        {seal.text_line1 && (
          <>
            <defs>
              <path
                id={`arc-top-${seal.id}`}
                d={`M ${cx - innerRadius},${cy} A ${innerRadius},${innerRadius} 0 0,1 ${cx + innerRadius},${cy}`}
              />
            </defs>
            <text
              fill={seal.color}
              fontFamily={seal.font_family}
              fontSize={viewSize * 0.16}
              fontWeight="bold"
              textAnchor="middle"
            >
              <textPath href={`#arc-top-${seal.id}`} startOffset="50%">
                {seal.text_line1}
              </textPath>
            </text>
          </>
        )}

        {/* 下段テキスト（中央） */}
        {seal.text_line2 && (
          <text
            x={cx}
            y={cy + viewSize * 0.1}
            fill={seal.color}
            fontFamily={seal.font_family}
            fontSize={viewSize * 0.15}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {seal.text_line2}
          </text>
        )}

        {/* 中央の横線（上段と下段の仕切り） */}
        {seal.text_line1 && seal.text_line2 && (
          <line
            x1={cx - radius * 0.6}
            y1={cy - viewSize * 0.02}
            x2={cx + radius * 0.6}
            y2={cy - viewSize * 0.02}
            stroke={seal.color}
            strokeWidth={seal.border_width * 0.8}
          />
        )}
      </g>
    </svg>
  )
}

/**
 * 角印（社印）のSVGレンダリング
 * 正方形の枠にテキストを縦に配置
 */
function SquareSeal({ seal, viewSize }: { seal: LocalSeal; viewSize: number }) {
  const padding = seal.border_width * 3
  const innerSize = viewSize - padding * 2
  const lines = [seal.text_line1, seal.text_line2, seal.text_line3].filter(
    (line): line is string => !!line
  )
  const lineCount = lines.length || 1
  const fontSize = Math.min(viewSize * 0.22, innerSize / (lineCount + 0.5))

  return (
    <svg
      width={viewSize}
      height={viewSize}
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id={`seal-texture-sq-${seal.id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="gray-noise" />
          <feComponentTransfer in="gray-noise" result="threshold-noise">
            <feFuncA type="discrete" tableValues="0 0 0 0 0 0 1 1 1 1" />
          </feComponentTransfer>
          <feComposite operator="in" in="SourceGraphic" in2="threshold-noise" />
        </filter>
      </defs>

      <g filter={`url(#seal-texture-sq-${seal.id})`} opacity="0.85">
        {/* 外枠（角丸の四角形） */}
        <rect
          x={padding}
          y={padding}
          width={innerSize}
          height={innerSize}
          rx={viewSize * 0.03}
          ry={viewSize * 0.03}
          fill="none"
          stroke={seal.color}
          strokeWidth={seal.border_width * 1.5}
        />

        {/* テキストを縦書き風に配置 */}
        {lines.map((line, i) => {
          const totalHeight = lineCount * fontSize * 1.3
          const startY = (viewSize - totalHeight) / 2 + fontSize
          return (
            <text
              key={i}
              x={viewSize / 2}
              y={startY + i * fontSize * 1.3}
              fill={seal.color}
              fontFamily={seal.font_family}
              fontSize={fontSize}
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {line}
            </text>
          )
        })}
      </g>
    </svg>
  )
}

/**
 * 認印（個人印）のSVGレンダリング
 * 小さな楕円形に名前を中央配置
 */
function PersonalSeal({ seal, viewSize }: { seal: LocalSeal; viewSize: number }) {
  const cx = viewSize / 2
  const cy = viewSize / 2
  const rx = viewSize / 2 - seal.border_width * 2
  const ry = rx * 1.15 // 縦長の楕円
  const text = seal.text_line1 || ''
  // 文字数に応じてフォントサイズを調整
  const fontSize = text.length <= 2 ? viewSize * 0.35 : viewSize * 0.25

  return (
    <svg
      width={viewSize}
      height={viewSize * 1.2}
      viewBox={`0 0 ${viewSize} ${viewSize * 1.2}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id={`seal-texture-ps-${seal.id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="gray-noise" />
          <feComponentTransfer in="gray-noise" result="threshold-noise">
            <feFuncA type="discrete" tableValues="0 0 0 0 0 1 1 1 1 1" />
          </feComponentTransfer>
          <feComposite operator="in" in="SourceGraphic" in2="threshold-noise" />
        </filter>
      </defs>

      <g filter={`url(#seal-texture-ps-${seal.id})`} opacity="0.85">
        {/* 楕円の枠 */}
        <ellipse
          cx={cx}
          cy={viewSize * 0.6}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={seal.color}
          strokeWidth={seal.border_width * 1.2}
        />

        {/* 名前テキスト（縦書き風に1文字ずつ配置） */}
        {text.length <= 2 ? (
          // 2文字以下は縦に配置
          text.split('').map((char, i) => {
            const totalHeight = text.length * fontSize * 0.9
            const startY = viewSize * 0.6 - totalHeight / 2 + fontSize * 0.45
            return (
              <text
                key={i}
                x={cx}
                y={startY + i * fontSize * 0.9}
                fill={seal.color}
                fontFamily={seal.font_family}
                fontSize={fontSize}
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {char}
              </text>
            )
          })
        ) : (
          <text
            x={cx}
            y={viewSize * 0.6}
            fill={seal.color}
            fontFamily={seal.font_family}
            fontSize={fontSize}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {text}
          </text>
        )}
      </g>
    </svg>
  )
}

/** 印影プレビューのメインコンポーネント */
export function SealPreview({ seal, size, className }: SealPreviewProps) {
  // sealのsizeはmm単位。px表示サイズは引数のsizeを優先し、なければmm * 3で概算
  const viewSize = size ?? seal.size * 3

  return (
    <div className={cn('inline-flex items-center justify-center', className)}>
      {seal.type === 'round' && <RoundSeal seal={seal} viewSize={viewSize} />}
      {seal.type === 'square' && <SquareSeal seal={seal} viewSize={viewSize} />}
      {seal.type === 'personal' && <PersonalSeal seal={seal} viewSize={viewSize} />}
    </div>
  )
}
