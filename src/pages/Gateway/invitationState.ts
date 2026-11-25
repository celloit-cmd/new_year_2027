import type { RecipientId } from '../../app/experienceState.ts'
import { normalizeInvitationCode } from './invitationConfig.ts'

export type InvitationStep = 'cta' | 'entry' | 'validating' | 'accepted'

export type InvitationErrorCode = 'empty' | 'invalid' | null

export interface InvitationState {
  readonly step: InvitationStep
  readonly codeInput: string
  readonly error: InvitationErrorCode
  readonly errorMessage: string | null
  readonly matchedRecipientId: RecipientId | null
}

export const INITIAL_INVITATION_STATE: InvitationState = {
  step: 'cta',
  codeInput: '',
  error: null,
  errorMessage: null,
  matchedRecipientId: null,
}

export type InvitationAction =
  | { type: 'OPEN_INVITATION' }
  | { type: 'UPDATE_CODE'; value: string }
  | { type: 'SUBMIT_START' }
  | { type: 'VALIDATION_SUCCEEDED'; recipientId: RecipientId }
  | { type: 'VALIDATION_FAILED' }
  | { type: 'RESET_INVITATION' }

/**
 * Pure reducer managing the Gateway invitation CTA, input validation, and
 * accepted handoff state independently of ExperienceStage.
 */
export function invitationReducer(
  state: InvitationState,
  action: InvitationAction,
): InvitationState {
  switch (action.type) {
    case 'OPEN_INVITATION': {
      if (state.step !== 'cta') {
        return state
      }
      return {
        ...state,
        step: 'entry',
        error: null,
        errorMessage: null,
      }
    }
    case 'UPDATE_CODE': {
      if (state.step === 'validating' || state.step === 'accepted') {
        return state
      }
      return {
        ...state,
        codeInput: action.value,
        error: null,
        errorMessage: null,
      }
    }
    case 'SUBMIT_START': {
      if (state.step !== 'entry') {
        return state
      }
      if (normalizeInvitationCode(state.codeInput).length === 0) {
        return {
          ...state,
          error: 'empty',
          errorMessage: 'Please enter your invitation code.',
        }
      }
      return {
        ...state,
        step: 'validating',
        error: null,
        errorMessage: null,
      }
    }
    case 'VALIDATION_SUCCEEDED': {
      if (state.step !== 'validating') {
        return state
      }
      return {
        ...state,
        step: 'accepted',
        error: null,
        errorMessage: null,
        matchedRecipientId: action.recipientId,
      }
    }
    case 'VALIDATION_FAILED': {
      if (state.step !== 'validating') {
        return state
      }
      return {
        ...state,
        step: 'entry',
        error: 'invalid',
        errorMessage: 'That code does not match an invitation. Please check it and try again.',
      }
    }
    case 'RESET_INVITATION': {
      return INITIAL_INVITATION_STATE
    }
  }
}
