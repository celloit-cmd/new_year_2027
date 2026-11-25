import type { BurstParticle } from './burstEngine.ts'
import { clamp, TEMPERATURE_CSS, type StarTemperature } from './starfieldEngine.ts'
import {
  generateTypographyTargets,
  type TypographyTarget,
} from './typographyTargets.ts'

export interface TypographyParticle {
  x: number
  y: number
  prevX: number
  prevY: number
  startX: number
  startY: number
  targetX: number
  targetY: number
  targetNx: number
  targetNy: number
  readonly lineIndex: number
  readonly depth: number
  readonly radius: number
  readonly baseAlpha: number
  readonly temperature: StarTemperature
  readonly twinklePhase: number
  readonly twinkleSpeed: number
  readonly swirlTurns: number
  readonly swirlLift: number
  readonly spawnDelay: number
  readonly arrivalEnd: number
  readonly microOrbitSpeed: number
  readonly microOrbitPhase: number
  readonly isAccentGlow: boolean
  readonly isSurplus: boolean
}

export interface TypographyState {
  width: number
  height: number
  readonly reducedMotion: boolean
  readonly durationSeconds: number
  elapsed: number
  completed: boolean
  layout: 'desktop' | 'mobile'
  readonly particles: TypographyParticle[]
}

const WHIRLPOOL_DURATION_SECONDS = 3.45
const REDUCED_MOTION_REVEAL_SECONDS = 0.45

function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function easeOutQuart(t: number): number {
  const inv = 1 - t
  return 1 - inv * inv * inv * inv
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function shortestAngleDiff(fromAngle: number, toAngle: number): number {
  let diff = (toAngle - fromAngle) % (Math.PI * 2)
  if (diff > Math.PI) diff -= Math.PI * 2
  if (diff < -Math.PI) diff += Math.PI * 2
  return diff
}

function pickTemperature(rng: () => number, lineIndex: number, isMobile: boolean): StarTemperature {
  const isYearLine = isMobile ? lineIndex === 2 : lineIndex === 1
  const roll = rng()
  if (isYearLine) {
    if (roll < 0.22) return 'cool'
    if (roll < 0.56) return 'starlight'
    if (roll < 0.82) return 'ivory'
    return 'warm'
  }
  if (roll < 0.34) return 'cool'
  if (roll < 0.78) return 'starlight'
  if (roll < 0.94) return 'ivory'
  return 'warm'
}

/**
 * Transitions settled burst particles (plus additional swirling stars when needed)
 * into a celestial whirlpool that forms "HAPPY NEW YEAR 2027".
 */
export function createTypographyState(
  width: number,
  height: number,
  settledParticles: readonly BurstParticle[],
  reducedMotion: boolean,
  seed = 202704,
): TypographyState {
  const safeW = Math.max(1, width)
  const safeH = Math.max(1, height)
  const rng = createRng(seed)
  const { targets, layout } = generateTypographyTargets(safeW, safeH)

  // Shuffle targets deterministically so burst particles distribute evenly across all words
  const shuffledTargets: TypographyTarget[] = [...targets]
  for (let i = shuffledTargets.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = shuffledTargets[i]
    const swap = shuffledTargets[j]
    if (tmp && swap) {
      shuffledTargets[i] = swap
      shuffledTargets[j] = tmp
    }
  }

  const centerX = safeW * 0.5
  const centerY = safeH * 0.485
  const maxDim = Math.hypot(safeW, safeH)
  const particles: TypographyParticle[] = []
  const isMobile = layout === 'mobile'

  const baseParticleSize = isMobile ? 1.0 : 1.14
  const totalCount = Math.max(settledParticles.length, shuffledTargets.length)

  for (let i = 0; i < totalCount; i++) {
    const existing = settledParticles[i]
    const target = shuffledTargets[i]

    if (target) {
      const targetX = target.nx * safeW
      const targetY = target.ny * safeH

      let startX: number
      let startY: number
      let spawnDelay = 0
      let depth: number
      let temperature: StarTemperature

      if (existing) {
        startX = existing.x
        startY = existing.y
        depth = existing.depth
        temperature = existing.temperature
      } else {
        // Spawn supplemental stars along outer spiral arms so they gather naturally into the vortex
        const armAngle = rng() * Math.PI * 2
        const armRadius = maxDim * (0.28 + rng() * 0.36)
        startX = centerX + Math.cos(armAngle) * armRadius
        startY = centerY + Math.sin(armAngle) * armRadius
        spawnDelay = rng() * 0.36
        depth = 0.3 + rng() * 0.65
        temperature = pickTemperature(rng, target.lineIndex, isMobile)
      }

      const x = reducedMotion ? targetX : startX
      const y = reducedMotion ? targetY : startY

      particles.push({
        x,
        y,
        prevX: x,
        prevY: y,
        startX,
        startY,
        targetX,
        targetY,
        targetNx: target.nx,
        targetNy: target.ny,
        lineIndex: target.lineIndex,
        depth,
        radius: baseParticleSize * (0.72 + depth * 0.56),
        baseAlpha: 0.68 + depth * 0.3,
        temperature,
        twinklePhase: existing ? existing.twinklePhase : rng() * Math.PI * 2,
        twinkleSpeed: 0.7 + rng() * 1.35,
        swirlTurns: 0.65 + rng() * 0.48,
        swirlLift: (rng() - 0.35) * Math.min(safeW, safeH) * 0.11,
        spawnDelay,
        arrivalEnd: 0.78 + rng() * 0.22,
        microOrbitSpeed: 0.55 + rng() * 0.75,
        microOrbitPhase: rng() * Math.PI * 2,
        isAccentGlow: rng() < 0.22,
        isSurplus: false,
      })
    } else if (existing) {
      // Any rare surplus burst star recedes softly into peripheral ambient starlight
      particles.push({
        x: existing.x,
        y: existing.y,
        prevX: existing.x,
        prevY: existing.y,
        startX: existing.x,
        startY: existing.y,
        targetX: existing.x,
        targetY: existing.y,
        targetNx: existing.x / safeW,
        targetNy: existing.y / safeH,
        lineIndex: 0,
        depth: existing.depth,
        radius: existing.radius * 0.85,
        baseAlpha: existing.baseAlpha * 0.45,
        temperature: existing.temperature,
        twinklePhase: existing.twinklePhase,
        twinkleSpeed: existing.twinkleSpeed,
        swirlTurns: 0.4,
        swirlLift: 0,
        spawnDelay: 0,
        arrivalEnd: 0.9,
        microOrbitSpeed: 0.4,
        microOrbitPhase: rng() * Math.PI * 2,
        isAccentGlow: false,
        isSurplus: true,
      })
    }
  }

  particles.sort((a, b) => a.depth - b.depth)

  return {
    width: safeW,
    height: safeH,
    reducedMotion,
    durationSeconds: reducedMotion
      ? REDUCED_MOTION_REVEAL_SECONDS
      : WHIRLPOOL_DURATION_SECONDS,
    elapsed: 0,
    completed: false,
    layout,
    particles,
  }
}

/** Re-samples typography targets cleanly when viewport dimensions or layout change. */
export function resizeTypographyState(
  state: TypographyState,
  nextWidth: number,
  nextHeight: number,
): void {
  const safeW = Math.max(1, nextWidth)
  const safeH = Math.max(1, nextHeight)
  if (safeW === state.width && safeH === state.height) return

  const scaleX = safeW / state.width
  const scaleY = safeH / state.height
  const { targets, layout } = generateTypographyTargets(safeW, safeH)
  state.layout = layout

  let targetIdx = 0
  for (const p of state.particles) {
    p.startX *= scaleX
    p.startY *= scaleY
    p.x *= scaleX
    p.y *= scaleY
    p.prevX *= scaleX
    p.prevY *= scaleY

    if (!p.isSurplus && targets.length > 0) {
      const target = targets[targetIdx % targets.length]
      if (target) {
        p.targetNx = target.nx
        p.targetNy = target.ny
        p.targetX = target.nx * safeW
        p.targetY = target.ny * safeH
        if (state.reducedMotion || state.completed) {
          p.x = p.targetX
          p.y = p.targetY
          p.prevX = p.targetX
          p.prevY = p.targetY
        }
      }
      targetIdx++
    } else {
      p.targetX *= scaleX
      p.targetY *= scaleY
    }
  }

  state.width = safeW
  state.height = safeH
}

/** Advances whirlpool convergence and ongoing post-reveal starlight shimmer. */
export function stepTypography(state: TypographyState, dtSeconds: number): boolean {
  const dt = clamp(dtSeconds, 0, 1 / 30)
  if (dt <= 0) return false

  state.elapsed += dt

  if (state.reducedMotion) {
    if (!state.completed && state.elapsed >= state.durationSeconds) {
      state.completed = true
      return true
    }
    return false
  }

  const centerX = state.width * 0.5
  const centerY = state.height * 0.485
  const overallProgress = clamp(state.elapsed / state.durationSeconds, 0, 1)

  for (const p of state.particles) {
    p.prevX = p.x
    p.prevY = p.y

    if (p.isSurplus) {
      continue
    }

    const activeWindow = Math.max(0.2, p.arrivalEnd - p.spawnDelay * 0.4)
    const startOffset = p.spawnDelay * 0.4
    const localT = clamp((overallProgress - startOffset) / activeWindow, 0, 1)

    if (localT < 1) {
      const sx = p.startX - centerX
      const sy = p.startY - centerY
      const tx = p.targetX - centerX
      const ty = p.targetY - centerY

      const r0 = Math.hypot(sx, sy)
      const r1 = Math.hypot(tx, ty)
      const theta0 = Math.atan2(sy, sx)
      const theta1 = Math.atan2(ty, tx)

      const deltaTheta =
        shortestAngleDiff(theta0, theta1) + p.swirlTurns * Math.PI * 2

      const angleEase = easeInOutCubic(localT)
      const radiusEase = easeOutQuart(localT)

      const theta = theta0 + deltaTheta * angleEase
      const lift = Math.sin(Math.PI * localT) * p.swirlLift
      const r = Math.max(0, r0 + (r1 - r0) * radiusEase + lift)

      p.x = centerX + Math.cos(theta) * r
      p.y = centerY + Math.sin(theta) * r
    } else {
      // Subtle living micro-motion once anchored so star typography never looks frozen
      const driftAmp = state.layout === 'mobile' ? 0.36 : 0.48
      const angle = state.elapsed * p.microOrbitSpeed + p.microOrbitPhase
      p.x = p.targetX + Math.cos(angle) * driftAmp
      p.y = p.targetY + Math.sin(angle * 0.85) * driftAmp
    }
  }

  if (!state.completed && state.elapsed >= state.durationSeconds) {
    state.completed = true
    return true
  }

  return false
}

/** Renders the swirling vortex trails and star-composed HAPPY NEW YEAR 2027 typography. */
export function drawTypography(
  ctx: CanvasRenderingContext2D,
  state: TypographyState,
  glowSprites: Record<StarTemperature, HTMLCanvasElement> | null,
): void {
  const { width, height, elapsed, durationSeconds, reducedMotion, particles } = state

  if (reducedMotion) {
    const fadeIn = clamp(elapsed / durationSeconds, 0, 1)
    for (const p of particles) {
      if (p.isSurplus) continue
      const color = TEMPERATURE_CSS[p.temperature]
      const alpha = p.baseAlpha * fadeIn

      if (glowSprites && p.isAccentGlow) {
        const haloRadius = p.radius * 3.1
        ctx.globalAlpha = alpha * 0.34
        ctx.drawImage(
          glowSprites[p.temperature],
          p.x - haloRadius,
          p.y - haloRadius,
          haloRadius * 2,
          haloRadius * 2,
        )
      }

      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    return
  }

  const overallProgress = clamp(elapsed / durationSeconds, 0, 1)

  // Subtle central vortex glow during mid-whirlpool that dissolves as text sharpens
  if (glowSprites && overallProgress < 0.88) {
    const vortexEnergy = Math.sin(overallProgress * Math.PI) * (1 - overallProgress * 0.45)
    const vortexRadius = Math.min(width, height) * (0.24 + overallProgress * 0.14)
    ctx.globalAlpha = 0.24 * vortexEnergy
    ctx.drawImage(
      glowSprites.starlight,
      width * 0.5 - vortexRadius,
      height * 0.485 - vortexRadius,
      vortexRadius * 2,
      vortexRadius * 2,
    )
  }

  for (const p of particles) {
    if (p.x < -30 || p.x > width + 30 || p.y < -30 || p.y > height + 30) {
      continue
    }

    const fadeIn =
      p.spawnDelay > 0 ? clamp((elapsed - p.spawnDelay) / 0.55, 0, 1) : 1
    if (fadeIn <= 0) continue

    if (p.isSurplus) {
      const surplusFade = 1 - clamp(overallProgress / 0.65, 0, 1)
      if (surplusFade <= 0.01) continue
      ctx.globalAlpha = p.baseAlpha * surplusFade
      ctx.fillStyle = TEMPERATURE_CSS[p.temperature]
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fill()
      continue
    }

    const shimmer = Math.sin(elapsed * p.twinkleSpeed + p.twinklePhase) * 0.16
    const alpha = clamp((p.baseAlpha + shimmer) * fadeIn, 0.14, 1)
    const color = TEMPERATURE_CSS[p.temperature]

    // Curved swirl wake during active whirlpool convergence
    if (overallProgress < 0.92) {
      const dx = p.x - p.prevX
      const dy = p.y - p.prevY
      const segLen = Math.hypot(dx, dy)
      if (segLen > 0.7) {
        const streakLen = Math.min(18, segLen * 2.2)
        const nx = dx / segLen
        const ny = dy / segLen
        ctx.strokeStyle = color
        ctx.lineCap = 'round'
        ctx.lineWidth = p.radius * 0.72
        ctx.globalAlpha = alpha * 0.34 * (1 - overallProgress * 0.5)
        ctx.beginPath()
        ctx.moveTo(p.x - nx * streakLen, p.y - ny * streakLen)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
      }
    }

    if (glowSprites && p.isAccentGlow) {
      const haloRadius = p.radius * 3.1
      ctx.globalAlpha = alpha * 0.36
      ctx.drawImage(
        glowSprites[p.temperature],
        p.x - haloRadius,
        p.y - haloRadius,
        haloRadius * 2,
        haloRadius * 2,
      )
    }

    ctx.globalAlpha = alpha
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalAlpha = 1
}
