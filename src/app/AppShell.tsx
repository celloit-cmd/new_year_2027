import type { ReactNode } from 'react'
import { STAGE_METADATA, type ExperienceStage } from './experienceState.ts'
import './AppShell.css'

export interface AppShellProps {
  readonly stage: ExperienceStage
  readonly prefersReducedMotion: boolean
  readonly children?: ReactNode
}

/**
 * Minimal semantic application shell for the New Year 2027 experience.
 * Stage-specific scenes and transitions are deferred to later milestones.
 */
export function AppShell({ stage, prefersReducedMotion, children }: AppShellProps) {
  const stageMeta = STAGE_METADATA[stage]

  return (
    <div
      className="app-shell"
      data-stage={stage}
      data-reduced-motion={prefersReducedMotion ? 'reduce' : 'no-preference'}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <main id="main-content" className="app-main" tabIndex={-1}>
        <div className="container">
          {children ?? (
            <section className="app-foundation-placeholder prose-measure" aria-labelledby="stage-heading">
              <p className="app-foundation-eyebrow">New Year 2027</p>
              <h1 id="stage-heading" className="app-foundation-title">
                {stageMeta.label}
              </h1>
              <p className="app-foundation-note">
                Application foundation initialized. Scene implementation begins in Milestone 2.
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
