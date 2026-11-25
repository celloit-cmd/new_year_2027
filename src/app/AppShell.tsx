import type { ReactNode } from 'react'
import type {
  NormalizedOrigin,
  StarfieldSequencePhase,
} from '../components/Starfield/burstEngine.ts'
import { Starfield } from '../components/Starfield/Starfield.tsx'
import { STAGE_METADATA, type ExperienceStage } from './experienceState.ts'
import './AppShell.css'

export interface AppShellBurstConfig {
  readonly phase: StarfieldSequencePhase
  readonly origin: NormalizedOrigin | null
  readonly onBurstComplete: () => void
  readonly onSuspenseComplete: () => void
  readonly onRevealComplete: () => void
}

export interface AppShellProps {
  readonly stage: ExperienceStage
  readonly prefersReducedMotion: boolean
  readonly starfieldBurst?: AppShellBurstConfig
  readonly children?: ReactNode
}

/**
 * Semantic application shell separating the persistent celestial background
 * layer from foreground stage UI.
 */
export function AppShell({
  stage,
  prefersReducedMotion,
  starfieldBurst,
  children,
}: AppShellProps) {
  const stageMeta = STAGE_METADATA[stage]
  const starDensityScale = stage === 'gateway' ? 1 : 0.52
  const shootingStarsActive = stage === 'through_my_eyes'

  const fallbackContent = (
    <section className="app-foundation-placeholder prose-measure" aria-labelledby="stage-heading">
      <p className="app-foundation-eyebrow">New Year 2027</p>
      <h1 id="stage-heading" className="app-foundation-title">
        {stageMeta.label}
      </h1>
      <p className="app-foundation-note">
        Stage content is scheduled for a later milestone.
      </p>
    </section>
  )

  return (
    <div
      className="app-shell"
      data-stage={stage}
      data-reduced-motion={prefersReducedMotion ? 'reduce' : 'no-preference'}
    >
      <Starfield
        prefersReducedMotion={prefersReducedMotion}
        densityScale={starDensityScale}
        shootingStars={shootingStarsActive}
        burstPhase={starfieldBurst?.phase ?? 'idle'}
        burstOrigin={starfieldBurst?.origin ?? null}
        onBurstComplete={starfieldBurst?.onBurstComplete}
        onSuspenseComplete={starfieldBurst?.onSuspenseComplete}
        onRevealComplete={starfieldBurst?.onRevealComplete}
      />

      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <main id="main-content" className="app-main" tabIndex={-1}>
        <div className="container">{children ?? fallbackContent}</div>
      </main>
    </div>
  )
}
