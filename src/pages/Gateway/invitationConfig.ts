import type { RecipientId } from '../../app/experienceState.ts'

/**
 * Matching policy applied consistently to all invitation-code lookups:
 * leading/trailing whitespace is trimmed and comparison is case-insensitive.
 */
export const INVITATION_CODE_POLICY = 'trimmed-case-insensitive' as const

/**
 * Placeholder code-to-recipient mapping for routing/personalization only.
 * Client-side codes are not confidential authentication.
 */
const INVITATION_CODE_MAP: Record<string, RecipientId> = {
  'STARLIGHT-ONE': 'recipient-one',
  'NORTHSTAR-TWO': 'recipient-two',
}

export function normalizeInvitationCode(rawInput: string): string {
  return rawInput.trim().toUpperCase()
}

export function resolveInvitationCode(rawInput: string): RecipientId | null {
  const normalized = normalizeInvitationCode(rawInput)
  if (!normalized) {
    return null
  }
  if (!Object.hasOwn(INVITATION_CODE_MAP, normalized)) {
    return null
  }
  return INVITATION_CODE_MAP[normalized] ?? null
}
