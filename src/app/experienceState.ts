/** Top-level stages of the New Year 2027 experience. */
export type ExperienceStage = 'gateway' | 'through_my_eyes' | 'ending' | 'your_turn'

/** Neutral identifiers for the two separate recipient journeys. */
export type RecipientId = 'recipient-one' | 'recipient-two'

export interface StageMetadata {
  readonly id: ExperienceStage
  readonly label: string
  readonly optional: boolean
}

export const STAGE_METADATA: Record<ExperienceStage, StageMetadata> = {
  gateway: {
    id: 'gateway',
    label: 'Gateway',
    optional: false,
  },
  through_my_eyes: {
    id: 'through_my_eyes',
    label: 'Through My Eyes',
    optional: false,
  },
  ending: {
    id: 'ending',
    label: 'Ending',
    optional: false,
  },
  your_turn: {
    id: 'your_turn',
    label: 'Your Turn',
    optional: true,
  },
}

export interface ExperienceState {
  readonly stage: ExperienceStage
  readonly recipientId: RecipientId | null
  readonly yourTurnEnabled: boolean
}

export const INITIAL_EXPERIENCE_STATE: ExperienceState = {
  stage: 'gateway',
  recipientId: null,
  yourTurnEnabled: false,
}

export const ALLOWED_TRANSITIONS: Record<ExperienceStage, readonly ExperienceStage[]> = {
  gateway: ['through_my_eyes'],
  through_my_eyes: ['ending', 'gateway'],
  ending: ['your_turn', 'through_my_eyes', 'gateway'],
  your_turn: ['ending', 'gateway'],
}

export type ExperienceAction =
  | { type: 'SELECT_RECIPIENT'; recipientId: RecipientId }
  | { type: 'ENTER_JOURNEY'; recipientId: RecipientId }
  | { type: 'GO_TO_STAGE'; stage: ExperienceStage }
  | { type: 'SET_YOUR_TURN_ENABLED'; enabled: boolean }
  | { type: 'RESET_EXPERIENCE' }

/** Checks whether transitioning to `target` is valid from the current state. */
export function canTransition(state: ExperienceState, target: ExperienceStage): boolean {
  if (target === state.stage) {
    return false
  }
  if (target === 'your_turn' && !state.yourTurnEnabled) {
    return false
  }
  if (target !== 'gateway' && state.recipientId === null) {
    return false
  }
  return ALLOWED_TRANSITIONS[state.stage].includes(target)
}

/** Pure reducer governing explicit experience stage transitions. */
export function experienceReducer(
  state: ExperienceState,
  action: ExperienceAction,
): ExperienceState {
  switch (action.type) {
    case 'SELECT_RECIPIENT': {
      if (state.stage !== 'gateway') {
        return state
      }
      return {
        ...state,
        recipientId: action.recipientId,
      }
    }
    case 'ENTER_JOURNEY': {
      if (state.stage !== 'gateway') {
        return state
      }
      return {
        ...state,
        stage: 'through_my_eyes',
        recipientId: action.recipientId,
      }
    }
    case 'GO_TO_STAGE': {
      if (!canTransition(state, action.stage)) {
        return state
      }
      if (action.stage === 'gateway') {
        return {
          ...state,
          stage: 'gateway',
          recipientId: null,
        }
      }
      return {
        ...state,
        stage: action.stage,
      }
    }
    case 'SET_YOUR_TURN_ENABLED': {
      const nextStage =
        !action.enabled && state.stage === 'your_turn' ? 'ending' : state.stage
      return {
        ...state,
        yourTurnEnabled: action.enabled,
        stage: nextStage,
      }
    }
    case 'RESET_EXPERIENCE': {
      return {
        ...INITIAL_EXPERIENCE_STATE,
        yourTurnEnabled: state.yourTurnEnabled,
      }
    }
  }
}
