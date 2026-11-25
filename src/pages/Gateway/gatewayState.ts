import type {
  NormalizedOrigin,
  StarfieldSequencePhase,
} from '../../components/Starfield/burstEngine.ts'

export type GatewayPhase = StarfieldSequencePhase

export interface GatewayState {
  readonly phase: GatewayPhase
  readonly burstOrigin: NormalizedOrigin | null
}

export const INITIAL_GATEWAY_STATE: GatewayState = {
  phase: 'idle',
  burstOrigin: null,
}

export type GatewayAction =
  | { type: 'TRIGGER_EXPLOSION'; origin: NormalizedOrigin }
  | { type: 'COMPLETE_EXPLOSION' }
  | { type: 'START_WHIRLPOOL' }
  | { type: 'COMPLETE_REVEAL' }
  | { type: 'RESET_GATEWAY' }

/**
 * Pure state machine for the shared Gateway sequence:
 * idle -> exploding -> settled (suspense) -> whirlpool -> revealed.
 */
export function gatewayReducer(
  state: GatewayState,
  action: GatewayAction,
): GatewayState {
  switch (action.type) {
    case 'TRIGGER_EXPLOSION': {
      if (state.phase !== 'idle') {
        return state
      }
      return {
        phase: 'exploding',
        burstOrigin: action.origin,
      }
    }
    case 'COMPLETE_EXPLOSION': {
      if (state.phase !== 'exploding') {
        return state
      }
      return {
        ...state,
        phase: 'settled',
      }
    }
    case 'START_WHIRLPOOL': {
      if (state.phase !== 'settled') {
        return state
      }
      return {
        ...state,
        phase: 'whirlpool',
      }
    }
    case 'COMPLETE_REVEAL': {
      if (state.phase !== 'whirlpool') {
        return state
      }
      return {
        ...state,
        phase: 'revealed',
      }
    }
    case 'RESET_GATEWAY': {
      return INITIAL_GATEWAY_STATE
    }
  }
}
