import { clamp, TEMPERATURE_CSS, type StarTemperature } from './starfieldEngine.ts'

export interface ShootingStar {
  x: number
  y: number
  readonly vx: number
  readonly vy: number
  readonly maxLength: number
  readonly thickness: number
  readonly maxAlpha: number
  readonly duration: number
  age: number
  readonly temperature: StarTemperature
}

export interface ShootingStarState {
  width: number
  height: number
  readonly reducedMotion: boolean
  readonly active: ShootingStar[]
  nextSpawnIn: number
  rngState: number
}

const MAX_CONCURRENT_METEORS = 2

function nextRandom(state: ShootingStarState): number {
  state.rngState = (state.rngState + 0x6d2b79f5) >>> 0
  let t = Math.imul(state.rngState ^ (state.rngState >>> 15), 1 | state.rngState)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function createMeteor(state: ShootingStarState, initialAge = 0): ShootingStar {
  const { width, height } = state
  const r1 = nextRandom(state)
  const r2 = nextRandom(state)
  const r3 = nextRandom(state)
  const r4 = nextRandom(state)
  const r5 = nextRandom(state)

  // Alternate gentle upper-left-to-right and upper-right-to-left trajectories
  const leftToRight = r1 < 0.72
  const startX = leftToRight
    ? width * (0.06 + r2 * 0.56)
    : width * (0.38 + r2 * 0.56)
  const startY = height * (0.04 + r3 * 0.3)

  const baseAngle = leftToRight ? 0.44 + r4 * 0.24 : Math.PI - (0.44 + r4 * 0.24)
  const minSpan = Math.min(width, height)
  const speed = clamp(minSpan * (0.34 + r5 * 0.22), 200, 390)
  const duration = 1.25 + r4 * 0.6
  const maxLength = clamp(minSpan * (0.12 + r5 * 0.08), 64, 138)

  const tempRoll = nextRandom(state)
  const temperature: StarTemperature =
    tempRoll < 0.36 ? 'cool' : tempRoll < 0.78 ? 'starlight' : 'ivory'

  return {
    x: startX + Math.cos(baseAngle) * speed * initialAge,
    y: startY + Math.sin(baseAngle) * speed * initialAge,
    vx: Math.cos(baseAngle) * speed,
    vy: Math.sin(baseAngle) * speed,
    maxLength,
    thickness: 1.05 + r5 * 0.6,
    maxAlpha: 0.55 + r4 * 0.28,
    duration,
    age: initialAge,
    temperature,
  }
}

/**
 * Creates a restrained, continuous shooting-star simulation state.
 * Seeds one active meteor immediately so the sky is alive on arrival.
 */
export function createShootingStarState(
  width: number,
  height: number,
  reducedMotion: boolean,
  seed = 202706,
): ShootingStarState {
  const state: ShootingStarState = {
    width: Math.max(1, width),
    height: Math.max(1, height),
    reducedMotion,
    active: [],
    nextSpawnIn: 1.6,
    rngState: seed >>> 0,
  }

  if (!reducedMotion) {
    state.active.push(createMeteor(state, 0.22))
    state.nextSpawnIn = 0.85 + nextRandom(state) * 0.95
  }

  return state
}

/** Proportionally scales active meteor positions on viewport resize. */
export function resizeShootingStarState(
  state: ShootingStarState,
  nextWidth: number,
  nextHeight: number,
): void {
  const width = Math.max(1, nextWidth)
  const height = Math.max(1, nextHeight)
  if (width === state.width && height === state.height) return

  const scaleX = width / state.width
  const scaleY = height / state.height
  for (const meteor of state.active) {
    meteor.x *= scaleX
    meteor.y *= scaleY
  }

  state.width = width
  state.height = height
}

/** Advances active shooting stars and schedules sparse, unhurried spawns. */
export function stepShootingStars(
  state: ShootingStarState,
  dtSeconds: number,
): void {
  if (state.reducedMotion) return
  const dt = clamp(dtSeconds, 0, 1 / 30)
  if (dt <= 0) return

  for (let i = state.active.length - 1; i >= 0; i--) {
    const meteor = state.active[i]
    if (!meteor) continue
    meteor.age += dt
    meteor.x += meteor.vx * dt
    meteor.y += meteor.vy * dt

    if (
      meteor.age >= meteor.duration ||
      meteor.x < -180 ||
      meteor.x > state.width + 180 ||
      meteor.y > state.height + 180
    ) {
      state.active.splice(i, 1)
    }
  }

  state.nextSpawnIn -= dt
  if (state.nextSpawnIn <= 0) {
    if (state.active.length < MAX_CONCURRENT_METEORS) {
      state.active.push(createMeteor(state, 0))
    }
    state.nextSpawnIn = 0.8 + nextRandom(state) * 1.15
  }
}

/** Renders tapered, restrained celestial shooting stars onto the 2D canvas. */
export function drawShootingStars(
  ctx: CanvasRenderingContext2D,
  state: ShootingStarState,
  glowSprites: Record<StarTemperature, HTMLCanvasElement> | null,
): void {
  if (state.reducedMotion || state.active.length === 0) {
    return
  }

  for (const meteor of state.active) {
    const progress = clamp(meteor.age / meteor.duration, 0, 1)
    const fadeIn = clamp(progress / 0.18, 0, 1)
    const fadeOut = 1 - clamp((progress - 0.52) / 0.48, 0, 1)
    const envelope = fadeIn * fadeOut * fadeOut
    if (envelope <= 0.01) continue

    const speed = Math.hypot(meteor.vx, meteor.vy) || 1
    const dirX = meteor.vx / speed
    const dirY = meteor.vy / speed
    const tailLen = meteor.maxLength * (0.45 + 0.55 * Math.sin(progress * Math.PI))

    const color = TEMPERATURE_CSS[meteor.temperature]
    const baseAlpha = meteor.maxAlpha * envelope

    // Three-segment tapered wake avoids per-frame gradient allocations
    ctx.strokeStyle = color
    ctx.lineCap = 'round'

    ctx.lineWidth = meteor.thickness * 0.45
    ctx.globalAlpha = baseAlpha * 0.14
    ctx.beginPath()
    ctx.moveTo(meteor.x - dirX * tailLen, meteor.y - dirY * tailLen)
    ctx.lineTo(meteor.x - dirX * tailLen * 0.55, meteor.y - dirY * tailLen * 0.55)
    ctx.stroke()

    ctx.lineWidth = meteor.thickness * 0.72
    ctx.globalAlpha = baseAlpha * 0.34
    ctx.beginPath()
    ctx.moveTo(meteor.x - dirX * tailLen * 0.6, meteor.y - dirY * tailLen * 0.6)
    ctx.lineTo(meteor.x - dirX * tailLen * 0.22, meteor.y - dirY * tailLen * 0.22)
    ctx.stroke()

    ctx.lineWidth = meteor.thickness
    ctx.globalAlpha = baseAlpha * 0.78
    ctx.beginPath()
    ctx.moveTo(meteor.x - dirX * tailLen * 0.26, meteor.y - dirY * tailLen * 0.26)
    ctx.lineTo(meteor.x, meteor.y)
    ctx.stroke()

    if (glowSprites) {
      const haloR = meteor.thickness * 3.6
      ctx.globalAlpha = baseAlpha * 0.52
      ctx.drawImage(
        glowSprites[meteor.temperature],
        meteor.x - haloR,
        meteor.y - haloR,
        haloR * 2,
        haloR * 2,
      )
    }

    ctx.globalAlpha = baseAlpha
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(meteor.x, meteor.y, meteor.thickness * 0.85, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalAlpha = 1
}
