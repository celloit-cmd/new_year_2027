import type { RecipientId } from '../../app/experienceState.ts'
import type { NormalizedOrigin } from '../../components/Starfield/burstEngine.ts'
import type { GatewayPhase } from './gatewayState.ts'
import { InvitationPanel } from './InvitationPanel.tsx'
import { StartStarButton } from './StartStarButton.tsx'
import './GatewayPage.css'

export interface GatewayPageProps {
  readonly phase: GatewayPhase
  readonly prefersReducedMotion: boolean
  readonly selectedRecipientId: RecipientId | null
  readonly portalActive: boolean
  readonly onTriggerExplosion: (origin: NormalizedOrigin) => void
  readonly onRecipientAccepted: (recipientId: RecipientId) => void
}

function getAnnouncement(phase: GatewayPhase): string {
  switch (phase) {
    case 'idle':
      return ''
    case 'exploding':
      return 'Star explosion underway.'
    case 'settled':
      return 'The sky is filled with starlight.'
    case 'whirlpool':
      return 'The stars are gathering.'
    case 'revealed':
      return 'Happy New Year 2027.'
  }
}

/**
 * Foreground UI layer for the shared Gateway stage.
 * Separated from the Canvas 2D starfield, burst, and particle-typography simulation.
 */
export function GatewayPage({
  phase,
  prefersReducedMotion,
  selectedRecipientId,
  portalActive,
  onTriggerExplosion,
  onRecipientAccepted,
}: GatewayPageProps) {
  const showStartButton = phase === 'idle' || phase === 'exploding'
  const showInvitation = phase === 'revealed'
  const headingText =
    phase === 'whirlpool' || phase === 'revealed'
      ? 'Happy New Year 2027'
      : 'New Year 2027 — Gateway'

  return (
    <section
      className="gateway-stage"
      data-phase={phase}
      data-portal-ready={selectedRecipientId !== null ? 'true' : 'false'}
      data-portal-active={portalActive ? 'true' : 'false'}
      aria-hidden={portalActive || undefined}
      aria-labelledby="gateway-heading"
    >
      <h1 id="gateway-heading" className="visually-hidden">
        {headingText}
      </h1>

      {showStartButton && (
        <StartStarButton phase={phase} onActivate={onTriggerExplosion} />
      )}

      {showInvitation && (
        <div className="gateway-invitation-slot">
          <InvitationPanel
            prefersReducedMotion={prefersReducedMotion}
            onRecipientAccepted={onRecipientAccepted}
          />
        </div>
      )}

      <p className="visually-hidden" aria-live="polite">
        {getAnnouncement(phase)}
      </p>
    </section>
  )
}
