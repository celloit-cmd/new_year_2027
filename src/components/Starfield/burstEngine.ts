import {
  clamp,
  TEMPERATURE_CSS,
  type StarTemperature,
} from './starfieldEngine.ts'

export type StarfieldSequencePhase =
  | 'idle'
  | 'exploding'
  | 'settled'
  | 'whirlpool'
  | 'revealed'

export interface NormalizedOrigin {
  readonly nx: number
  readonly ny: number
}

export interface BurstParticle {
  x: number
  y: number
  prevX: number
  prevY: number
  vx: number
  vy: number
  readonly driftVx: number
  readonly driftVy: number
  readonly depth: number
  readonly radius: number
  readonly baseAlpha: number
  readonly drag: number
  readonly twinklePhase: number
  readonly twinkleSpeed: number
  readonly temperature: StarTemperature
  readonly isVanguard: boolean
}

export interface BurstConfig {
  readonly width: number
  readonly height: number
  readonly origin?: NormalizedOrigin | null
  readonly reducedMotion?: boolean
  readonly seed?: number
}

export interface BurstState {
  width: number
  height: number
  originX: number
  originY: number
  readonly reducedMotion: boolean
  readonly durationSeconds: number
  readonly suspenseDurationSeconds: number
  elapsed: number
  suspenseElapsed: number
  completed: boolean
  suspenseCompleted: boolean
  readonly particles: BurstParticle[]
}

const BURST_DURATION_SECONDS = 2.15
const REDUCED_MOTION_DURATION_SECONDS = 0.32
const SUSPENSE_DURATION_SECONDS = 1.05
const REDUCED_MOTION_SUSPENSE_SECONDS = 0.22

function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function computeBurstCount(width: number, height: number): number {
  return Math.round(clamp((width * height) / 3100, 200, 460))
}

function pickBurstTemperature(rng: () => number, depth: number): StarTemperature {
  const roll = rng()
  if (depth > 0.72) {
    if (roll < 0.25) return 'cool'
    if (roll < 0.56) return 'starlight'
    if (roll < 0.84) return 'ivory'
    return 'warm'
  }
  if (roll < 0.38) return 'cool'
  if (roll < 0.78) return 'starlight'
  if (roll < 0.93) return 'ivory'
  return 'warm'
}

function generateBurstParticles(
  count: number,
  originX: number,
  originY: number,
  width: number,
  height: number,
  seed: number,
): BurstParticle[] {
  const rng = createRng(seed)
  const particles: BurstParticle[] = []
  const maxSpan = Math.hypot(width, height)

  for (let i = 0; i < count; i++) {
    // Stratify depth so explosion has foreground, mid, and deep volume
    const depthRoll = rng()
    const depth =
      depthRoll < 0.35
        ? 0.22 + rng() * 0.26
        : depthRoll < 0.82
          ? 0.48 + rng() * 0.32
          : 0.8 + rng() * 0.2

    const isVanguard = i < count * 0.26
    // Golden-angle jittered azimuth prevents uniform radial spokes
    const baseAngle = (i * 2.3999632 + (rng() - 0.5) * 0.65) % (Math.PI * 2)

    const speedFactor = isVanguard
      ? 0.72 + rng() * 0.62
      : 0.14 + Math.pow(rng(), 0.78) * 0.68
    const speed = maxSpan * speedFactor * (0.55 + depth * 0.65)

    // Subtle tangential velocity creates organic angular sweep
    const tangentRatio = (rng() - 0.5) * 0.28
    const cosA = Math.cos(baseAngle)
    const sinA = Math.sin(baseAngle)

    const vx = speed * (cosA - sinA * tangentRatio)
    const vy = speed * (sinA + cosA * tangentRatio)

    const drag = isVanguard ? 2.15 + rng() * 0.55 : 1.95 + rng() * 0.95
    const spawnOffset = 2 + rng() * 10
    const x = originX + cosA * spawnOffset
    const y = originY + sinA * spawnOffset

    const radius = isVanguard
      ? 1.15 + depth * 1.35
      : 0.6 + depth * 1.45

    const driftAngle = rng() * Math.PI * 2
    const driftSpeed = 2 + depth * 6

    particles.push({
      x,
      y,
      prevX: x,
      prevY: y,
      vx,
      vy,
      driftVx: Math.cos(driftAngle) * driftSpeed,
      driftVy: Math.sin(driftAngle) * driftSpeed,
      depth,
      radius,
      baseAlpha: 0.45 + depth * 0.5,
      drag,
      twinklePhase: rng() * Math.PI * 2,
      twinkleSpeed: 0.8 + rng() * 1.4,
      temperature: pickBurstTemperature(rng, depth),
      isVanguard,
    })
  }

  particles.sort((a, b) => a.depth - b.depth)
  return particles
}

function advanceBurstPhysics(state: BurstState, dt: number, elapsedForBlend: number): void {
  const floatBlend = smoothstep(0.95, BURST_DURATION_SECONDS, elapsedForBlend)
  const pad = 28

  for (const p of state.particles) {
    p.prevX = p.x
    p.prevY = p.y

    const decay = Math.exp(-p.drag * dt)
    p.vx *= decay
    p.vy *= decay

    p.x += (p.vx + p.driftVx * floatBlend) * dt
    p.y += (p.vy + p.driftVy * floatBlend) * dt

    // Soft wrap only if settled drift pushes a particle past outer padding
    if (p.x < -pad) p.x = state.width + pad
    else if (p.x > state.width + pad) p.x = -pad

    if (p.y < -pad) p.y = state.height + pad
    else if (p.y > state.height + pad) p.y = -pad
  }
}

/** Creates a deterministic star-explosion state ready for animation or reduced-motion settle. */
export function createBurstState(config: BurstConfig): BurstState {
  const width = Math.max(1, config.width)
  const height = Math.max(1, config.height)
  const originX = (config.origin?.nx ?? 0.5) * width
  const originY = (config.origin?.ny ?? 0.5) * height
  const reducedMotion = config.reducedMotion ?? false
  const seed = config.seed ?? 202702
  const count = computeBurstCount(width, height)

  const state: BurstState = {
    width,
    height,
    originX,
    originY,
    reducedMotion,
    durationSeconds: reducedMotion
      ? REDUCED_MOTION_DURATION_SECONDS
      : BURST_DURATION_SECONDS,
    suspenseDurationSeconds: reducedMotion
      ? REDUCED_MOTION_SUSPENSE_SECONDS
      : SUSPENSE_DURATION_SECONDS,
    elapsed: 0,
    suspenseElapsed: 0,
    completed: false,
    suspenseCompleted: false,
    particles: generateBurstParticles(count, originX, originY, width, height, seed),
  }

  // For reduced-motion, pre-compute the final settled spatial distribution with zero motion
  if (reducedMotion) {
    const fixedStep = 1 / 60
    for (let t = 0; t < BURST_DURATION_SECONDS; t += fixedStep) {
      advanceBurstPhysics(state, fixedStep, t)
    }
    for (const p of state.particles) {
      p.prevX = p.x
      p.prevY = p.y
      p.vx = 0
      p.vy = 0
    }
  }

  return state
}

/** Proportionally scales active or settled burst coordinates on viewport resize. */
export function resizeBurstState(
  state: BurstState,
  nextWidth: number,
  nextHeight: number,
): void {
  const width = Math.max(1, nextWidth)
  const height = Math.max(1, nextHeight)
  if (width === state.width && height === state.height) return

  const scaleX = width / state.width
  const scaleY = height / state.height

  state.originX *= scaleX
  state.originY *= scaleY
  for (const p of state.particles) {
    p.x *= scaleX
    p.y *= scaleY
    p.prevX *= scaleX
    p.prevY *= scaleY
  }

  state.width = width
  state.height = height
}

export interface BurstStepResult {
  readonly burstJustCompleted: boolean
  readonly suspenseJustCompleted: boolean
}

/** Advances the burst and suspense phases, reporting milestone transitions. */
export function stepBurst(state: BurstState, dtSeconds: number): BurstStepResult {
  const dt = clamp(dtSeconds, 0, 1 / 30)
  if (dt <= 0) {
    return { burstJustCompleted: false, suspenseJustCompleted: false }
  }

  state.elapsed += dt

  if (!state.reducedMotion) {
    // Gently quiet ambient drift in the final 0.4s of suspense before whirlpool begins
    const suspenseSlowdown = state.completed
      ? 1 - 0.72 * smoothstep(state.suspenseDurationSeconds - 0.4, state.suspenseDurationSeconds, state.suspenseElapsed)
      : 1
    advanceBurstPhysics(state, dt * suspenseSlowdown, state.elapsed)
  }

  let burstJustCompleted = false
  if (!state.completed && state.elapsed >= state.durationSeconds) {
    state.completed = true
    burstJustCompleted = true
  }

  let suspenseJustCompleted = false
  if (state.completed && !state.suspenseCompleted) {
    state.suspenseElapsed += dt
    if (state.suspenseElapsed >= state.suspenseDurationSeconds) {
      state.suspenseCompleted = true
      suspenseJustCompleted = true
    }
  }

  return { burstJustCompleted, suspenseJustCompleted }
}

/** Renders the central ignition bloom, vanguard light streaks, and burst stars. */
export function drawBurst(
  ctx: CanvasRenderingContext2D,
  state: BurstState,
  glowSprites: Record<StarTemperature, HTMLCanvasElement> | null,
): void {
  const { width, height, originX, originY, elapsed, reducedMotion, particles } = state

  if (reducedMotion) {
    const fadeIn = clamp(elapsed / REDUCED_MOTION_DURATION_SECONDS, 0, 1)

    if (glowSprites && fadeIn > 0) {
      const bloomAlpha = 0.22 * (1 - fadeIn * 0.45)
      const bloomRadius = Math.min(width, height) * 0.22
      ctx.globalAlpha = bloomAlpha
      ctx.drawImage(
        glowSprites.starlight,
        originX - bloomRadius,
        originY - bloomRadius,
        bloomRadius * 2,
        bloomRadius * 2,
      )
    }

    for (const p of particles) {
      if (p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20) continue
      const alpha = p.baseAlpha * 0.85 * fadeIn
      const color = TEMPERATURE_CSS[p.temperature]

      if (glowSprites && p.depth >= 0.48) {
        const haloRadius = p.radius * (3.2 + p.depth * 1.8)
        ctx.globalAlpha = alpha * 0.42
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

  // Central ignition bloom & restrained shockwave ring during initial 0.85s
  if (elapsed < 0.85) {
    const normT = elapsed / 0.85
    const bloomEase = Math.sin(Math.min(elapsed / 0.14, 1) * (Math.PI / 2))
    const bloomFade = Math.pow(1 - normT, 1.9)
    const bloomRadius = Math.min(width, height) * (0.14 + normT * 0.24)

    if (glowSprites) {
      ctx.globalAlpha = 0.58 * bloomEase * bloomFade
      ctx.drawImage(
        glowSprites.ivory,
        originX - bloomRadius,
        originY - bloomRadius,
        bloomRadius * 2,
        bloomRadius * 2,
      )
      ctx.globalAlpha = 0.42 * bloomEase * bloomFade
      ctx.drawImage(
        glowSprites.starlight,
        originX - bloomRadius * 0.55,
        originY - bloomRadius * 0.55,
        bloomRadius * 1.1,
        bloomRadius * 1.1,
      )
    }

    const ringProgress = clamp(elapsed / 0.72, 0, 1)
    const ringEase = 1 - Math.pow(1 - ringProgress, 3)
    const ringRadius = 10 + ringEase * Math.min(width, height) * 0.26
    const ringAlpha = 0.16 * Math.pow(1 - ringProgress, 2.2)

    if (ringAlpha > 0.01) {
      ctx.strokeStyle = TEMPERATURE_CSS.starlight
      ctx.lineWidth = 1
      ctx.globalAlpha = ringAlpha
      ctx.beginPath()
      ctx.arc(originX, originY, ringRadius, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  const spawnFade = clamp(elapsed / 0.06, 0, 1)

  for (const p of particles) {
    if (p.x < -30 || p.x > width + 30 || p.y < -30 || p.y > height + 30) {
      continue
    }

    const shimmer =
      elapsed > 0.9
        ? Math.sin(elapsed * p.twinkleSpeed + p.twinklePhase) *
          0.16 *
          smoothstep(0.9, 1.8, elapsed)
        : 0
    const alpha = clamp((p.baseAlpha + shimmer) * spawnFade, 0.08, 1)
    const color = TEMPERATURE_CSS[p.temperature]

    // Tapered luminous wake during high-velocity expansion (two-stage for zero allocations)
    const speed = Math.hypot(p.vx, p.vy)
    if (speed > 85 && elapsed < 1.25) {
      const dx = p.x - p.prevX
      const dy = p.y - p.prevY
      const segLen = Math.hypot(dx, dy)
      if (segLen > 0.5) {
        const streakLen = Math.min(24, Math.max(segLen * 2.1, speed * 0.02))
        const nx = dx / segLen
        const ny = dy / segLen
        ctx.strokeStyle = color
        ctx.lineCap = 'round'

        ctx.lineWidth = p.radius * 0.55
        ctx.globalAlpha = alpha * 0.18
        ctx.beginPath()
        ctx.moveTo(p.x - nx * streakLen, p.y - ny * streakLen)
        ctx.lineTo(p.x - nx * streakLen * 0.38, p.y - ny * streakLen * 0.38)
        ctx.stroke()

        ctx.lineWidth = p.radius * 0.92
        ctx.globalAlpha = alpha * 0.44
        ctx.beginPath()
        ctx.moveTo(p.x - nx * streakLen * 0.44, p.y - ny * streakLen * 0.44)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
      }
    }

    if (glowSprites && (p.depth >= 0.48 || p.isVanguard)) {
      const haloRadius = p.radius * (p.isVanguard ? 4.4 : 3.2)
      ctx.globalAlpha = alpha * (p.isVanguard ? 0.52 : 0.36)
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
    if (p.radius < 0.9) {
      const side = p.radius * 2
      ctx.fillRect(p.x - p.radius, p.y - p.radius, side, side)
    } else {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Subtle pre-whirlpool gravitational shimmer cue at the end of Suspense
  if (state.completed && !state.suspenseCompleted && glowSprites) {
    const cueStart = Math.max(0, state.suspenseDurationSeconds - 0.42)
    const cueProgress = smoothstep(cueStart, state.suspenseDurationSeconds, state.suspenseElapsed)
    if (cueProgress > 0.01) {
      const cueRadius = Math.min(width, height) * (0.08 + cueProgress * 0.1)
      ctx.globalAlpha = 0.19 * cueProgress
      ctx.drawImage(
        glowSprites.starlight,
        width * 0.5 - cueRadius,
        height * 0.485 - cueRadius,
        cueRadius * 2,
        cueRadius * 2,
      )
    }
  }

  ctx.globalAlpha = 1
}
