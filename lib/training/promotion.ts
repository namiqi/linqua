import { LEARNING_TO_KNOWN_DAYS } from "../constants";

export interface WordDrillStats {
  attempts: number;
  correct: number;
}

export function canClaimAsKnown(
  status: string,
  learningStartedAt: string | null
): boolean {
  if (status !== "learning" || !learningStartedAt) return false;
  return Date.now() >= claimEligibleAt(learningStartedAt).getTime();
}

export function claimEligibleAt(learningStartedAt: string): Date {
  const eligible = new Date(learningStartedAt);
  eligible.setDate(eligible.getDate() + LEARNING_TO_KNOWN_DAYS);
  return eligible;
}

export function daysUntilClaimable(learningStartedAt: string | null): number {
  if (!learningStartedAt) return LEARNING_TO_KNOWN_DAYS;
  const ms = claimEligibleAt(learningStartedAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
