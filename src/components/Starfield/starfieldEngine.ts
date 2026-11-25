export type StarLayer = 0 | 1 | 2 | 3

export type StarTemperature = 'cool' | 'starlight' | 'ivory' | 'warm'

export interface StarParticle {
  nx: number
  ny: number
  readonly depth: number
  readonly layer: StarLayer
  readonly radius: number
  readonly baseAlpha: number
  readonly twinkleAmp: number
  readonly twinkleSpeed: number
  readonly twinklePhase: number
  readonly vx: number
  readonly vy: number
  readonly temperature: StarTemperature
  readonly hasGlint: boolean
}

export interface StarfieldConfig {
  readonly width: number
  readonly height: number
  readonly densityScale?: number
  readonly seed?: number
}

export interface StarfieldState {
  width: number
  height: number
  readonly densityScale: number
  readonly seed: number
  elapsed: number
  stars: StarParticle[]
  backdropCanvas: HTMLCanvasElement | null
  readonly glowSprites: Record<StarTemperature, HTMLCanvasElement> | null
}

const TEMPERATURE_RGB: Record<StarTemperature, readonly [number, number, number]> = {
  cool: [198, 216, 255],
  starlight: [238, 243, 255],
  ivory: [255, 244, 224],
  warm: [244, 217, 173],
}

export const TEMPERATURE_CSS: Record<StarTemperature, string> = {
  cool: 'rgb(198, 216, 255)',
  starlight: 'rgb(238, 243, 255)',
  ivory: 'rgb(255, 244, 224)',
  warm: 'rgb(244, 217, 173)',
}

const WRAP_MARGIN = 0.02
const WRAP_SPAN = 1 + WRAP_MARGIN * 2

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function wrapNormalized(value: number): number {
  if (value < -WRAP_MARGIN) {
    return value + WRAP_SPAN
  }
  if (value > 1 + WRAP_MARGIN) {
    return value - WRAP_SPAN
  }
  return value
}

/** Deterministic PRNG (Mulberry32) so star layout reproduces cleanly across resizes. */
function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Approximates a zero-mean Gaussian sample for soft celestial-band clustering. */
function sampleGaussian(rng: () => number): number {
  return (rng() + rng() + rng()) / 3 - 0.5
}

function computeStarCount(width: number, height: number, densityScale: number): number {
  const areaCount = (width * height) / 6800
  return Math.max(40, Math.round(clamp(areaCount, 110, 320) * densityScale))
}

function pickTemperature(rng: () => number, layer: StarLayer): StarTemperature {
  const roll = rng()
  if (layer === 0) {
    return roll < 0.65 ? 'cool' : 'starlight'
  }
  if (layer === 3) {
    if (roll < 0.28) return 'cool'
    if (roll < 0.62) return 'starlight'
    if (roll < 0.84) return 'ivory'
    return 'warm'
  }
  if (roll < 0.36) return 'cool'
  if (roll < 0.76) return 'starlight'
  if (roll < 0.92) return 'ivory'
  return 'warm'
}

function pickLayer(rng: () => number): StarLayer {
  const roll = rng()
  if (roll < 0.46) return 0
  if (roll < 0.78) return 1
  if (roll < 0.95) return 2
  return 3
}

function generateStars(count: number, seed: number): StarParticle[] {
  const stars: StarParticle[] = []
  const rng = createRng(seed)
  const heroPositions: Array<{ nx: number; ny: number }> = []
  const driftAngle = -0.32 // Gentle diagonal upward-right drift (~ -18 deg)

  for (let i = 0; i < count; i++) {
    const layer = pickLayer(rng)
    const inBand = rng() < (layer <= 1 ? 0.42 : 0.28)

    let nx = -WRAP_MARGIN + rng() * WRAP_SPAN
    let ny = -WRAP_MARGIN + rng() * WRAP_SPAN

    if (inBand) {
      // Soft diagonal galactic drift across the frame
      const bandCenterY = 0.72 - 0.44 * nx
      ny = wrapNormalized(bandCenterY + sampleGaussian(rng) * 0.42)
    }

    // Keep foreground anchor stars spaced apart so they balance the composition
    if (layer === 3) {
      let bestNx = nx
      let bestNy = ny
      for (let attempt = 0; attempt < 6; attempt++) {
        const tooClose = heroPositions.some(
          (pos) => Math.hypot(pos.nx - bestNx, pos.ny - bestNy) < 0.16,
        )
        if (!tooClose) break
        bestNx = 0.06 + rng() * 0.88
        bestNy = 0.06 + rng() * 0.88
      }
      nx = bestNx
      ny = bestNy
      heroPositions.push({ nx, ny })
    }

    const depthByLayer: Record<StarLayer, readonly [number, number]> = {
      0: [0.12, 0.28],
      1: [0.28, 0.52],
      2: [0.52, 0.78],
      3: [0.78, 1.0],
    }
    const [minDepth, maxDepth] = depthByLayer[layer]
    const depth = minDepth + rng() * (maxDepth - minDepth)

    const radiusByLayer: Record<StarLayer, readonly [number, number]> = {
      0: [0.45, 0.85],
      1: [0.75, 1.2],
      2: [1.1, 1.7],
      3: [1.55, 2.35],
    }
    const [minRadius, maxRadius] = radiusByLayer[layer]
    const radius = minRadius + rng() * (maxRadius - minRadius)

    const alphaByLayer: Record<StarLayer, readonly [number, number]> = {
      0: [0.18, 0.42],
      1: [0.34, 0.64],
      2: [0.52, 0.84],
      3: [0.76, 0.96],
    }
    const [minAlpha, maxAlpha] = alphaByLayer[layer]
    const baseAlpha = minAlpha + rng() * (maxAlpha - minAlpha)

    const speed = 0.0036 * Math.pow(depth, 1.45)
    const angleJitter = (rng() - 0.5) * 0.22
    const angle = driftAngle + angleJitter

    stars.push({
      nx,
      ny,
      depth,
      layer,
      radius,
      baseAlpha,
      twinkleAmp: layer === 0 ? 0.05 + rng() * 0.06 : 0.08 + rng() * 0.16,
      twinkleSpeed: 0.35 + rng() * 0.95,
      twinklePhase: rng() * Math.PI * 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      temperature: pickTemperature(rng, layer),
      hasGlint: layer === 3 && rng() < 0.72,
    })
  }

  stars.sort((a, b) => a.depth - b.depth)
  return stars
}

export function createGlowSprites(): Record<StarTemperature, HTMLCanvasElement> | null {
  if (typeof document === 'undefined') return null

  const size = 48
  const half = size / 2
  const entries = (Object.keys(TEMPERATURE_RGB) as StarTemperature[]).map((temp) => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const [r, g, b] = TEMPERATURE_RGB[temp]
      const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.75)`)
      gradient.addColorStop(0.28, `rgba(${r}, ${g}, ${b}, 0.24)`)
      gradient.addColorStop(0.65, `rgba(${r}, ${g}, ${b}, 0.05)`)
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)
    }
    return [temp, canvas] as const
  })

  return Object.fromEntries(entries) as Record<StarTemperature, HTMLCanvasElement>
}

function buildBackdropCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // Deep midnight gradient
  const baseGrad = ctx.createLinearGradient(0, 0, 0, height)
  baseGrad.addColorStop(0, '#04060c')
  baseGrad.addColorStop(0.52, '#070b16')
  baseGrad.addColorStop(1, '#03050a')
  ctx.fillStyle = baseGrad
  ctx.fillRect(0, 0, width, height)

  const maxSpan = Math.max(width, height)

  // Subtle cool atmospheric nebula wash along the upper-left celestial band
  const coolWash = ctx.createRadialGradient(
    width * 0.28,
    height * 0.26,
    0,
    width * 0.28,
    height * 0.26,
    maxSpan * 0.72,
  )
  coolWash.addColorStop(0, 'rgba(22, 34, 68, 0.22)')
  coolWash.addColorStop(0.55, 'rgba(13, 21, 43, 0.1)')
  coolWash.addColorStop(1, 'rgba(5, 7, 13, 0)')
  ctx.fillStyle = coolWash
  ctx.fillRect(0, 0, width, height)

  // Counterbalancing faint warm cosmic dust in the lower-right quadrant
  const warmWash = ctx.createRadialGradient(
    width * 0.76,
    height * 0.74,
    0,
    width * 0.76,
    height * 0.74,
    maxSpan * 0.58,
  )
  warmWash.addColorStop(0, 'rgba(42, 31, 28, 0.11)')
  warmWash.addColorStop(0.6, 'rgba(18, 17, 26, 0.04)')
  warmWash.addColorStop(1, 'rgba(5, 7, 13, 0)')
  ctx.fillStyle = warmWash
  ctx.fillRect(0, 0, width, height)

  // Restrained perimeter vignette to focus depth inward
  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    maxSpan * 0.22,
    width * 0.5,
    height * 0.5,
    maxSpan * 0.85,
  )
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vignette.addColorStop(1, 'rgba(2, 3, 7, 0.45)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)

  return canvas
}

/** Creates initial starfield simulation state and cached offscreen surfaces. */
export function createStarfieldState(config: StarfieldConfig): StarfieldState {
  const width = Math.max(1, config.width)
  const height = Math.max(1, config.height)
  const densityScale = config.densityScale ?? 1
  const seed = config.seed ?? 2027
  const count = computeStarCount(width, height, densityScale)

  return {
    width,
    height,
    densityScale,
    seed,
    elapsed: 0,
    stars: generateStars(count, seed),
    backdropCanvas: buildBackdropCanvas(width, height),
    glowSprites: createGlowSprites(),
  }
}

/** Adapts cached backdrop and star density cleanly on viewport resize. */
export function resizeStarfieldState(
  state: StarfieldState,
  width: number,
  height: number,
): void {
  const nextWidth = Math.max(1, width)
  const nextHeight = Math.max(1, height)

  if (nextWidth === state.width && nextHeight === state.height) {
    return
  }

  const nextCount = computeStarCount(nextWidth, nextHeight, state.densityScale)
  if (Math.abs(nextCount - state.stars.length) >= 18) {
    state.stars = generateStars(nextCount, state.seed)
  }

  state.width = nextWidth
  state.height = nextHeight
  state.backdropCanvas = buildBackdropCanvas(nextWidth, nextHeight)
}

/** Advances star drift and twinkle clock with a clamped timestep. */
export function stepStarfield(state: StarfieldState, dtSeconds: number): void {
  const dt = clamp(dtSeconds, 0, 1 / 30)
  if (dt <= 0) return

  state.elapsed += dt
  for (const star of state.stars) {
    star.nx = wrapNormalized(star.nx + star.vx * dt)
    star.ny = wrapNormalized(star.ny + star.vy * dt)
  }
}

/** Renders deep-space backdrop and multi-depth star layers onto a 2D canvas. */
export function drawStarfield(
  ctx: CanvasRenderingContext2D,
  state: StarfieldState,
): void {
  const { width, height, elapsed, stars, backdropCanvas, glowSprites } = state

  if (backdropCanvas) {
    ctx.drawImage(backdropCanvas, 0, 0, width, height)
  } else {
    ctx.fillStyle = '#05070d'
    ctx.fillRect(0, 0, width, height)
  }

  for (const star of stars) {
    const x = star.nx * width
    const y = star.ny * height

    if (x < -20 || x > width + 20 || y < -20 || y > height + 20) {
      continue
    }

    const pulse = Math.sin(elapsed * star.twinkleSpeed + star.twinklePhase)
    const alpha = clamp(star.baseAlpha + pulse * star.twinkleAmp, 0.08, 1)
    const color = TEMPERATURE_CSS[star.temperature]

    // Soft halo for mid and foreground layers using cached radial sprites
    if (glowSprites && star.layer >= 1) {
      const haloRadius =
        star.layer === 3
          ? star.radius * 5.2
          : star.layer === 2
            ? star.radius * 3.6
            : star.radius * 2.4
      const sprite = glowSprites[star.temperature]
      ctx.globalAlpha = alpha * (star.layer === 3 ? 0.58 : 0.34)
      ctx.drawImage(sprite, x - haloRadius, y - haloRadius, haloRadius * 2, haloRadius * 2)
    }

    // Crisp star core
    ctx.globalAlpha = alpha
    ctx.fillStyle = color
    if (star.radius < 0.9) {
      const side = star.radius * 2
      ctx.fillRect(x - star.radius, y - star.radius, side, side)
    } else {
      ctx.beginPath()
      ctx.arc(x, y, star.radius, 0, Math.PI * 2)
      ctx.fill()
    }

    // Delicate diffraction cross-glint for sparse hero stars
    if (star.hasGlint) {
      const armLength = star.radius * (3.6 + pulse * 0.65)
      ctx.strokeStyle = color
      ctx.lineWidth = 0.75
      ctx.globalAlpha = alpha * 0.34
      ctx.beginPath()
      ctx.moveTo(x - armLength, y)
      ctx.lineTo(x + armLength, y)
      ctx.moveTo(x, y - armLength)
      ctx.lineTo(x, y + armLength)
      ctx.stroke()
    }
  }

  ctx.globalAlpha = 1
}
