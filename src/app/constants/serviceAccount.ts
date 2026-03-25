import type { User } from '../types';

/** Единственный аккаунт, с которого данные пишутся в localStorage */
export const SERVICE_USER_ID = '9';

export function isServiceAccount(user: User | null | undefined): boolean {
  return user?.id === SERVICE_USER_ID;
}

/**
 * Технический аккаунт исключается из интерфейса: списки команды, исполнители, участники.
 * Вход под ним по-прежнему возможен; в шапке отображается текущий пользователь.
 */
export function withoutGhostServiceUser(users: User[]): User[] {
  return users.filter((u) => u.id !== SERVICE_USER_ID);
}
