import type { User } from '../types';

/** Единственный аккаунт, с которого данные пишутся в localStorage */
export const SERVICE_USER_ID = '9';

export function isServiceAccount(user: User | null | undefined): boolean {
  return user?.id === SERVICE_USER_ID;
}
