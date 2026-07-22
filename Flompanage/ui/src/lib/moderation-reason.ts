export const MIN_MODERATION_REASON_LENGTH = 3;

export function isModerationReasonValid(reason: string): boolean {
  return reason.trim().length >= MIN_MODERATION_REASON_LENGTH;
}
