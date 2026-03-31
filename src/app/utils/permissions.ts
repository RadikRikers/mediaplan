import {
  User,
  Task,
  UserRole,
  roleBlocks,
  Meeting,
  PermissionLevel,
  StaffBlock,
} from '../types';
import { SERVICE_USER_ID, isServiceAccount } from '../constants/serviceAccount';
import {
  MEDIA_ROOT_ID,
  ANALYTICS_BLOCK_ID,
  FEEDBACK_BLOCK_ID,
  LEARNING_DEPT_BLOCK_ID,
} from '../constants/staffBlockIds';

/** Полные права: сервис и учётки с уровнем full — структура организации, все данные */
export function hasOrgFullAccess(user: User | null): boolean {
  if (!user) return false;
  return user.permissionLevel === 'full';
}

/** Средние и полные: видят всех сотрудников и все задачи (как бывшие редактор / старший SMM) */
export function hasBroadAccess(user: User | null): boolean {
  if (!user) return false;
  return user.permissionLevel === 'full' || user.permissionLevel === 'medium';
}

/** Блок «общее руководство»: полная видимость задач и команды по оргструктуре */
export function hasLeadershipScope(user: User | null, staffBlocks: StaffBlock[]): boolean {
  if (!user?.blockId) return false;
  const block = staffBlocks.find((b) => b.id === user.blockId);
  return Boolean(block?.leadershipScope);
}

/** Сотрудник структуры «Медиаблок» (сам узел или любой подблок с родителем до корня медиа). */
export function isMediaOrgStaffMember(user: User | null, staffBlocks: StaffBlock[]): boolean {
  if (!user?.blockId) return false;
  let id: string | null | undefined = user.blockId;
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    if (id === MEDIA_ROOT_ID) return true;
    const block = staffBlocks.find((b) => b.id === id);
    id = block?.parentBlockId ?? null;
  }
  return false;
}

/** Пользователь в блоке `rootBlockId` или в подразделении (подъём по parentBlockId). */
export function isUserUnderStaffBlockRoot(
  user: User | null,
  staffBlocks: StaffBlock[],
  rootBlockId: string,
): boolean {
  if (!user?.blockId) return false;

  let id: string | null | undefined = user.blockId;
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    if (id === rootBlockId) return true;
    const block = staffBlocks.find((b) => b.id === id);
    id = block?.parentBlockId ?? null;
  }
  return false;
}

export function isAnalyticsDepartmentStaff(user: User | null, staffBlocks: StaffBlock[]): boolean {
  return isUserUnderStaffBlockRoot(user, staffBlocks, ANALYTICS_BLOCK_ID);
}

export function isFeedbackDepartmentStaff(user: User | null, staffBlocks: StaffBlock[]): boolean {
  return isUserUnderStaffBlockRoot(user, staffBlocks, FEEDBACK_BLOCK_ID);
}

export function isLearningDepartmentStaff(user: User | null, staffBlocks: StaffBlock[]): boolean {
  return isUserUnderStaffBlockRoot(user, staffBlocks, LEARNING_DEPT_BLOCK_ID);
}

export function isSpecialtyInsightsDepartmentStaff(user: User | null, staffBlocks: StaffBlock[]): boolean {
  return (
    isAnalyticsDepartmentStaff(user, staffBlocks) ||
    isFeedbackDepartmentStaff(user, staffBlocks) ||
    isLearningDepartmentStaff(user, staffBlocks)
  );
}

function isElevatedOrgNavUser(user: User | null, staffBlocks: StaffBlock[]): boolean {
  if (!user) return false;
  return isServiceAccount(user) || hasLeadershipScope(user, staffBlocks);
}

/** Медиаплан, контент-план, архив: медиаблок, руководство или сервис (не отделы аналитики / ОС / обучения). */
export function canAccessMediaWorkloadNav(user: User | null, staffBlocks: StaffBlock[]): boolean {
  if (!user) return false;
  if (isElevatedOrgNavUser(user, staffBlocks)) return true;
  if (isSpecialtyInsightsDepartmentStaff(user, staffBlocks)) return false;
  return isMediaOrgStaffMember(user, staffBlocks);
}

export function canAccessAnalyticsSection(user: User | null, staffBlocks: StaffBlock[]): boolean {
  if (!user) return false;
  if (isElevatedOrgNavUser(user, staffBlocks)) return true;
  return isAnalyticsDepartmentStaff(user, staffBlocks);
}

export function canAccessFeedbackSection(user: User | null, staffBlocks: StaffBlock[]): boolean {
  if (!user) return false;
  if (isElevatedOrgNavUser(user, staffBlocks)) return true;
  return isFeedbackDepartmentStaff(user, staffBlocks);
}

export function canAccessLearningSection(user: User | null, staffBlocks: StaffBlock[]): boolean {
  if (!user) return false;
  if (isElevatedOrgNavUser(user, staffBlocks)) return true;
  return isLearningDepartmentStaff(user, staffBlocks);
}

/** Доступ к любому из трёх разделов (например для проверки «есть ли куда редиректить»). */
export function canAccessAnyInsightsSection(user: User | null, staffBlocks: StaffBlock[]): boolean {
  return (
    canAccessAnalyticsSection(user, staffBlocks) ||
    canAccessFeedbackSection(user, staffBlocks) ||
    canAccessLearningSection(user, staffBlocks)
  );
}

/** @deprecated используйте hasBroadAccess — то же поведение для задач/команды */
export function hasFullAccess(user: User | null): boolean {
  return hasBroadAccess(user);
}

/** Выдача уровня прав: «полные» — только сервисный аккаунт или сотрудник блока руководства */
export function canAssignPermissionLevel(
  actor: User | null,
  target: PermissionLevel,
  staffBlocks: StaffBlock[],
): boolean {
  if (!actor) return false;
  if (target === 'full') {
    if (isServiceAccount(actor)) return true;
    return hasLeadershipScope(actor, staffBlocks);
  }
  if (actor.permissionLevel === 'full') return true;
  if (hasLeadershipScope(actor, staffBlocks)) return true;
  if (actor.permissionLevel === 'medium') return target === 'basic' || target === 'medium';
  return false;
}

/** Блок для ограничения «начальных» прав: из профиля или по старой роли */
export function getUserBlockId(user: User): string | null {
  if (user.blockId) return user.blockId;
  if (roleBlocks.smm.includes(user.role)) return 'blk-smm';
  if (roleBlocks.copywriting.includes(user.role)) return 'blk-copy';
  if (roleBlocks.content.includes(user.role)) return 'blk-content';
  return null;
}

export function getUserBlock(role: UserRole): 'smm' | 'copywriting' | 'content' | null {
  if (roleBlocks.smm.includes(role)) return 'smm';
  if (roleBlocks.copywriting.includes(role)) return 'copywriting';
  if (roleBlocks.content.includes(role)) return 'content';
  return null;
}

function isSameStaffSubblock(a: User, b: User): boolean {
  return Boolean(a.blockId && a.blockId === b.blockId);
}

/**
 * Видимость задач для «начальных» прав учитывает настройки блока исполнителей.
 * Сервисный аккаунт видит все задачи; средние/полные — как раньше, все задачи.
 */
export function canViewTask(
  task: Task,
  currentUser: User | null,
  users: User[],
  staffBlocks: StaffBlock[],
): boolean {
  if (!currentUser) return false;

  if (isServiceAccount(currentUser)) return true;
  if (hasBroadAccess(currentUser)) return true;
  if (hasLeadershipScope(currentUser, staffBlocks)) return true;
  if (task.assignees.includes(currentUser.id)) return true;

  for (const aid of task.assignees) {
    const assignee = users.find((u) => u.id === aid);
    if (!assignee) continue;
    const block = staffBlocks.find((b) => b.id === assignee.blockId);
    if (!block) continue;
    switch (block.taskVisibility) {
      case 'all':
        return true;
      case 'block_only':
        if (isSameStaffSubblock(currentUser, assignee)) return true;
        break;
      case 'block_and_extra': {
        const extra = block.taskVisibilityExtraUserIds ?? [];
        if (extra.includes(currentUser.id)) return true;
        if (isSameStaffSubblock(currentUser, assignee)) return true;
        break;
      }
    }
  }

  return false;
}

export function filterTasksByPermissions(
  tasks: Task[],
  currentUser: User | null,
  users: User[],
  staffBlocks: StaffBlock[],
): Task[] {
  if (!currentUser) return [];
  return tasks.filter((task) => canViewTask(task, currentUser, users, staffBlocks));
}

export function canViewUser(
  target: User,
  currentUser: User | null,
  staffBlocks: StaffBlock[],
): boolean {
  if (!currentUser) return false;

  if (hasBroadAccess(currentUser)) return true;
  if (hasLeadershipScope(currentUser, staffBlocks)) return true;

  const a = getUserBlockId(currentUser);
  const b = getUserBlockId(target);
  return a !== null && a === b;
}

export function filterUsersByPermissions(
  users: User[],
  currentUser: User | null,
  staffBlocks: StaffBlock[],
): User[] {
  if (!currentUser) return [];
  return users.filter((user) => canViewUser(user, currentUser, staffBlocks));
}

export function canManageMeeting(
  meeting: Meeting,
  currentUser: User | null,
  staffBlocks: StaffBlock[],
): boolean {
  if (!currentUser) return false;
  if (meeting.createdBy === currentUser.id) return true;
  if (hasBroadAccess(currentUser)) return true;
  return hasLeadershipScope(currentUser, staffBlocks);
}

/**
 * Редактирование карточки сотрудника: сервис — только org full;
 * учётку с **полными** правами меняют только сервис или блок «общее руководство»;
 * остальных — средние/полные или руководство.
 */
export function canEditServiceUser(
  actor: User | null,
  target: User,
  staffBlocks: StaffBlock[],
): boolean {
  if (!actor) return false;
  if (target.id === SERVICE_USER_ID) return hasOrgFullAccess(actor);
  if (target.permissionLevel === 'full') {
    if (isServiceAccount(actor)) return true;
    return hasLeadershipScope(actor, staffBlocks);
  }
  return hasBroadAccess(actor) || hasLeadershipScope(actor, staffBlocks);
}
