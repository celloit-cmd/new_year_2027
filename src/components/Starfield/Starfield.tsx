import { useEffect, useRef } from 'react'
import {
  createBurstState,
  drawBurst,
  resizeBurstState,
  stepBurst,
  type BurstState,
  type NormalizedOrigin,
  type StarfieldSequencePhase,
} from './burstEngine.ts'
import {
  createShootingStarState,
  drawShootingStars,
  resizeShootingStarState,
  stepShootingStars,
  type ShootingStarState,
} from './shootingStarEngine.ts'
import {
  createStarfieldState,
  drawStarfield,
  resizeStarfieldState,
  stepStarfield,
  type StarfieldState,
} from './starfieldEngine.ts'
import {
  createTypographyState,
  drawTypography,
  resizeTypographyState,
  stepTypography,
  type TypographyState,
} from './typographyEngine.ts'
import './Starfield.css'

export interface StarfieldProps {
  /** Honors `prefers-reduced-motion` by avoiding continuous or high-velocity motion. */
  readonly prefersReducedMotion?: boolean
  /** Multiplier for ambient star count so downstream stages can render a sparser sky. */
  readonly densityScale?: number
  /** Deterministic seed for reproducible ambient star placement. */
  readonly seed?: number
  /** Enables restrained continuous shooting stars over the ambient sky. */
  readonly shootingStars?: boolean
  /** Current gateway visual sequence phase. */
  readonly burstPhase?: StarfieldSequencePhase
  /** Normalized [0..1] viewport origin for the star explosion. */
  readonly burstOrigin?: NormalizedOrigin | null
  /** Fired once when the active burst finishes settling into Suspense. */
  readonly onBurstComplete?: () => void
  /** Fired once when the Suspense hold finishes and the whirlpool begins. */
  readonly onSuspenseComplete?: () => void
  /** Fired once when the particle typography finishes forming. */
  readonly onRevealComplete?: () => void
  readonly className?: string
}

const MAX_DPR = 2

/**
 * Reusable deep-space Canvas 2D starfield, shooting-star, burst, and particle-typography
 * layer isolated from React UI and page-level experience state.
 */
export function Starfield({
  prefersReducedMotion = false,
  densityScale = 1,
  seed = 2027,
  shootingStars = false,
  burstPhase = 'idle',
  burstOrigin = null,
  onBurstComplete,
  onSuspenseComplete,
  onRevealComplete,
  className,
}: StarfieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ambientStateRef = useRef<StarfieldState | null>(null)
  const shootingStarsStateRef = useRef<ShootingStarState | null>(null)
  const burstStateRef = useRef<BurstState | null>(null)
  const typographyStateRef = useRef<TypographyState | null>(null)

  const burstPhaseRef = useRef<StarfieldSequencePhase>(burstPhase)
  const burstOriginRef = useRef<NormalizedOrigin | null>(burstOrigin)
  const onBurstCompleteRef = useRef(onBurstComplete)
  const onSuspenseCompleteRef = useRef(onSuspenseComplete)
  const onRevealCompleteRef = useRef(onRevealComplete)
  const renderFrameRef = useRef<(() => void) | null>(null)
  const startLoopRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    onBurstCompleteRef.current = onBurstComplete
  }, [onBurstComplete])

  useEffect(() => {
    onSuspenseCompleteRef.current = onSuspenseComplete
  }, [onSuspenseComplete])

  useEffect(() => {
    onRevealCompleteRef.current = onRevealComplete
  }, [onRevealComplete])

  useEffect(() => {
    const ambient = ambientStateRef.current
    if (!ambient) return

    if (shootingStars) {
      if (
        !shootingStarsStateRef.current ||
        shootingStarsStateRef.current.reducedMotion !== prefersReducedMotion
      ) {
        shootingStarsStateRef.current = createShootingStarState(
          ambient.width,
          ambient.height,
          prefersReducedMotion,
        )
      }
      renderFrameRef.current?.()
      startLoopRef.current?.()
    } else if (shootingStarsStateRef.current) {
      shootingStarsStateRef.current = null
      renderFrameRef.current?.()
    }
  }, [shootingStars, prefersReducedMotion])

  useEffect(() => {
    const prevPhase = burstPhaseRef.current
    burstPhaseRef.current = burstPhase
    burstOriginRef.current = burstOrigin

    const ambient = ambientStateRef.current
    if (!ambient) return

    if (burstPhase === 'idle') {
      burstStateRef.current = null
      typographyStateRef.current = null
      renderFrameRef.current?.()
      return
    }

    if (burstPhase === 'exploding' && prevPhase !== 'exploding') {
      typographyStateRef.current = null
      burstStateRef.current = createBurstState({
        width: ambient.width,
        height: ambient.height,
        origin: burstOrigin,
        reducedMotion: prefersReducedMotion,
      })
      renderFrameRef.current?.()
      startLoopRef.current?.()
      return
    }

    if (burstPhase === 'settled') {
      if (!burstStateRef.current) {
        burstStateRef.current = createBurstState({
          width: ambient.width,
          height: ambient.height,
          origin: burstOrigin,
          reducedMotion: prefersReducedMotion,
        })
        burstStateRef.current.elapsed = burstStateRef.current.durationSeconds
        burstStateRef.current.completed = true
      }
      renderFrameRef.current?.()
      startLoopRef.current?.()
      return
    }

    if (
      (burstPhase === 'whirlpool' && prevPhase !== 'whirlpool') ||
      (burstPhase === 'revealed' && !typographyStateRef.current)
    ) {
      const settledParticles = burstStateRef.current?.particles ?? []
      typographyStateRef.current = createTypographyState(
        ambient.width,
        ambient.height,
        settledParticles,
        prefersReducedMotion,
      )
      burstStateRef.current = null

      if (burstPhase === 'revealed') {
        typographyStateRef.current.elapsed = typographyStateRef.current.durationSeconds
        typographyStateRef.current.completed = true
      }

      renderFrameRef.current?.()
      startLoopRef.current?.()
    }
  }, [burstPhase, burstOrigin, prefersReducedMotion])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const syncCanvasMetrics = () => {
      const rect = container.getBoundingClientRect()
      const width = Math.max(1, Math.round(rect.width || window.innerWidth))
      const height = Math.max(1, Math.round(rect.height || window.innerHeight))
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)

      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (
        !ambientStateRef.current ||
        ambientStateRef.current.densityScale !== densityScale ||
        ambientStateRef.current.seed !== seed
      ) {
        ambientStateRef.current = createStarfieldState({
          width,
          height,
          densityScale,
          seed,
        })
      } else {
        resizeStarfieldState(ambientStateRef.current, width, height)
      }

      if (shootingStars) {
        if (
          !shootingStarsStateRef.current ||
          shootingStarsStateRef.current.reducedMotion !== prefersReducedMotion
        ) {
          shootingStarsStateRef.current = createShootingStarState(
            width,
            height,
            prefersReducedMotion,
          )
        } else {
          resizeShootingStarState(shootingStarsStateRef.current, width, height)
        }
      } else {
        shootingStarsStateRef.current = null
      }

      if (burstStateRef.current) {
        resizeBurstState(burstStateRef.current, width, height)
      }

      if (typographyStateRef.current) {
        resizeTypographyState(typographyStateRef.current, width, height)
      }
    }

    syncCanvasMetrics()

    const renderCurrentFrame = () => {
      const ambient = ambientStateRef.current
      if (!ambient) return
      drawStarfield(ctx, ambient)
      if (shootingStarsStateRef.current) {
        drawShootingStars(ctx, shootingStarsStateRef.current, ambient.glowSprites)
      }
      if (typographyStateRef.current) {
        drawTypography(ctx, typographyStateRef.current, ambient.glowSprites)
      } else if (burstStateRef.current) {
        drawBurst(ctx, burstStateRef.current, ambient.glowSprites)
      }
    }
    renderFrameRef.current = renderCurrentFrame

    renderCurrentFrame()

    let rafId = 0
    let lastTime = 0

    const stopLoop = () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId)
        rafId = 0
      }
    }

    const shouldRunLoop = () => {
      if (document.hidden) return false
      if (!prefersReducedMotion) return true
      const phase = burstPhaseRef.current
      if (phase === 'exploding') {
        return !(burstStateRef.current?.completed ?? true)
      }
      if (phase === 'settled') {
        return !(burstStateRef.current?.suspenseCompleted ?? true)
      }
      if (phase === 'whirlpool') {
        return !(typographyStateRef.current?.completed ?? true)
      }
      return false
    }

    const startLoop = () => {
      if (!shouldRunLoop() || rafId !== 0) return
      lastTime = performance.now()

      const tick = (now: number) => {
        if (!shouldRunLoop()) {
          rafId = 0
          return
        }

        const dt = (now - lastTime) / 1000
        lastTime = now

        if (ambientStateRef.current && !prefersReducedMotion) {
          stepStarfield(ambientStateRef.current, dt)
        }

        if (shootingStarsStateRef.current && !prefersReducedMotion) {
          stepShootingStars(shootingStarsStateRef.current, dt)
        }

        if (typographyStateRef.current) {
          const revealDone = stepTypography(typographyStateRef.current, dt)
          if (revealDone) {
            onRevealCompleteRef.current?.()
          }
        } else if (burstStateRef.current) {
          const { burstJustCompleted, suspenseJustCompleted } = stepBurst(
            burstStateRef.current,
            dt,
          )
          if (burstJustCompleted) {
            onBurstCompleteRef.current?.()
          }
          if (suspenseJustCompleted) {
            onSuspenseCompleteRef.current?.()
          }
        }

        renderCurrentFrame()

        if (shouldRunLoop()) {
          rafId = window.requestAnimationFrame(tick)
        } else {
          rafId = 0
        }
      }

      rafId = window.requestAnimationFrame(tick)
    }
    startLoopRef.current = startLoop

    const handleResize = () => {
      syncCanvasMetrics()
      renderCurrentFrame()
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopLoop()
      } else {
        renderCurrentFrame()
        startLoop()
      }
    }

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(container)
    } else {
      window.addEventListener('resize', handleResize)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    startLoop()

    return () => {
      stopLoop()
      renderFrameRef.current = null
      startLoopRef.current = null
      resizeObserver?.disconnect()
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [prefersReducedMotion, densityScale, seed, shootingStars])

  const rootClassName = className ? `starfield-layer ${className}` : 'starfield-layer'

  return (
    <div ref={containerRef} className={rootClassName} aria-hidden="true">
      <canvas ref={canvasRef} className="starfield-canvas" />
    </div>
  )
}
