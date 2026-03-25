export type UserRole = 
  | 'smm-specialist'
  | 'senior-smm-specialist'
  | 'copywriter'
  | 'editor'
  | 'designer'
  | 'videographer';

/** Полные — сервис и настраиваемые учётки; средние — расширенный доступ; начальные — ограниченный по блоку */
export type PermissionLevel = 'full' | 'medium' | 'basic';

/**
 * Кто видит задачи, где есть исполнители из этого блока (кроме своих назначенных — их все видят).
 * Настраивается учёткой с полными правами (сервисный сценарий).
 */
export type BlockTaskVisibility = 'all' | 'block_only' | 'block_and_extra';

export interface StaffBlock {
  id: string;
  name: string;
  createdAt: string;
  /** Родительский блок (null — корень). Подблоки SMM/копирайт/контент — дети общего медиаблока */
  parentBlockId: string | null;
  taskVisibility: BlockTaskVisibility;
  /** Для block_and_extra — id пользователей, которым также видны задачи блока */
  taskVisibilityExtraUserIds: string[];
  /** Сотрудники блока видят и могут вести все задачи организации (общее руководство) */
  leadershipScope?: boolean;
}

/** Должность внутри блока; defaultRole сохраняет совместимость с типами задач и отчётов */
export interface JobPosition {
  id: string;
  name: string;
  blockId: string;
  defaultRole: UserRole;
  createdAt: string;
  /** Своя подпись «тип в задачах»; если пусто — берётся из стандартной роли defaultRole */
  taskTypeLabel?: string;
}

export type TaskCategory = 
  | 'federal'
  | 'regional'
  | 'pfo'
  | 'spk-mailings'
  | 'bloggers'
  | 'reports';

export type RecurrenceType = 'none' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export type KPIType = 'views' | 'links' | 'none';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  password: string;
  createdAt: string;
  permissionLevel: PermissionLevel;
  /** Блок из справочника (создаётся сервисным аккаунтом) */
  blockId: string;
  /** Должность из справочника */
  positionId: string;
  /** Своя подпись типа в задачах поверх должности (произвольный текст) */
  taskTypeLabel?: string;
}

export interface CommunicationChannel {
  id: string;
  name: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  /** ISO дата дедлайна; отсутствует для задач "без дедлайна" */
  deadline?: string;
  assignees: string[]; // user IDs
  category: TaskCategory;
  completed: boolean;
  /** Когда задача отмечена выполненной (для архива) */
  completedAt?: string;
  recurrence: RecurrenceType;
  // Для повторяющихся задач
  dayOfWeek?: number; // 0-6 (воскресенье-суббота) для weekly/biweekly
  dayOfMonth?: number; // 1-31 для monthly
  monthOfQuarter?: number; // 1-3 для quarterly
  dayOfQuarter?: number; // 1-31 для quarterly
  kpiType: KPIType;
  kpiTarget?: number;
  channels: string[]; // channel IDs
  createdAt: string;
}

/** Встреча в планёре (недельная сетка); синхронизируется с остальным состоянием приложения */
export interface Meeting {
  id: string;
  title: string;
  /** ISO дата/время начала */
  startsAt: string;
  /** ISO дата/время окончания */
  endsAt: string;
  /** Место или ссылка (переговорная, Zoom и т.д.) */
  location: string;
  /** Что подготовить — необязательно */
  preparation?: string;
  participantIds: string[];
  createdBy: string;
  createdAt: string;
}

export const permissionLabels: Record<PermissionLevel, string> = {
  full: 'Полные права',
  medium: 'Средние права',
  basic: 'Начальные права',
};

export const blockTaskVisibilityLabels: Record<BlockTaskVisibility, string> = {
  all: 'Все пользователи',
  block_only: 'Только сотрудники этого подблока',
  block_and_extra: 'Сотрудники подблока и выбранные пользователи',
};

export const roleLabels: Record<UserRole, string> = {
  'smm-specialist': 'SMM-специалист',
  'senior-smm-specialist': 'Старший SMM-специалист',
  'copywriter': 'Копирайтер',
  'editor': 'Редактор',
  'designer': 'Дизайнер',
  'videographer': 'Видеограф',
};

export const categoryLabels: Record<TaskCategory, string> = {
  'federal': 'Федеральные задачи',
  'regional': 'Региональные задачи',
  'pfo': 'Задачи ПФО',
  'spk-mailings': 'СПК рассылки',
  'bloggers': 'Блогеры',
  'reports': 'Отчеты',
};

export const recurrenceLabels: Record<RecurrenceType, string> = {
  'none': 'Не повторяется',
  'weekly': 'Каждую неделю',
  'biweekly': 'Раз в 2 недели',
  'monthly': 'Каждый месяц',
  'quarterly': 'Каждый квартал',
  'yearly': 'Каждый год',
};

export const roleBlocks = {
  smm: ['smm-specialist', 'senior-smm-specialist'] as UserRole[],
  copywriting: ['copywriter', 'editor'] as UserRole[],
  content: ['designer', 'videographer'] as UserRole[],
};

export const blockLabels = {
  smm: 'Блок SMM',
  copywriting: 'Блок копирайтинга',
  content: 'Блок контента',
};

/** Подпись роли/типа в задачах: сначала у пользователя, затем у должности, затем стандартная метка роли */
export function displayTaskTypeLabel(user: User, jobPositions: JobPosition[]): string {
  const fromUser = user.taskTypeLabel?.trim();
  if (fromUser) return fromUser;
  const pos = jobPositions.find((p) => p.id === user.positionId);
  const fromPos = pos?.taskTypeLabel?.trim();
  if (fromPos) return fromPos;
  return roleLabels[user.role];
}