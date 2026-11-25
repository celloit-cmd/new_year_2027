import {
  clamp,
  createGlowSprites,
  TEMPERATURE_CSS,
  type StarTemperature,
} from '../Starfield/starfieldEngine.ts'
import type { ActivePortalPhase } from './portalState.ts'

export interface PortalParticle {
  angle: number
  normRadius: number
  readonly baseNormRadius: number
  readonly angularSpeed: number
  readonly radialSpeed: number
  readonly depth: number
  readonly radius: number
  readonly baseAlpha: number
  readonly temperature: StarTemperature
  readonly ringBias: number
}

export interface PortalRenderState {
  width: number
  height: number
  readonly reducedMotion: boolean
  readonly durationSeconds: number
  elapsed: number
  phase: ActivePortalPhase
  completed: boolean
  readonly particles: PortalParticle[]
  readonly glowSprites: Record<StarTemperature, HTMLCanvasElement> | null
}

const PORTAL_DURATION_SECONDS = 3.15
const REDUCED_MOTION_PORTAL_SECONDS = 0.65

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

function easeOutCubic(t: number): number {
  const inv = 1 - t
  return 1 - inv * inv * inv
}

function easeInCubic(t: number): number {
  return t * t * t
}

function pickTemperature(rng: () => number, depth: number): StarTemperature {
  const roll = rng()
  if (depth > 0.72) {
    if (roll < 0.24) return 'cool'
    if (roll < 0.56) return 'starlight'
    if (roll < 0.84) return 'ivory'
    return 'warm'
  }
  if (roll < 0.42) return 'cool'
  if (roll < 0.8) return 'starlight'
  return 'ivory'
}

function computePortalParticleCount(width: number, height: number): number {
  return Math.round(clamp((width * height) / 6200, 140, 260))
}

function generatePortalParticles(count: number, seed: number): PortalParticle[] {
  const rng = createRng(seed)
  const particles: PortalParticle[] = []

  for (let i = 0; i < count; i++) {
    const depth = 0.2 + rng() * 0.8
    const baseNormRadius = 0.08 + Math.pow(rng(), 0.72) * 0.62
    particles.push({
      angle: rng() * Math.PI * 2,
      normRadius: baseNormRadius,
      baseNormRadius,
      angularSpeed: (0.45 + rng() * 1.15) * (0.6 + (1 - depth) * 0.7),
      radialSpeed: 0.22 + depth * 0.95,
      depth,
      radius: 0.7 + depth * 1.45,
      baseAlpha: 0.42 + depth * 0.54,
      temperature: pickTemperature(rng, depth),
      ringBias: rng(),
    })
  }

  particles.sort((a, b) => a.depth - b.depth)
  return particles
}

export function resolvePortalPhase(
  elapsed: number,
  reducedMotion: boolean,
): ActivePortalPhase {
  if (reducedMotion) {
    if (elapsed < 0.16) return 'igniting'
    if (elapsed < 0.34) return 'forming'
    if (elapsed < 0.5) return 'expanding'
    return 'traversing'
  }

  if (elapsed < 0.7) return 'igniting'
  if (elapsed < 1.85) return 'forming'
  if (elapsed < 2.55) return 'expanding'
  return 'traversing'
}

export function createPortalRenderState(
  width: number,
  height: number,
  reducedMotion: boolean,
  seed = 202705,
): PortalRenderState {
  const safeW = Math.max(1, width)
  const safeH = Math.max(1, height)
  const count = computePortalParticleCount(safeW, safeH)

  return {
    width: safeW,
    height: safeH,
    reducedMotion,
    durationSeconds: reducedMotion
      ? REDUCED_MOTION_PORTAL_SECONDS
      : PORTAL_DURATION_SECONDS,
    elapsed: 0,
    phase: 'igniting',
    completed: false,
    particles: generatePortalParticles(count, seed),
    glowSprites: createGlowSprites(),
  }
}

export function resizePortalRenderState(
  state: PortalRenderState,
  width: number,
  height: number,
): void {
  state.width = Math.max(1, width)
  state.height = Math.max(1, height)
}

export interface PortalStepResult {
  readonly nextPhase: ActivePortalPhase
  readonly completedNow: boolean
}

export function stepPortal(
  state: PortalRenderState,
  dtSeconds: number,
): PortalStepResult {
  const dt = clamp(dtSeconds, 0, 1 / 30)
  if (dt <= 0) {
    return { nextPhase: state.phase, completedNow: false }
  }

  state.elapsed += dt
  const nextPhase = resolvePortalPhase(state.elapsed, state.reducedMotion)
  state.phase = nextPhase

  if (!state.reducedMotion) {
    const t = state.elapsed
    for (const p of state.particles) {
      if (t < 1.85) {
        // Phase B/C: inward pull toward threshold ring and rotational swirl
        const swirlRamp = smoothstep(0.15, 1.0, t)
        p.angle += p.angularSpeed * swirlRamp * dt
        const targetBand = 0.14 + p.ringBias * 0.18
        const pull = smoothstep(0.1, 1.55, t)
        p.normRadius =
          p.baseNormRadius * (1 - pull * 0.65) + targetBand * (pull * 0.65)
      } else {
        // Phase D: radial tunnel warp outward as viewer traverses the portal
        const warpProgress = smoothstep(1.85, 3.05, t)
        p.angle += p.angularSpeed * (1 - warpProgress * 0.6) * dt
        p.normRadius += p.radialSpeed * (0.25 + warpProgress * 2.4) * dt
      }
    }
  }

  let completedNow = false
  if (!state.completed && state.elapsed >= state.durationSeconds) {
    state.completed = true
    completedNow = true
  }

  return { nextPhase, completedNow }
}

export function drawPortal(
  ctx: CanvasRenderingContext2D,
  state: PortalRenderState,
): void {
  const { width, height, elapsed, durationSeconds, reducedMotion, glowSprites } =
    state
  ctx.clearRect(0, 0, width, height)

  const cx = width * 0.5
  const cy = height * 0.5
  const minSpan = Math.min(width, height)
  const maxSpan = Math.hypot(width, height)

  if (reducedMotion) {
    const progress = clamp(elapsed / durationSeconds, 0, 1)
    const ringAppear = smoothstep(0, 0.42, progress)
    const veilFade = smoothstep(0.42, 1, progress)

    // Soft midnight veil dimming underlying Gateway gently
    ctx.fillStyle = `rgba(5, 7, 13, ${0.42 * ringAppear + 0.58 * veilFade})`
    ctx.fillRect(0, 0, width, height)

    const ringAlpha = ringAppear * (1 - veilFade)
    if (ringAlpha > 0.01) {
      const r = minSpan * 0.19
      if (glowSprites) {
        ctx.globalAlpha = 0.34 * ringAlpha
        ctx.drawImage(glowSprites.starlight, cx - r * 1.6, cy - r * 1.6, r * 3.2, r * 3.2)
      }

      ctx.strokeStyle = TEMPERATURE_CSS.starlight
      ctx.lineWidth = 1.4
      ctx.globalAlpha = 0.55 * ringAlpha
      ctx.beginPath()
      ctx.ellipse(cx, cy, r, r * 0.88, 0, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = TEMPERATURE_CSS.warm
      ctx.lineWidth = 0.9
      ctx.globalAlpha = 0.36 * ringAlpha
      ctx.beginPath()
      ctx.ellipse(cx, cy, r * 0.78, r * 0.68, 0, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.globalAlpha = 1
    return
  }

  // 1. Progressive dark veil over Gateway typography (never an abrupt black cut)
  const initialDim = smoothstep(0.05, 1.45, elapsed) * 0.62
  const finalTransitionVeil = smoothstep(2.45, 3.12, elapsed) * 0.38
  ctx.fillStyle = `rgba(5, 7, 13, ${clamp(initialDim + finalTransitionVeil, 0, 1)})`
  ctx.fillRect(0, 0, width, height)

  // 2. Portal aperture geometry: ignites -> opens -> expands past viewport
  const igniteEase = easeOutCubic(smoothstep(0, 0.72, elapsed))
  const formEase = easeOutCubic(smoothstep(0.65, 1.85, elapsed))
  const expandEase = easeInCubic(smoothstep(1.85, 2.95, elapsed))

  const baseRadius = minSpan * (0.04 + igniteEase * 0.08 + formEase * 0.14)
  const apertureRadius = baseRadius + expandEase * maxSpan * 0.78
  const portalVisibility =
    smoothstep(0.04, 0.28, elapsed) * (1 - smoothstep(2.68, 3.12, elapsed))

  if (portalVisibility > 0.01) {
    // Deep cosmic passage core inside the threshold
    const apertureGrad = ctx.createRadialGradient(
      cx,
      cy,
      apertureRadius * 0.08,
      cx,
      cy,
      apertureRadius * 1.15,
    )
    apertureGrad.addColorStop(0, `rgba(198, 216, 255, ${0.18 * portalVisibility})`)
    apertureGrad.addColorStop(0.45, `rgba(16, 26, 52, ${0.42 * portalVisibility})`)
    apertureGrad.addColorStop(0.82, `rgba(7, 11, 22, ${0.28 * portalVisibility})`)
    apertureGrad.addColorStop(1, 'rgba(5, 7, 13, 0)')
    ctx.fillStyle = apertureGrad
    ctx.beginPath()
    ctx.arc(cx, cy, apertureRadius * 1.15, 0, Math.PI * 2)
    ctx.fill()

    // Central ignition glow
    if (glowSprites) {
      const coreGlowR = apertureRadius * (0.95 - formEase * 0.25)
      ctx.globalAlpha = (0.48 - formEase * 0.14) * portalVisibility
      ctx.drawImage(
        glowSprites.ivory,
        cx - coreGlowR,
        cy - coreGlowR,
        coreGlowR * 2,
        coreGlowR * 2,
      )
    }

    // Layered dimensional elliptical rings
    const tilt = 0.86 + expandEase * 0.14
    const ringRotation = elapsed * 0.32
    const counterRotation = -elapsed * 0.44

    // Outer ethereal starlight halo ring
    ctx.strokeStyle = TEMPERATURE_CSS.cool
    ctx.lineWidth = 1.2 + expandEase * 1.2
    ctx.globalAlpha = 0.28 * formEase * portalVisibility
    ctx.beginPath()
    ctx.ellipse(
      cx,
      cy,
      apertureRadius * 1.06,
      apertureRadius * 1.06 * tilt,
      ringRotation * 0.35,
      0,
      Math.PI * 2,
    )
    ctx.stroke()

    // Primary luminous passage rim
    ctx.strokeStyle = TEMPERATURE_CSS.starlight
    ctx.lineWidth = 1.6 + expandEase * 1.4
    ctx.globalAlpha = (0.35 + formEase * 0.45) * portalVisibility
    ctx.beginPath()
    ctx.ellipse(
      cx,
      cy,
      apertureRadius,
      apertureRadius * tilt,
      ringRotation * 0.2,
      0,
      Math.PI * 2,
    )
    ctx.stroke()

    // Segmented rotating orbital arcs for celestial astrolabe depth
    ctx.strokeStyle = TEMPERATURE_CSS.warm
    ctx.lineWidth = 1.15
    ctx.globalAlpha = 0.46 * formEase * portalVisibility
    for (let arcIdx = 0; arcIdx < 3; arcIdx++) {
      const startA = counterRotation + arcIdx * ((Math.PI * 2) / 3)
      ctx.beginPath()
      ctx.ellipse(
        cx,
        cy,
        apertureRadius * 0.84,
        apertureRadius * 0.84 * tilt,
        0.18,
        startA,
        startA + 0.95,
      )
      ctx.stroke()
    }

    // Inner deep horizon ring
    ctx.strokeStyle = TEMPERATURE_CSS.ivory
    ctx.lineWidth = 0.9
    ctx.globalAlpha = 0.38 * formEase * portalVisibility
    ctx.beginPath()
    ctx.ellipse(
      cx,
      cy,
      apertureRadius * 0.64,
      apertureRadius * 0.64 * tilt,
      ringRotation,
      0,
      Math.PI * 2,
    )
    ctx.stroke()
  }

  // 3. Swirling & traversing portal particles
  const particleFade =
    smoothstep(0.08, 0.45, elapsed) * (1 - smoothstep(2.72, 3.14, elapsed))
  const warpFactor = smoothstep(1.85, 2.95, elapsed)

  if (particleFade > 0.01) {
    for (const p of state.particles) {
      const rPx = p.normRadius * minSpan * (1 + expandEase * 1.4)
      const px = cx + Math.cos(p.angle) * rPx
      const py = cy + Math.sin(p.angle) * rPx * (0.86 + warpFactor * 0.14)

      if (px < -40 || px > width + 40 || py < -40 || py > height + 40) {
        continue
      }

      const alpha = clamp(p.baseAlpha * particleFade, 0, 1)
      const color = TEMPERATURE_CSS[p.temperature]

      // Tapered radial traversal streak during Phase D expansion
      if (warpFactor > 0.05) {
        const streakLen = (10 + p.depth * 32) * warpFactor
        const dx = px - cx
        const dy = py - cy
        const dist = Math.hypot(dx, dy) || 1
        const nx = dx / dist
        const ny = dy / dist
        ctx.strokeStyle = color
        ctx.lineCap = 'round'
        ctx.lineWidth = p.radius * 0.78
        ctx.globalAlpha = alpha * 0.46
        ctx.beginPath()
        ctx.moveTo(px - nx * streakLen, py - ny * streakLen)
        ctx.lineTo(px, py)
        ctx.stroke()
      }

      if (glowSprites && p.depth > 0.6) {
        const haloR = p.radius * 3.2
        ctx.globalAlpha = alpha * 0.35
        ctx.drawImage(
          glowSprites[p.temperature],
          px - haloR,
          py - haloR,
          haloR * 2,
          haloR * 2,
        )
      }

      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(px, py, p.radius * (1 + warpFactor * 0.35), 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Final settle into calm midnight sky so Page 2 enters seamlessly
  const settleOverlay = smoothstep(2.85, 3.15, elapsed)
  if (settleOverlay > 0.01) {
    ctx.globalAlpha = settleOverlay
    ctx.fillStyle = '#05070d'
    ctx.fillRect(0, 0, width, height)
  }

  ctx.globalAlpha = 1
}
