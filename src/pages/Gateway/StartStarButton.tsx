import { useEffect, useRef } from 'react'
import type { NormalizedOrigin } from '../../components/Starfield/burstEngine.ts'
import type { GatewayPhase } from './gatewayState.ts'
import './StartStarButton.css'

export interface StartStarButtonProps {
  readonly phase: GatewayPhase
  readonly onActivate: (origin: NormalizedOrigin) => void
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * Celestial star-shaped trigger that launches the Gateway explosion
 * from the visual center of its star emblem.
 */
export function StartStarButton({ phase, onActivate }: StartStarButtonProps) {
  const starCoreRef = useRef<HTMLSpanElement | null>(null)
  const activatedRef = useRef<boolean>(false)
  const isDisabled = phase !== 'idle'

  useEffect(() => {
    if (phase === 'idle') {
      activatedRef.current = false
    }
  }, [phase])

  const handleClick = () => {
    if (isDisabled || activatedRef.current) return
    activatedRef.current = true

    const viewportW = window.innerWidth || 1
    const viewportH = window.innerHeight || 1
    const rect = starCoreRef.current?.getBoundingClientRect()

    const origin: NormalizedOrigin = rect
      ? {
          nx: clampUnit((rect.left + rect.width / 2) / viewportW),
          ny: clampUnit((rect.top + rect.height / 2) / viewportH),
        }
      : { nx: 0.5, ny: 0.5 }

    onActivate(origin)
  }

  return (
    <button
      type="button"
      className="start-star-button"
      data-phase={phase}
      disabled={isDisabled}
      aria-label="Start the New Year 2027 experience"
      onClick={handleClick}
    >
      <span ref={starCoreRef} className="start-star-emblem" aria-hidden="true">
        <span className="start-star-aura" />
        <svg
          className="start-star-svg"
          viewBox="0 0 96 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="gateway-star-fill" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff9ee" />
              <stop offset="48%" stopColor="#e8f0ff" />
              <stop offset="100%" stopColor="#b8cbff" stopOpacity="0.88" />
            </radialGradient>
          </defs>

          <g className="start-star-orbit" opacity="0.65">
            <circle
              cx="48"
              cy="48"
              r="34"
              stroke="rgba(220, 230, 255, 0.22)"
              strokeWidth="0.9"
              strokeDasharray="2 5"
            />
            <line
              x1="28"
              y1="28"
              x2="68"
              y2="68"
              stroke="rgba(220, 230, 255, 0.22)"
              strokeWidth="0.7"
            />
            <line
              x1="68"
              y1="28"
              x2="28"
              y2="68"
              stroke="rgba(220, 230, 255, 0.22)"
              strokeWidth="0.7"
            />
          </g>

          <path
            d="M48 8 C49.4 35.5 60.5 46.6 88 48 C60.5 49.4 49.4 60.5 48 88 C46.6 60.5 35.5 49.4 8 48 C35.5 46.6 46.6 35.5 48 8 Z"
            fill="url(#gateway-star-fill)"
          />
          <circle cx="48" cy="48" r="2.6" fill="#ffffff" />
        </svg>
      </span>
      <span className="start-star-label">Start</span>
    </button>
  )
}
