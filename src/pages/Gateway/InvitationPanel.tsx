import { useEffect, useReducer, useRef, type FormEvent } from 'react'
import type { RecipientId } from '../../app/experienceState.ts'
import { resolveInvitationCode } from './invitationConfig.ts'
import {
  INITIAL_INVITATION_STATE,
  invitationReducer,
} from './invitationState.ts'
import './InvitationPanel.css'

export interface InvitationPanelProps {
  readonly prefersReducedMotion: boolean
  readonly onRecipientAccepted: (recipientId: RecipientId) => void
}

/**
 * Compact celestial invitation CTA and code-entry flow rendered beneath
 * the particle-formed HAPPY NEW YEAR 2027 reveal.
 */
export function InvitationPanel({
  prefersReducedMotion,
  onRecipientAccepted,
}: InvitationPanelProps) {
  const [state, dispatch] = useReducer(
    invitationReducer,
    INITIAL_INVITATION_STATE,
  )
  const inputRef = useRef<HTMLInputElement | null>(null)
  const shouldFocusInputRef = useRef<boolean>(false)
  const submittedCodeRef = useRef<string>('')
  const onRecipientAcceptedRef = useRef(onRecipientAccepted)

  useEffect(() => {
    onRecipientAcceptedRef.current = onRecipientAccepted
  }, [onRecipientAccepted])

  useEffect(() => {
    if (state.step === 'entry' && shouldFocusInputRef.current) {
      shouldFocusInputRef.current = false
      inputRef.current?.focus()
    }
  }, [state.step])

  useEffect(() => {
    if (state.step !== 'validating') {
      return
    }

    const validationDelayMs = prefersReducedMotion ? 60 : 180
    const timerId = window.setTimeout(() => {
      const recipientId = resolveInvitationCode(submittedCodeRef.current)
      if (recipientId) {
        dispatch({ type: 'VALIDATION_SUCCEEDED', recipientId })
        onRecipientAcceptedRef.current(recipientId)
      } else {
        dispatch({ type: 'VALIDATION_FAILED' })
        shouldFocusInputRef.current = true
      }
    }, validationDelayMs)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [state.step, prefersReducedMotion])

  const handleOpenInvitation = () => {
    shouldFocusInputRef.current = true
    dispatch({ type: 'OPEN_INVITATION' })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (state.step !== 'entry') {
      return
    }
    submittedCodeRef.current = state.codeInput
    dispatch({ type: 'SUBMIT_START' })
  }

  return (
    <div className="invitation-panel">
      {state.step === 'cta' && (
        <button
          type="button"
          className="invitation-cta-button"
          onClick={handleOpenInvitation}
        >
          <span className="invitation-cta-glyph" aria-hidden="true">
            ✦
          </span>
          <span>View Your Journey From My POV</span>
        </button>
      )}

      {(state.step === 'entry' || state.step === 'validating') && (
        <form
          className="invitation-form-surface"
          onSubmit={handleSubmit}
          noValidate
        >
          <p className="invitation-prompt">This journey is meant for you.</p>

          <div className="invitation-field-group">
            <label htmlFor="invitation-code-input" className="invitation-label">
              Invitation code
            </label>

            <div className="invitation-input-row">
              <input
                ref={inputRef}
                id="invitation-code-input"
                name="invitationCode"
                type="text"
                className="invitation-input"
                value={state.codeInput}
                onChange={(event) =>
                  dispatch({ type: 'UPDATE_CODE', value: event.target.value })
                }
                placeholder="Enter your code"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={state.step === 'validating'}
                aria-invalid={state.error !== null}
                aria-describedby={
                  state.errorMessage ? 'invitation-feedback' : undefined
                }
              />

              <button
                type="submit"
                className="invitation-submit"
                disabled={state.step === 'validating'}
              >
                {state.step === 'validating' ? 'Opening...' : 'Enter'}
              </button>
            </div>

            {state.errorMessage && (
              <p
                id="invitation-feedback"
                className="invitation-feedback"
                role="alert"
              >
                <span className="invitation-feedback-marker" aria-hidden="true">
                  !
                </span>
                <span>{state.errorMessage}</span>
              </p>
            )}
          </div>
        </form>
      )}

      {state.step === 'accepted' && (
        <div className="invitation-accepted" role="status" aria-live="polite">
          <p className="invitation-accepted-badge">
            <span aria-hidden="true">✦</span>
            <span>Invitation recognized</span>
          </p>
          <p className="invitation-accepted-note">
            Preparing your journey...
          </p>
        </div>
      )}
    </div>
  )
}
