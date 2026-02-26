import { PassType } from '@prisma/client';

export const UNACTIVATED_PASS_DATE = new Date(0);

export const PASS_DURATION_MS: Record<PassType, number> = {
  HOURS_24: 24 * 60 * 60 * 1000,
  DAYS_3: 3 * 24 * 60 * 60 * 1000,
  DAYS_7: 7 * 24 * 60 * 60 * 1000,
  DAYS_30: 30 * 24 * 60 * 60 * 1000,
};

export function getPassExpiry(type: PassType, startsAt: Date): Date {
  return new Date(startsAt.getTime() + PASS_DURATION_MS[type]);
}

