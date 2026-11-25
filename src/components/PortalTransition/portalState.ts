import type { RecipientId } from '../../app/experienceState.ts'

export type PortalPhase =
  | 'idle'
  | 'igniting'
  | 'forming'
  | 'expanding'
  | 'traversing'
  | 'completed'

export type ActivePortalPhase = Exclude<PortalPhase, 'idle' | 'completed'>

export interface PortalState {
  readonly phase: PortalPhase
  readonly recipientId: RecipientId | null
}

export const INITIAL_PORTAL_STATE: PortalState = {
  phase: 'idle',
  recipientId: null,
}

export type PortalAction =
  | { type: 'START_PORTAL'; recipientId: RecipientId }
  | { type: 'SET_PHASE'; phase: ActivePortalPhase }
  | { type: 'COMPLETE_PORTAL' }
  | { type: 'RESET_PORTAL' }

const PHASE_ORDER: Record<PortalPhase, number> = {
  idle: 0,
  igniting: 1,
  forming: 2,
  expanding: 3,
  traversing: 4,
  completed: 5,
}

/**
 * Isolated state machine governing the Gateway portal transition lifecycle.
 * Prevents duplicate starts and enforces monotonic forward progression.
 */
export function portalReducer(
  state: PortalState,
  action: PortalAction,
): PortalState {
  switch (action.type) {
    case 'START_PORTAL': {
      if (state.phase !== 'idle') {
        return state
      }
      return {
        phase: 'igniting',
        recipientId: action.recipientId,
      }
    }
    case 'SET_PHASE': {
      if (
        state.phase === 'idle' ||
        state.phase === 'completed' ||
        PHASE_ORDER[action.phase] <= PHASE_ORDER[state.phase]
      ) {
        return state
      }
      return {
        ...state,
        phase: action.phase,
      }
    }
    case 'COMPLETE_PORTAL': {
      if (state.phase === 'idle' || state.phase === 'completed') {
        return state
      }
      return {
        ...state,
        phase: 'completed',
      }
    }
    case 'RESET_PORTAL': {
      return INITIAL_PORTAL_STATE
    }
  }
}
