import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { AppShell } from './app/AppShell.tsx'
import {
  experienceReducer,
  INITIAL_EXPERIENCE_STATE,
  type RecipientId,
} from './app/experienceState.ts'
import { useReducedMotion } from './app/useReducedMotion.ts'
import { PortalTransition } from './components/PortalTransition/PortalTransition.tsx'
import {
  INITIAL_PORTAL_STATE,
  portalReducer,
  type ActivePortalPhase,
} from './components/PortalTransition/portalState.ts'
import type { NormalizedOrigin } from './components/Starfield/burstEngine.ts'
import { GatewayPage } from './pages/Gateway/GatewayPage.tsx'
import { gatewayReducer, INITIAL_GATEWAY_STATE } from './pages/Gateway/gatewayState.ts'
import { ThroughMyEyesPage } from './pages/ThroughMyEyes/ThroughMyEyesPage.tsx'

export function App() {
  const [experienceState, dispatchExperience] = useReducer(
    experienceReducer,
    INITIAL_EXPERIENCE_STATE,
  )
  const [gatewayState, dispatchGateway] = useReducer(
    gatewayReducer,
    INITIAL_GATEWAY_STATE,
  )
  const [portalState, dispatchPortal] = useReducer(
    portalReducer,
    INITIAL_PORTAL_STATE,
  )
  const prefersReducedMotion = useReducedMotion()
  const portalRecipientRef = useRef<RecipientId | null>(null)

  const handleTriggerExplosion = useCallback((origin: NormalizedOrigin) => {
    dispatchGateway({ type: 'TRIGGER_EXPLOSION', origin })
  }, [])

  const handleBurstComplete = useCallback(() => {
    dispatchGateway({ type: 'COMPLETE_EXPLOSION' })
  }, [])

  const handleSuspenseComplete = useCallback(() => {
    dispatchGateway({ type: 'START_WHIRLPOOL' })
  }, [])

  const handleRevealComplete = useCallback(() => {
    dispatchGateway({ type: 'COMPLETE_REVEAL' })
  }, [])

  const handleRecipientAccepted = useCallback((recipientId: RecipientId) => {
    portalRecipientRef.current = recipientId
    dispatchExperience({ type: 'SELECT_RECIPIENT', recipientId })
  }, [])

  useEffect(() => {
    if (
      experienceState.stage !== 'gateway' ||
      experienceState.recipientId === null ||
      portalState.phase !== 'idle'
    ) {
      return
    }

    const recipientId = experienceState.recipientId
    const acknowledgementMs = prefersReducedMotion ? 220 : 440
    const timerId = window.setTimeout(() => {
      dispatchPortal({ type: 'START_PORTAL', recipientId })
    }, acknowledgementMs)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [
    experienceState.stage,
    experienceState.recipientId,
    portalState.phase,
    prefersReducedMotion,
  ])

  const handlePortalPhaseChange = useCallback((phase: ActivePortalPhase) => {
    dispatchPortal({ type: 'SET_PHASE', phase })
  }, [])

  const handlePortalComplete = useCallback(() => {
    const targetRecipient =
      portalState.recipientId ??
      portalRecipientRef.current ??
      experienceState.recipientId
    dispatchPortal({ type: 'COMPLETE_PORTAL' })
    if (targetRecipient) {
      dispatchExperience({ type: 'ENTER_JOURNEY', recipientId: targetRecipient })
    }
  }, [portalState.recipientId, experienceState.recipientId])

  const handleMessageNext = useCallback(() => {
    // Transition action will be wired in Milestone 3.2.
  }, [])

  const starfieldBurst = useMemo(
    () =>
      experienceState.stage === 'gateway'
        ? {
            phase: gatewayState.phase,
            origin: gatewayState.burstOrigin,
            onBurstComplete: handleBurstComplete,
            onSuspenseComplete: handleSuspenseComplete,
            onRevealComplete: handleRevealComplete,
          }
        : undefined,
    [
      experienceState.stage,
      gatewayState.phase,
      gatewayState.burstOrigin,
      handleBurstComplete,
      handleSuspenseComplete,
      handleRevealComplete,
    ],
  )

  const portalActive =
    experienceState.stage === 'gateway' &&
    portalState.phase !== 'idle' &&
    portalState.phase !== 'completed'

  return (
    <>
      <AppShell
        stage={experienceState.stage}
        prefersReducedMotion={prefersReducedMotion}
        starfieldBurst={starfieldBurst}
      >
        {experienceState.stage === 'gateway' ? (
          <GatewayPage
            phase={gatewayState.phase}
            prefersReducedMotion={prefersReducedMotion}
            selectedRecipientId={experienceState.recipientId}
            portalActive={portalActive}
            onTriggerExplosion={handleTriggerExplosion}
            onRecipientAccepted={handleRecipientAccepted}
          />
        ) : experienceState.stage === 'through_my_eyes' &&
          experienceState.recipientId !== null ? (
          <ThroughMyEyesPage
            recipientId={experienceState.recipientId}
            onNext={handleMessageNext}
          />
        ) : undefined}
      </AppShell>

      <PortalTransition
        phase={portalState.phase}
        prefersReducedMotion={prefersReducedMotion}
        onPhaseChange={handlePortalPhaseChange}
        onComplete={handlePortalComplete}
      />
    </>
  )
}

export default App
