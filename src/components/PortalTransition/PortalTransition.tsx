import { useEffect, useRef } from 'react'
import {
  createPortalRenderState,
  drawPortal,
  resizePortalRenderState,
  stepPortal,
  type PortalRenderState,
} from './portalEngine.ts'
import type { ActivePortalPhase, PortalPhase } from './portalState.ts'
import './PortalTransition.css'

export interface PortalTransitionProps {
  readonly phase: PortalPhase
  readonly prefersReducedMotion: boolean
  readonly onPhaseChange: (phase: ActivePortalPhase) => void
  readonly onComplete: () => void
}

const MAX_DPR = 2

function getPortalAnnouncement(phase: PortalPhase): string {
  switch (phase) {
    case 'igniting':
      return 'Opening your passage.'
    case 'forming':
      return 'The portal is forming.'
    case 'expanding':
    case 'traversing':
      return 'Stepping through to your journey.'
    default:
      return ''
  }
}

/**
 * Full-viewport Canvas 2D celestial portal overlay bridging the shared
 * Gateway reveal and the selected personal destination.
 */
export function PortalTransition({
  phase,
  prefersReducedMotion,
  onPhaseChange,
  onComplete,
}: PortalTransitionProps) {
  const active = phase !== 'idle' && phase !== 'completed'

  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const renderStateRef = useRef<PortalRenderState | null>(null)
  const lastReportedPhaseRef = useRef<ActivePortalPhase>('igniting')
  const completedFiredRef = useRef<boolean>(false)
  const onPhaseChangeRef = useRef(onPhaseChange)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onPhaseChangeRef.current = onPhaseChange
  }, [onPhaseChange])

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (!active) {
      renderStateRef.current = null
      completedFiredRef.current = false
      lastReportedPhaseRef.current = 'igniting'
      return
    }

    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      if (!completedFiredRef.current) {
        completedFiredRef.current = true
        onCompleteRef.current()
      }
      return
    }

    const syncMetrics = () => {
      const rect = container.getBoundingClientRect()
      const width = Math.max(1, Math.round(rect.width || window.innerWidth))
      const height = Math.max(1, Math.round(rect.height || window.innerHeight))
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)

      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (!renderStateRef.current) {
        renderStateRef.current = createPortalRenderState(
          width,
          height,
          prefersReducedMotion,
        )
      } else {
        resizePortalRenderState(renderStateRef.current, width, height)
      }
    }

    completedFiredRef.current = false
    lastReportedPhaseRef.current = 'igniting'
    renderStateRef.current = null
    syncMetrics()

    const renderCurrentFrame = () => {
      if (!renderStateRef.current) return
      drawPortal(ctx, renderStateRef.current)
    }
    renderCurrentFrame()

    let rafId = 0
    let lastTime = 0

    const stopLoop = () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId)
        rafId = 0
      }
    }

    const startLoop = () => {
      if (document.hidden || rafId !== 0 || completedFiredRef.current) return
      lastTime = performance.now()

      const tick = (now: number) => {
        if (document.hidden || completedFiredRef.current) {
          rafId = 0
          return
        }

        const dt = (now - lastTime) / 1000
        lastTime = now

        if (renderStateRef.current) {
          const { nextPhase, completedNow } = stepPortal(renderStateRef.current, dt)
          if (nextPhase !== lastReportedPhaseRef.current) {
            lastReportedPhaseRef.current = nextPhase
            onPhaseChangeRef.current(nextPhase)
          }

          renderCurrentFrame()

          if (completedNow && !completedFiredRef.current) {
            completedFiredRef.current = true
            rafId = 0
            onCompleteRef.current()
            return
          }
        }

        rafId = window.requestAnimationFrame(tick)
      }

      rafId = window.requestAnimationFrame(tick)
    }

    const handleResize = () => {
      syncMetrics()
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
      resizeObserver?.disconnect()
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [active, prefersReducedMotion])

  if (!active) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="portal-transition-layer"
      data-portal-phase={phase}
      role="region"
      aria-label="Portal transition"
    >
      <canvas
        ref={canvasRef}
        className="portal-transition-canvas"
        aria-hidden="true"
      />
      <p className="visually-hidden" aria-live="polite">
        {getPortalAnnouncement(phase)}
      </p>
    </div>
  )
}
