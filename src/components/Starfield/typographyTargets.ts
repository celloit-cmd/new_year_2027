import { clamp } from './starfieldEngine.ts'

export interface TypographyTarget {
  readonly nx: number
  readonly ny: number
  readonly lineIndex: number
}

export interface TypographyMaskResult {
  readonly targets: TypographyTarget[]
  readonly layout: 'desktop' | 'mobile'
}

interface TextLineSpec {
  readonly text: string
  readonly fontSize: number
  readonly trackingPx: number
  readonly y: number
}

function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function measureTrackedTextWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  trackingPx: number,
): number {
  let total = 0
  for (let i = 0; i < text.length; i++) {
    total += ctx.measureText(text[i] ?? '').width
    if (i < text.length - 1) {
      total += trackingPx
    }
  }
  return total
}

function drawTrackedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  baselineY: number,
  trackingPx: number,
): void {
  const totalWidth = measureTrackedTextWidth(ctx, text, trackingPx)
  let cursorX = centerX - totalWidth / 2
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] ?? ''
    ctx.fillText(ch, cursorX, baselineY)
    cursorX += ctx.measureText(ch).width + trackingPx
  }
}

function buildFontString(sizePx: number): string {
  return `700 ${Math.round(sizePx)}px "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif`
}

function computeLineSpecs(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): { lines: TextLineSpec[]; layout: 'desktop' | 'mobile' } {
  const isMobileLayout = width < 820 || width / Math.max(1, height) < 1.15
  const centerY = height * 0.485

  if (isMobileLayout) {
    const maxLineWidth = width * 0.82
    let baseSize = clamp(width * 0.115, 30, 56)
    let yearSize = clamp(width * 0.175, 44, 82)

    // Shrink uniformly if narrow viewport pushes "NEW YEAR" past safe margins
    ctx.font = buildFontString(baseSize)
    const measuredMid = measureTrackedTextWidth(ctx, 'NEW YEAR', baseSize * 0.085)
    if (measuredMid > maxLineWidth && measuredMid > 0) {
      const ratio = maxLineWidth / measuredMid
      baseSize *= ratio
      yearSize *= ratio
    }

    const lineGap = baseSize * 1.24
    const yearOffset = baseSize * 0.72 + yearSize * 0.78

    return {
      layout: 'mobile',
      lines: [
        {
          text: 'HAPPY',
          fontSize: baseSize,
          trackingPx: baseSize * 0.11,
          y: centerY - lineGap * 0.92,
        },
        {
          text: 'NEW YEAR',
          fontSize: baseSize,
          trackingPx: baseSize * 0.085,
          y: centerY + lineGap * 0.04,
        },
        {
          text: '2027',
          fontSize: yearSize,
          trackingPx: yearSize * 0.12,
          y: centerY + yearOffset,
        },
      ],
    }
  }

  const maxLineWidth = width * 0.76
  let headlineSize = clamp(Math.min(width * 0.052, height * 0.088), 38, 72)
  let yearSize = headlineSize * 1.72

  ctx.font = buildFontString(headlineSize)
  const measuredHeadline = measureTrackedTextWidth(
    ctx,
    'HAPPY NEW YEAR',
    headlineSize * 0.14,
  )
  if (measuredHeadline > maxLineWidth && measuredHeadline > 0) {
    const ratio = maxLineWidth / measuredHeadline
    headlineSize *= ratio
    yearSize *= ratio
  }

  const verticalGap = headlineSize * 0.56 + yearSize * 0.52

  return {
    layout: 'desktop',
    lines: [
      {
        text: 'HAPPY NEW YEAR',
        fontSize: headlineSize,
        trackingPx: headlineSize * 0.14,
        y: centerY - verticalGap * 0.55,
      },
      {
        text: '2027',
        fontSize: yearSize,
        trackingPx: yearSize * 0.16,
        y: centerY + verticalGap * 0.72,
      },
    ],
  }
}

/**
 * Renders "HAPPY NEW YEAR 2027" onto an offscreen Canvas 2D mask and samples
 * evenly distributed normalized particle target coordinates.
 */
export function generateTypographyTargets(
  width: number,
  height: number,
  seed = 202703,
): TypographyMaskResult {
  const safeW = Math.max(1, Math.round(width))
  const safeH = Math.max(1, Math.round(height))

  if (typeof document === 'undefined') {
    return { targets: [], layout: safeW < 820 ? 'mobile' : 'desktop' }
  }

  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = safeW
  maskCanvas.height = safeH
  const ctx = maskCanvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    return { targets: [], layout: safeW < 820 ? 'mobile' : 'desktop' }
  }

  const { lines, layout } = computeLineSpecs(ctx, safeW, safeH)
  const centerX = safeW / 2

  ctx.clearRect(0, 0, safeW, safeH)
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  for (const line of lines) {
    ctx.font = buildFontString(line.fontSize)
    drawTrackedText(ctx, line.text, centerX, line.y, line.trackingPx)
  }

  const imageData = ctx.getImageData(0, 0, safeW, safeH).data
  let minX = safeW
  let maxX = 0
  let minY = safeH
  let maxY = 0
  let litCount = 0

  for (let y = 0; y < safeH; y++) {
    const rowOffset = y * safeW * 4
    for (let x = 0; x < safeW; x++) {
      const alpha = imageData[rowOffset + x * 4 + 3] ?? 0
      if (alpha >= 135) {
        litCount++
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (litCount === 0) {
    return { targets: [], layout }
  }

  const desiredCount = layout === 'mobile' ? 920 : 1450
  const stride = Math.max(2, Math.round(Math.sqrt(litCount / desiredCount)))
  const rng = createRng(seed)
  const targets: TypographyTarget[] = []

  // Split line index cleanly by vertical midpoints between consecutive lines
  const splitBoundaries: number[] = []
  for (let i = 0; i < lines.length - 1; i++) {
    const cur = lines[i]
    const next = lines[i + 1]
    if (cur && next) {
      splitBoundaries.push((cur.y + next.y) / 2)
    }
  }

  for (let y = minY; y <= maxY; y += stride) {
    for (let x = minX; x <= maxX; x += stride) {
      const jx = clamp(Math.round(x + (rng() - 0.5) * stride * 0.45), 0, safeW - 1)
      const jy = clamp(Math.round(y + (rng() - 0.5) * stride * 0.45), 0, safeH - 1)
      const alpha = imageData[(jy * safeW + jx) * 4 + 3] ?? 0
      if (alpha >= 135) {
        let lineIndex = 0
        while (
          lineIndex < splitBoundaries.length &&
          jy > (splitBoundaries[lineIndex] ?? safeH)
        ) {
          lineIndex++
        }
        targets.push({
          nx: jx / safeW,
          ny: jy / safeH,
          lineIndex,
        })
      }
    }
  }

  return { targets, layout }
}
