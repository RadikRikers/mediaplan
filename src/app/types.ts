export type UserRole = 
  | 'smm-specialist'
  | 'senior-smm-specialist'
  | 'copywriter'
  | 'editor'
  | 'designer'
  | 'videographer';

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