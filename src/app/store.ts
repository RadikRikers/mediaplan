import { useState, useEffect, useRef, useCallback } from 'react';
import {
  User,
  Task,
  ContentSocialPlatform,
  CommunicationChannel,
  Meeting,
  StaffBlock,
  JobPosition,
  PermissionLevel,
  UserRole,
  roleBlocks,
} from './types';
import {
  addDays,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  isBefore,
  isAfter,
  isSameDay,
  startOfDay,
  differenceInHours,
} from 'date-fns';
import { toast } from 'sonner';
import { isServiceAccount, SERVICE_USER_ID } from './constants/serviceAccount';
import {
  LEADERSHIP_BLOCK_ID,
  MEDIA_ROOT_ID,
  MEDIA_SUB_BLOCK_IDS,
} from './constants/staffBlockIds';
import {
  fetchRemoteState,
  saveRemoteState,
  isRemoteSyncConfigured,
  snapshotState,
  type RemoteStatePayload,
} from './api/backend';
import { archivedTaskPurgeAt } from './utils/archivePurge';

/** Состояние синхронизации с Supabase (для индикатора в шапке) */
export type CloudSyncStatus = 'off' | 'loading' | 'saving' | 'ready' | 'error';

// Локальное хранилище данных
const STORAGE_KEYS = {
  USERS: 'mediaplanning_users',
  TASKS: 'mediaplanning_tasks',
  CHANNELS: 'mediaplanning_channels',
  MEETINGS: 'mediaplanning_meetings',
  STAFF_BLOCKS: 'mediaplanning_staff_blocks',
  JOB_POSITIONS: 'mediaplanning_job_positions',
  COMPLETED_TASKS_LIFETIME: 'mediaplanning_completed_tasks_lifetime',
  NOTIFICATIONS_SHOWN: 'mediaplanning_notifications_shown',
  CURRENT_USER: 'mediaplanning_current_user',
  PUSH_NOTIFICATIONS_ENABLED: 'mediaplanning_push_notifications_enabled',
};

const SESSION_USER_KEY = 'mediaplanning_session_user';
const DEMO_TASK_IDS = new Set(Array.from({ length: 42 }, (_, i) => String(i + 1)));

const orgSeedAt = new Date().toISOString();

/** Общий родитель + подблоки SMM / копирайт / контент (права по подблокам как раньше) */
const initialStaffBlocks: StaffBlock[] = [
  {
    id: LEADERSHIP_BLOCK_ID,
    name: 'Общее руководство',
    createdAt: orgSeedAt,
    parentBlockId: null,
    taskVisibility: 'all',
    taskVisibilityExtraUserIds: [],
    leadershipScope: true,
  },
  {
    id: MEDIA_ROOT_ID,
    name: 'Медиаблок (объединённый)',
    createdAt: orgSeedAt,
    parentBlockId: null,
    taskVisibility: 'block_only',
    taskVisibilityExtraUserIds: [],
  },
  {
    id: 'blk-smm',
    name: 'Блок SMM',
    createdAt: orgSeedAt,
    parentBlockId: MEDIA_ROOT_ID,
    taskVisibility: 'block_only',
    taskVisibilityExtraUserIds: [],
  },
  {
    id: 'blk-copy',
    name: 'Блок копирайтинга',
    createdAt: orgSeedAt,
    parentBlockId: MEDIA_ROOT_ID,
    taskVisibility: 'block_only',
    taskVisibilityExtraUserIds: [],
  },
  {
    id: 'blk-content',
    name: 'Блок контента',
    createdAt: orgSeedAt,
    parentBlockId: MEDIA_ROOT_ID,
    taskVisibility: 'block_only',
    taskVisibilityExtraUserIds: [],
  },
];

const initialJobPositions: JobPosition[] = [
  {
    id: 'pos-leadership',
    name: 'Руководство',
    blockId: LEADERSHIP_BLOCK_ID,
    defaultRole: 'org-leadership',
    createdAt: orgSeedAt,
  },
  { id: 'pos-senior-smm', name: 'Старший SMM-специалист', blockId: 'blk-smm', defaultRole: 'senior-smm-specialist', createdAt: orgSeedAt },
  { id: 'pos-smm', name: 'SMM-специалист', blockId: 'blk-smm', defaultRole: 'smm-specialist', createdAt: orgSeedAt },
  { id: 'pos-editor', name: 'Редактор', blockId: 'blk-copy', defaultRole: 'editor', createdAt: orgSeedAt },
  { id: 'pos-copy', name: 'Копирайтер', blockId: 'blk-copy', defaultRole: 'copywriter', createdAt: orgSeedAt },
  { id: 'pos-designer', name: 'Дизайнер', blockId: 'blk-content', defaultRole: 'designer', createdAt: orgSeedAt },
  { id: 'pos-video', name: 'Видеограф', blockId: 'blk-content', defaultRole: 'videographer', createdAt: orgSeedAt },
];

function permissionLevelFromLegacyUser(id: string, role: UserRole): PermissionLevel {
  if (id === SERVICE_USER_ID) return 'full';
  if (role === 'org-leadership') return 'medium';
  if (role === 'editor' || role === 'senior-smm-specialist') return 'medium';
  return 'basic';
}

function legacyBlockIdForRole(role: UserRole): string {
  if (role === 'org-leadership') return LEADERSHIP_BLOCK_ID;
  if (roleBlocks.smm.includes(role)) return 'blk-smm';
  if (roleBlocks.copywriting.includes(role)) return 'blk-copy';
  if (roleBlocks.content.includes(role)) return 'blk-content';
  return 'blk-smm';
}

function legacyPositionIdForRole(role: UserRole): string {
  const m: Record<UserRole, string> = {
    'senior-smm-specialist': 'pos-senior-smm',
    'smm-specialist': 'pos-smm',
    'org-leadership': 'pos-leadership',
    'editor': 'pos-editor',
    'copywriter': 'pos-copy',
    'designer': 'pos-designer',
    'videographer': 'pos-video',
  };
  return m[role];
}

function normalizeUserWire(raw: Record<string, unknown>): User {
  const id = String(raw.id ?? '');
  let role = (raw.role as UserRole) || 'smm-specialist';
  const permissionLevel =
    (raw.permissionLevel as PermissionLevel) || permissionLevelFromLegacyUser(id, role);
  const blockId =
    typeof raw.blockId === 'string' && raw.blockId ? raw.blockId : legacyBlockIdForRole(role);
  /* Сотрудники блока руководства раньше могли иметь role editor — отделяем от копирайтинга */
  if (blockId === LEADERSHIP_BLOCK_ID && role === 'editor') {
    role = 'org-leadership';
  }
  let positionId =
    typeof raw.positionId === 'string' && raw.positionId ? raw.positionId : legacyPositionIdForRole(role);
  if (blockId === LEADERSHIP_BLOCK_ID && role === 'org-leadership' && positionId === 'pos-editor') {
    positionId = 'pos-leadership';
  }
  const ttl = typeof raw.taskTypeLabel === 'string' ? raw.taskTypeLabel.trim() : '';
  return {
    id,
    name: typeof raw.name === 'string' ? raw.name : '',
    role,
    password: typeof raw.password === 'string' ? raw.password : '',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    permissionLevel: id === SERVICE_USER_ID ? 'full' : permissionLevel,
    blockId,
    positionId,
    ...(ttl ? { taskTypeLabel: ttl } : {}),
  };
}

function normalizeChannelWire(raw: Record<string, unknown>): CommunicationChannel {
  const kindRaw = raw.kind;
  const kind = kindRaw === 'public' || kindRaw === 'system' ? kindRaw : 'system';
  const ownerUserId = kind === 'public' && typeof raw.ownerUserId === 'string' ? raw.ownerUserId : undefined;

  return {
    id: String(raw.id ?? `${Date.now()}`),
    name: typeof raw.name === 'string' ? raw.name : 'Канал',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    kind,
    ownerUserId,
  };
}

function normalizeStaffBlockWire(raw: Record<string, unknown>): StaffBlock {
  const tv = raw.taskVisibility;
  const taskVisibility =
    tv === 'all' || tv === 'block_only' || tv === 'block_and_extra' ? tv : 'block_only';
  const parentRaw = raw.parentBlockId;
  const parentBlockId =
    typeof parentRaw === 'string' && parentRaw.length > 0 ? parentRaw : null;
  const extra = Array.isArray(raw.taskVisibilityExtraUserIds)
    ? (raw.taskVisibilityExtraUserIds as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];
  const leadershipScope = raw.leadershipScope === true;
  return {
    id: String(raw.id ?? `${Date.now()}`),
    name: typeof raw.name === 'string' ? raw.name : 'Блок',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    parentBlockId,
    taskVisibility,
    taskVisibilityExtraUserIds: extra,
    ...(leadershipScope ? { leadershipScope: true } : {}),
  };
}

function ensureStaffBlockHierarchy(blocks: StaffBlock[]): StaffBlock[] {
  const byId = new Set(blocks.map((b) => b.id));
  let next = [...blocks];
  const seedAt = next[0]?.createdAt ?? new Date().toISOString();
  if (!byId.has(LEADERSHIP_BLOCK_ID)) {
    next = [
      {
        id: LEADERSHIP_BLOCK_ID,
        name: 'Общее руководство',
        createdAt: seedAt,
        parentBlockId: null,
        taskVisibility: 'all',
        taskVisibilityExtraUserIds: [],
        leadershipScope: true,
      },
      ...next,
    ];
  }
  if (!byId.has(MEDIA_ROOT_ID) && MEDIA_SUB_BLOCK_IDS.some((id) => byId.has(id))) {
    next = [
      {
        id: MEDIA_ROOT_ID,
        name: 'Медиаблок (объединённый)',
        createdAt: seedAt,
        parentBlockId: null,
        taskVisibility: 'block_only',
        taskVisibilityExtraUserIds: [],
      },
      ...next,
    ];
  }
  return next.map((b) => {
    if (b.id === LEADERSHIP_BLOCK_ID) {
      return { ...b, parentBlockId: null };
    }
    if (MEDIA_SUB_BLOCK_IDS.includes(b.id as (typeof MEDIA_SUB_BLOCK_IDS)[number]) && !b.parentBlockId) {
      return { ...b, parentBlockId: MEDIA_ROOT_ID };
    }
    return b;
  });
}

function normalizeJobPositionWire(raw: Record<string, unknown>): JobPosition {
  const ttl = typeof raw.taskTypeLabel === 'string' ? raw.taskTypeLabel.trim() : '';
  return {
    id: String(raw.id ?? `${Date.now()}`),
    name: typeof raw.name === 'string' ? raw.name : 'Должность',
    blockId: typeof raw.blockId === 'string' ? raw.blockId : 'blk-smm',
    defaultRole: (raw.defaultRole as UserRole) || 'smm-specialist',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    ...(ttl ? { taskTypeLabel: ttl } : {}),
  };
}

/** Если в данных есть блок руководства, но нет должности — добавляем типовую */
function ensureLeadershipJobPosition(
  positions: JobPosition[],
  blocks: StaffBlock[],
  seedAt: string,
): JobPosition[] {
  const hasLeadershipBlock = blocks.some((b) => b.id === LEADERSHIP_BLOCK_ID);
  if (!hasLeadershipBlock) return positions;
  if (positions.some((p) => p.blockId === LEADERSHIP_BLOCK_ID)) return positions;
  return [
    ...positions,
    normalizeJobPositionWire({
      id: 'pos-leadership',
      name: 'Руководство',
      blockId: LEADERSHIP_BLOCK_ID,
      defaultRole: 'org-leadership',
      createdAt: seedAt,
    }),
  ];
}

// Начальные пользователи (id 1–8 — команда, 9 — сервисный аккаунт для сохранения в localStorage)
const initialUsers: User[] = [
  {
    id: '1',
    name: 'Капустин Родион',
    role: 'senior-smm-specialist',
    password: 'demo1',
    createdAt: new Date().toISOString(),
    permissionLevel: 'medium',
    blockId: 'blk-smm',
    positionId: 'pos-senior-smm',
  },
  {
    id: '2',
    name: 'Ермакова Виктория',
    role: 'smm-specialist',
    password: 'demo2',
    createdAt: new Date().toISOString(),
    permissionLevel: 'basic',
    blockId: 'blk-smm',
    positionId: 'pos-smm',
  },
  {
    id: '3',
    name: 'Поздеева Анжела',
    role: 'editor',
    password: 'demo3',
    createdAt: new Date().toISOString(),
    permissionLevel: 'medium',
    blockId: 'blk-copy',
    positionId: 'pos-editor',
  },
  {
    id: '4',
    name: 'Филатова Юлиана',
    role: 'copywriter',
    password: 'demo4',
    createdAt: new Date().toISOString(),
    permissionLevel: 'basic',
    blockId: 'blk-copy',
    positionId: 'pos-copy',
  },
  {
    id: '5',
    name: 'Асадуллин Наиль',
    role: 'designer',
    password: 'demo5',
    createdAt: new Date().toISOString(),
    permissionLevel: 'basic',
    blockId: 'blk-content',
    positionId: 'pos-designer',
  },
  {
    id: '6',
    name: 'Валеев Тимур',
    role: 'videographer',
    password: 'demo6',
    createdAt: new Date().toISOString(),
    permissionLevel: 'basic',
    blockId: 'blk-content',
    positionId: 'pos-video',
  },
  {
    id: '7',
    name: 'Говорик Екатерина',
    role: 'smm-specialist',
    password: 'demo7',
    createdAt: new Date().toISOString(),
    permissionLevel: 'basic',
    blockId: 'blk-smm',
    positionId: 'pos-smm',
  },
  {
    id: '8',
    name: 'Антуганова Анна',
    role: 'copywriter',
    password: 'demo8',
    createdAt: new Date().toISOString(),
    permissionLevel: 'basic',
    blockId: 'blk-copy',
    positionId: 'pos-copy',
  },
  {
    id: SERVICE_USER_ID,
    name: 'Сервисный аккаунт',
    role: 'editor',
    password: 'service2024',
    createdAt: new Date().toISOString(),
    permissionLevel: 'full',
    blockId: 'blk-copy',
    positionId: 'pos-editor',
  },
];

// Начальные каналы
const initialChannels: CommunicationChannel[] = [
  { id: '1', name: 'Telegram', createdAt: new Date().toISOString(), kind: 'system' },
  { id: '2', name: 'VK', createdAt: new Date().toISOString(), kind: 'system' },
  { id: '3', name: 'Instagram', createdAt: new Date().toISOString(), kind: 'system' },
  { id: '4', name: 'YouTube', createdAt: new Date().toISOString(), kind: 'system' },
  { id: '5', name: 'Facebook', createdAt: new Date().toISOString(), kind: 'system' },
];

// Начальные задачи
const now = new Date();
const createdAt = now.toISOString();
const deadline = (daysFromNow: number) => addDays(now, daysFromNow);
const iso = (d: Date) => d.toISOString();
const dayOfWeekFrom = (daysFromNow: number) => deadline(daysFromNow).getDay(); // 0-6
const dayOfMonthFrom = (daysFromNow: number) => deadline(daysFromNow).getDate(); // 1-31
const monthOfQuarterFrom = (daysFromNow: number) =>
  (Math.floor(deadline(daysFromNow).getMonth() / 3) % 3) + 1; // 1-3
const dayOfQuarterFrom = (daysFromNow: number) => deadline(daysFromNow).getDate(); // 1-31

const initialTasks: Task[] = [
  // Federal (7)
  {
    id: '1',
    title: 'Федеральный запуск: контент-пак',
    description: 'Подготовить контент-пак и согласовать рубрики с командой.',
    deadline: iso(deadline(-4)),
    assignees: ['1', '7'],
    category: 'federal',
    completed: false,
    recurrence: 'none',
    kpiType: 'views',
    kpiTarget: 20000,
    channels: ['1', '2', '3'],
    createdAt,
  },
  {
    id: '2',
    title: 'Федеральный контент: ежемесячные посты',
    description: 'Ежемесячная подготовка и публикации по согласованной сетке.',
    deadline: iso(deadline(2)),
    assignees: ['1'],
    category: 'federal',
    completed: false,
    recurrence: 'monthly',
    dayOfMonth: dayOfMonthFrom(2),
    kpiType: 'links',
    kpiTarget: 3500,
    channels: ['1', '2'],
    createdAt,
  },
  {
    id: '3',
    title: 'Федеральный отчет: итоги недели',
    description: 'Собрать статистику, оформить выводы и отправить ответственным.',
    deadline: iso(deadline(4)),
    assignees: ['4', '8'],
    category: 'federal',
    completed: false,
    recurrence: 'none',
    kpiType: 'none',
    channels: ['1'],
    createdAt,
  },
  {
    id: '4',
    title: 'Федеральные видео: еженедельный ролик',
    description: 'Смонтировать и подготовить выпуск для YouTube.',
    deadline: iso(deadline(8)),
    assignees: ['6'],
    category: 'federal',
    completed: false,
    recurrence: 'weekly',
    dayOfWeek: dayOfWeekFrom(8),
    kpiType: 'views',
    kpiTarget: 45000,
    channels: ['4'],
    createdAt,
  },
  {
    id: '5',
    title: 'Федеральные креативы: раз в 2 недели',
    description: 'Сделать 2-3 креатива и согласовать визуальную линейку.',
    deadline: iso(deadline(15)),
    assignees: ['5'],
    category: 'federal',
    completed: false,
    recurrence: 'biweekly',
    dayOfWeek: dayOfWeekFrom(15),
    kpiType: 'links',
    kpiTarget: 2200,
    channels: ['3', '5'],
    createdAt,
  },
  {
    id: '6',
    title: 'Федеральная интеграция: квартальная активность',
    description: 'Подготовить интеграционный контент и запустить кампанию.',
    deadline: iso(deadline(-1)),
    assignees: ['2', '7'],
    category: 'federal',
    completed: false,
    recurrence: 'quarterly',
    monthOfQuarter: monthOfQuarterFrom(-1),
    dayOfQuarter: dayOfQuarterFrom(-1),
    kpiType: 'views',
    kpiTarget: 90000,
    channels: ['1', '4'],
    createdAt,
  },
  {
    id: '7',
    title: 'Федеральная стратегия: годовой пересмотр',
    description: 'Пересмотреть воронку, KPI и контент-направления на год.',
    deadline: iso(deadline(40)),
    assignees: ['1', '2', '4'],
    category: 'federal',
    completed: false,
    recurrence: 'yearly',
    kpiType: 'none',
    channels: ['1', '2', '4'],
    createdAt,
  },

  // Regional (7)
  {
    id: '8',
    title: 'Региональный старт: список тем',
    description: 'Подготовить темы на месяц и согласовать с куратором.',
    deadline: iso(deadline(-3)),
    assignees: ['5'],
    category: 'regional',
    completed: false,
    recurrence: 'none',
    kpiType: 'none',
    channels: ['3'],
    createdAt,
  },
  {
    id: '9',
    title: 'Региональные посты: еженедельно',
    description: 'Сделать и подготовить публикации по календарю.',
    deadline: iso(deadline(1)),
    assignees: ['4'],
    category: 'regional',
    completed: false,
    recurrence: 'weekly',
    dayOfWeek: dayOfWeekFrom(1),
    kpiType: 'views',
    kpiTarget: 12000,
    channels: ['2', '3'],
    createdAt,
  },
  {
    id: '10',
    title: 'Региональный дизайн: 1 раз в 2 недели',
    description: 'Собрать визуальный комплект для публикаций.',
    deadline: iso(deadline(6)),
    assignees: ['5'],
    category: 'regional',
    completed: false,
    recurrence: 'biweekly',
    dayOfWeek: dayOfWeekFrom(6),
    kpiType: 'links',
    kpiTarget: 900,
    channels: ['1', '3'],
    createdAt,
  },
  {
    id: '11',
    title: 'Региональный KPI-отчет',
    description: 'Оформить отчёт по достигнутым метрикам.',
    deadline: iso(deadline(9)),
    assignees: ['4'],
    category: 'regional',
    completed: false,
    recurrence: 'none',
    kpiType: 'links',
    kpiTarget: 1800,
    channels: ['2'],
    createdAt,
  },
  {
    id: '12',
    title: 'Региональные кампании: каждый месяц',
    description: 'Запускать кампании согласно медиаплану.',
    deadline: iso(deadline(14)),
    assignees: ['1'],
    category: 'regional',
    completed: false,
    recurrence: 'monthly',
    dayOfMonth: dayOfMonthFrom(14),
    kpiType: 'views',
    kpiTarget: 22000,
    channels: ['1', '2'],
    createdAt,
  },
  {
    id: '13',
    title: 'Региональная активность: квартальная',
    description: 'Подготовить контент и сценарии по сегментам.',
    deadline: iso(deadline(-2)),
    assignees: ['2'],
    category: 'regional',
    completed: false,
    recurrence: 'quarterly',
    monthOfQuarter: monthOfQuarterFrom(-2),
    dayOfQuarter: dayOfQuarterFrom(-2),
    kpiType: 'none',
    channels: ['5'],
    createdAt,
  },
  {
    id: '14',
    title: 'Региональная стратегия: годовая корректировка',
    description: 'Обновить позиционирование и цели на год.',
    deadline: iso(deadline(60)),
    assignees: ['1', '4'],
    category: 'regional',
    completed: false,
    recurrence: 'yearly',
    kpiType: 'views',
    kpiTarget: 80000,
    channels: ['1', '2', '5'],
    createdAt,
  },

  // PFO (7)
  {
    id: '15',
    title: 'ПФО: контент-сетка на неделю',
    description: 'Сформировать план публикаций по 3 площадкам.',
    deadline: iso(deadline(-2)),
    assignees: ['2'],
    category: 'pfo',
    completed: false,
    recurrence: 'none',
    kpiType: 'none',
    channels: ['1', '2'],
    createdAt,
  },
  {
    id: '16',
    title: 'ПФО: сценарии и тексты',
    description: 'Подготовить сценарии для постов и сторис.',
    deadline: iso(deadline(2)),
    assignees: ['4'],
    category: 'pfo',
    completed: false,
    recurrence: 'weekly',
    dayOfWeek: dayOfWeekFrom(2),
    kpiType: 'links',
    kpiTarget: 1500,
    channels: ['3'],
    createdAt,
  },
  {
    id: '17',
    title: 'ПФО: визуал раз в 2 недели',
    description: 'Сделать макеты для публикаций и адаптировать под форматы.',
    deadline: iso(deadline(7)),
    assignees: ['5'],
    category: 'pfo',
    completed: false,
    recurrence: 'biweekly',
    dayOfWeek: dayOfWeekFrom(7),
    kpiType: 'views',
    kpiTarget: 16000,
    channels: ['2', '3'],
    createdAt,
  },
  {
    id: '18',
    title: 'ПФО: ежемесячный KPI-отчет',
    description: 'Подвести итоги и отметить отклонения по целям.',
    deadline: iso(deadline(11)),
    assignees: ['2'],
    category: 'pfo',
    completed: false,
    recurrence: 'none',
    kpiType: 'views',
    kpiTarget: 25000,
    channels: ['1', '4'],
    createdAt,
  },
  {
    id: '19',
    title: 'ПФО: видеоролики (квартально)',
    description: 'Запустить видео-активность по квартальному плану.',
    deadline: iso(deadline(-1)),
    assignees: ['6'],
    category: 'pfo',
    completed: false,
    recurrence: 'quarterly',
    monthOfQuarter: monthOfQuarterFrom(-1),
    dayOfQuarter: dayOfQuarterFrom(-1),
    kpiType: 'views',
    kpiTarget: 70000,
    channels: ['4'],
    createdAt,
  },
  {
    id: '20',
    title: 'ПФО: каждый месяц — кампании',
    description: 'Подготовить и запустить кампанию согласно медиаплану.',
    deadline: iso(deadline(18)),
    assignees: ['1'],
    category: 'pfo',
    completed: false,
    recurrence: 'monthly',
    dayOfMonth: dayOfMonthFrom(18),
    kpiType: 'links',
    kpiTarget: 1900,
    channels: ['1', '2'],
    createdAt,
  },
  {
    id: '21',
    title: 'ПФО: пересмотр стратегии (годовой)',
    description: 'Обновить цели и KPI на следующий год.',
    deadline: iso(deadline(120)),
    assignees: ['1', '2', '4'],
    category: 'pfo',
    completed: false,
    recurrence: 'yearly',
    kpiType: 'none',
    channels: ['1', '2', '3', '4'],
    createdAt,
  },

  // SPK mailings (7)
  {
    id: '22',
    title: 'СПК: подготовка письма (разовая)',
    description: 'Собрать контент и отправить тестовую рассылку.',
    deadline: iso(deadline(-6)),
    assignees: ['3'],
    category: 'spk-mailings',
    completed: false,
    recurrence: 'none',
    kpiType: 'none',
    channels: ['5'],
    createdAt,
  },
  {
    id: '23',
    title: 'СПК: сценарии писем (еженедельно)',
    description: 'Писать тексты и готовить сценарии рассылок.',
    deadline: iso(deadline(1)),
    assignees: ['2'],
    category: 'spk-mailings',
    completed: false,
    recurrence: 'weekly',
    dayOfWeek: dayOfWeekFrom(1),
    kpiType: 'links',
    kpiTarget: 1200,
    channels: ['5'],
    createdAt,
  },
  {
    id: '24',
    title: 'СПК: дизайн писем (раз в 2 недели)',
    description: 'Сделать макеты писем и адаптировать под форматы.',
    deadline: iso(deadline(7)),
    assignees: ['5'],
    category: 'spk-mailings',
    completed: false,
    recurrence: 'biweekly',
    dayOfWeek: dayOfWeekFrom(7),
    kpiType: 'views',
    kpiTarget: 9000,
    channels: ['5'],
    createdAt,
  },
  {
    id: '25',
    title: 'СПК: ежемесячный запуск рассылок',
    description: 'Подготовить письма и запустить рассылку по базе.',
    deadline: iso(deadline(12)),
    assignees: ['3'],
    category: 'spk-mailings',
    completed: false,
    recurrence: 'monthly',
    dayOfMonth: dayOfMonthFrom(12),
    kpiType: 'links',
    kpiTarget: 2200,
    channels: ['5'],
    createdAt,
  },
  {
    id: '26',
    title: 'СПК: квартальная контент-активность',
    description: 'Развернуть сезонную кампанию с обновлением смысла и офферов.',
    deadline: iso(deadline(-1)),
    assignees: ['2'],
    category: 'spk-mailings',
    completed: false,
    recurrence: 'quarterly',
    monthOfQuarter: monthOfQuarterFrom(-1),
    dayOfQuarter: dayOfQuarterFrom(-1),
    kpiType: 'views',
    kpiTarget: 28000,
    channels: ['5'],
    createdAt,
  },
  {
    id: '27',
    title: 'СПК: годовое обновление коммуникации',
    description: 'Пересмотреть тональность и сегментацию базы.',
    deadline: iso(deadline(60)),
    assignees: ['1'],
    category: 'spk-mailings',
    completed: false,
    recurrence: 'yearly',
    kpiType: 'none',
    channels: ['5'],
    createdAt,
  },
  {
    id: '28',
    title: 'СПК: финальный отчёт по рассылкам',
    description: 'Подвести итоги и оформить план корректировок.',
    deadline: iso(deadline(18)),
    assignees: ['4'],
    category: 'spk-mailings',
    completed: false,
    recurrence: 'none',
    kpiType: 'links',
    kpiTarget: 1800,
    channels: ['5'],
    createdAt,
  },

  // Bloggers (7)
  {
    id: '29',
    title: 'Блогеры: подбор интеграций (разовая)',
    description: 'Подобрать блогеров и согласовать гипотезы размещений.',
    deadline: iso(deadline(-2)),
    assignees: ['6'],
    category: 'bloggers',
    completed: false,
    recurrence: 'none',
    kpiType: 'links',
    kpiTarget: 1600,
    channels: ['4'],
    createdAt,
  },
  {
    id: '30',
    title: 'Блогеры: еженедельный пост у партнеров',
    description: 'Подготовить тексты и отправить материалы партнерским аккаунтам.',
    deadline: iso(deadline(2)),
    assignees: ['4'],
    category: 'bloggers',
    completed: false,
    recurrence: 'weekly',
    dayOfWeek: dayOfWeekFrom(2),
    kpiType: 'views',
    kpiTarget: 18000,
    channels: ['2', '4'],
    createdAt,
  },
  {
    id: '31',
    title: 'Блогеры: визуал раз в 2 недели',
    description: 'Сделать креативы под размещения и адаптировать под формат.',
    deadline: iso(deadline(6)),
    assignees: ['5'],
    category: 'bloggers',
    completed: false,
    recurrence: 'biweekly',
    dayOfWeek: dayOfWeekFrom(6),
    kpiType: 'none',
    channels: ['3'],
    createdAt,
  },
  {
    id: '32',
    title: 'Блогеры: каждый месяц — пакет размещений',
    description: 'Собрать и подготовить пакет размещений на месяц.',
    deadline: iso(deadline(9)),
    assignees: ['6'],
    category: 'bloggers',
    completed: false,
    recurrence: 'monthly',
    dayOfMonth: dayOfMonthFrom(9),
    kpiType: 'views',
    kpiTarget: 32000,
    channels: ['4', '2'],
    createdAt,
  },
  {
    id: '33',
    title: 'Блогеры: отдельный сторис-комплект (разовая)',
    description: 'Подготовить сторис серию и согласовать сценарий.',
    deadline: iso(deadline(16)),
    assignees: ['4'],
    category: 'bloggers',
    completed: false,
    recurrence: 'none',
    kpiType: 'links',
    kpiTarget: 900,
    channels: ['3'],
    createdAt,
  },
  {
    id: '34',
    title: 'Блогеры: квартальная контент-активность',
    description: 'Запустить квартальную интеграцию с обновлением креативов.',
    deadline: iso(deadline(22)),
    assignees: ['5'],
    category: 'bloggers',
    completed: false,
    recurrence: 'quarterly',
    monthOfQuarter: monthOfQuarterFrom(22),
    dayOfQuarter: dayOfQuarterFrom(22),
    kpiType: 'views',
    kpiTarget: 65000,
    channels: ['3', '4'],
    createdAt,
  },
  {
    id: '35',
    title: 'Блогеры: годовая стратегия по интеграциям',
    description: 'Пересмотреть категории партнеров и KPI.',
    deadline: iso(deadline(55)),
    assignees: ['1'],
    category: 'bloggers',
    completed: false,
    recurrence: 'yearly',
    kpiType: 'none',
    channels: ['2', '4'],
    createdAt,
  },

  // Reports (7)
  {
    id: '36',
    title: 'Отчеты: еженедельная сверка KPI',
    description: 'Проверить показатели и отправить руководителю.',
    deadline: iso(deadline(-1)),
    assignees: ['4'],
    category: 'reports',
    completed: false,
    recurrence: 'none',
    kpiType: 'none',
    channels: ['1', '2'],
    createdAt,
  },
  {
    id: '37',
    title: 'Отчеты: сбор данных (еженедельно)',
    description: 'Собрать данные по всем каналам и подготовить черновик отчёта.',
    deadline: iso(deadline(3)),
    assignees: ['1'],
    category: 'reports',
    completed: false,
    recurrence: 'weekly',
    dayOfWeek: dayOfWeekFrom(3),
    kpiType: 'links',
    kpiTarget: 1500,
    channels: ['1', '2'],
    createdAt,
  },
  {
    id: '38',
    title: 'Отчеты: подготовка аналитики (раз в 2 недели)',
    description: 'Сделать аналитическую вставку и рекомендации.',
    deadline: iso(deadline(8)),
    assignees: ['4'],
    category: 'reports',
    completed: false,
    recurrence: 'biweekly',
    dayOfWeek: dayOfWeekFrom(8),
    kpiType: 'views',
    kpiTarget: 25000,
    channels: ['2'],
    createdAt,
  },
  {
    id: '39',
    title: 'Отчеты: ежемесячный свод',
    description: 'Сводный отчёт по месяцу и фиксация результатов.',
    deadline: iso(deadline(14)),
    assignees: ['3'],
    category: 'reports',
    completed: false,
    recurrence: 'monthly',
    dayOfMonth: dayOfMonthFrom(14),
    kpiType: 'none',
    channels: ['1', '2', '4'],
    createdAt,
  },
  {
    id: '40',
    title: 'Отчеты: квартальный обзор',
    description: 'Описать результаты, динамику и корректировки медиаплана.',
    deadline: iso(deadline(20)),
    assignees: ['2'],
    category: 'reports',
    completed: false,
    recurrence: 'quarterly',
    monthOfQuarter: monthOfQuarterFrom(20),
    dayOfQuarter: dayOfQuarterFrom(20),
    kpiType: 'links',
    kpiTarget: 3000,
    channels: ['1', '4'],
    createdAt,
  },
  {
    id: '41',
    title: 'Отчеты: отдельный отчет по кампании (разовая)',
    description: 'Собрать статистику по конкретной кампании и оформить выводы.',
    deadline: iso(deadline(33)),
    assignees: ['4'],
    category: 'reports',
    completed: false,
    recurrence: 'none',
    kpiType: 'views',
    kpiTarget: 42000,
    channels: ['1'],
    createdAt,
  },
  {
    id: '42',
    title: 'Отчеты: годовая ретроспектива',
    description: 'Полная ретроспектива и план на следующий год.',
    deadline: iso(deadline(120)),
    assignees: ['1', '2'],
    category: 'reports',
    completed: false,
    recurrence: 'yearly',
    kpiType: 'none',
    channels: ['1', '2', '4'],
    createdAt,
  },
];

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (key === STORAGE_KEYS.USERS && Array.isArray(parsed)) {
        return parsed.map((row) => normalizeUserWire(row as Record<string, unknown>)) as T;
      }
      // Ensure backward compatibility for tasks
      if (key === STORAGE_KEYS.TASKS && Array.isArray(parsed)) {
        const normalized = parsed.map((task: any) => ({
          ...task,
          channels: task.channels || [],
          kpiType: task.kpiType || 'none',
          completed: Boolean(task.completed),
          completedAt: task.completedAt,
        }));
        return normalized as T;
      }
      if (key === STORAGE_KEYS.MEETINGS && Array.isArray(parsed)) {
        return parsed.map((row) => normalizeMeetingWire(row as Record<string, unknown>)) as T;
      }
      if (key === STORAGE_KEYS.STAFF_BLOCKS && Array.isArray(parsed)) {
        return ensureStaffBlockHierarchy(
          parsed.map((row) => normalizeStaffBlockWire(row as Record<string, unknown>)),
        ) as T;
      }
      if (key === STORAGE_KEYS.JOB_POSITIONS && Array.isArray(parsed)) {
        let blocksForEnsure: StaffBlock[] = initialStaffBlocks;
        try {
          const sbRaw = localStorage.getItem(STORAGE_KEYS.STAFF_BLOCKS);
          if (sbRaw) {
            const sbParsed = JSON.parse(sbRaw);
            if (Array.isArray(sbParsed)) {
              blocksForEnsure = ensureStaffBlockHierarchy(
                sbParsed.map((row) => normalizeStaffBlockWire(row as Record<string, unknown>)),
              );
            }
          }
        } catch {
          blocksForEnsure = ensureStaffBlockHierarchy(blocksForEnsure);
        }
        let jp = parsed.map((row) => normalizeJobPositionWire(row as Record<string, unknown>));
        jp = ensureLeadershipJobPosition(
          jp,
          blocksForEnsure,
          blocksForEnsure[0]?.createdAt ?? new Date().toISOString(),
        );
        return jp as T;
      }
      if (key === STORAGE_KEYS.CHANNELS && Array.isArray(parsed)) {
        return parsed.map((row) => normalizeChannelWire(row as Record<string, unknown>)) as T;
      }
      return parsed;
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

function loadCompletedTasksLifetimeInitial(): number {
  try {
    const rawLifetime = localStorage.getItem(STORAGE_KEYS.COMPLETED_TASKS_LIFETIME);
    if (rawLifetime !== null) {
      const n = JSON.parse(rawLifetime) as unknown;
      if (typeof n === 'number' && Number.isFinite(n) && n >= 0) return Math.floor(n);
    }
  } catch {
    /* ignore */
  }
  try {
    const tasksRaw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!tasksRaw) return 0;
    const arr = JSON.parse(tasksRaw) as unknown;
    if (!Array.isArray(arr)) return 0;
    return arr.filter((t) => t && typeof t === 'object' && Boolean((t as Task).completed)).length;
  } catch {
    return 0;
  }
}

function loadSessionUser(): User | null {
  try {
    const ss = sessionStorage.getItem(SESSION_USER_KEY);
    if (ss) {
      const u = JSON.parse(ss) as User;
      return migrateServiceUserId(u);
    }
    const ls = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (ls) {
      const u = JSON.parse(ls) as User;
      if (u.id === SERVICE_USER_ID) return migrateServiceUserId(u);
      return migrateServiceUserId(u);
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Старый сервисный аккаунт был id=7; теперь 7 — Говорик, сервис — id 9 */
function migrateServiceUserId(u: User): User {
  const raw = { ...u } as unknown as Record<string, unknown>;
  if (u.id === '7' && u.name?.includes('Сервис')) {
    raw.id = SERVICE_USER_ID;
  }
  return normalizeUserWire(raw);
}

const CONTENT_SOCIAL_PLATFORMS: ContentSocialPlatform[] = ['vk', 'max', 'telegram', 'ok'];

function normalizeTaskWire(raw: Record<string, unknown>): Task {
  const spRaw = raw.socialPlatform;
  const socialPlatform =
    typeof spRaw === 'string' && CONTENT_SOCIAL_PLATFORMS.includes(spRaw as ContentSocialPlatform)
      ? (spRaw as ContentSocialPlatform)
      : undefined;

  return {
    ...(raw as unknown as Task),
    deadline: typeof raw.deadline === 'string' && raw.deadline ? raw.deadline : undefined,
    channels: Array.isArray(raw.channels) ? (raw.channels as string[]) : [],
    kpiType: (raw.kpiType as Task['kpiType']) || 'none',
    completed: Boolean(raw.completed),
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : undefined,
    socialPlatform,
  };
}

function normalizeMeetingWire(raw: Record<string, unknown>): Meeting {
  const startsAt = typeof raw.startsAt === 'string' ? raw.startsAt : new Date().toISOString();
  let endsAt = typeof raw.endsAt === 'string' ? raw.endsAt : '';
  if (!endsAt) {
    endsAt = new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();
  }
  const prep = typeof raw.preparation === 'string' ? raw.preparation.trim() : '';
  return {
    id: String(raw.id ?? `${Date.now()}`),
    title: typeof raw.title === 'string' ? raw.title : 'Встреча',
    startsAt,
    endsAt,
    location: typeof raw.location === 'string' ? raw.location : '',
    preparation: prep || undefined,
    participantIds: Array.isArray(raw.participantIds) ? (raw.participantIds as string[]) : [],
    createdBy: typeof raw.createdBy === 'string' ? raw.createdBy : '',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
  };
}

// Ранее здесь удалялись "demo"-задачи (id 1..42) при загрузке из Supabase.
// Это приводило к потере данных пользователей, если они редактировали стартовые demo-задачи
// и синхронизировали их обратно на сервер. Поэтому сейчас фильтрация отключена.
function stripDemoTasks(tasks: Task[]): Task[] {
  return tasks;
}

/** Имя без учёта регистра (кириллица); пароль — посимвольно как задан */
function credentialsMatch(user: User, nameInput: string, passwordInput: string): boolean {
  const nameOk =
    user.name.trim().localeCompare(nameInput.trim(), 'ru', { sensitivity: 'base' }) === 0;
  const passOk =
    user.password === passwordInput ||
    user.password.trim() === passwordInput.trim();
  return nameOk && passOk;
}

function buildStatePayloadFromRemote(data: RemoteStatePayload): RemoteStatePayload {
  const u = data.users;
  let usersNext: User[];
  if (!Array.isArray(u)) {
    usersNext = [...initialUsers];
  } else if (u.length === 0) {
    // пустой payload в Supabase — иначе вход невозможен, пока кто-то не засидит users вручную
    usersNext = [...initialUsers];
  } else {
    usersNext = u.map((row) => normalizeUserWire(row as unknown as Record<string, unknown>));
  }

  const tasksRaw = Array.isArray(data.tasks) ? data.tasks : [];
  let tasksNext = tasksRaw.map((t) => normalizeTaskWire(t as unknown as Record<string, unknown>));
  // Если на сервере пока пусто — показываем локальный seed.
  if (tasksNext.length === 0) tasksNext = [...initialTasks];

  const channelsNext =
    Array.isArray(data.channels) && data.channels.length > 0
      ? data.channels.map((c) => normalizeChannelWire(c as unknown as Record<string, unknown>))
      : initialChannels;

  const meetingsNext = Array.isArray(data.meetings)
    ? data.meetings.map((m) => normalizeMeetingWire(m as unknown as Record<string, unknown>))
    : [];

  let staffBlocks = Array.isArray(data.staffBlocks)
    ? data.staffBlocks.map((s) => normalizeStaffBlockWire(s as unknown as Record<string, unknown>))
    : [];
  if (staffBlocks.length === 0) staffBlocks = [...initialStaffBlocks];
  staffBlocks = ensureStaffBlockHierarchy(staffBlocks);

  let jobPositions = Array.isArray(data.jobPositions)
    ? data.jobPositions.map((p) => normalizeJobPositionWire(p as unknown as Record<string, unknown>))
    : [];
  if (jobPositions.length === 0) jobPositions = [...initialJobPositions];
  jobPositions = ensureLeadershipJobPosition(
    jobPositions,
    staffBlocks,
    staffBlocks[0]?.createdAt ?? new Date().toISOString(),
  );

  const notificationsNext = Array.isArray(data.notificationsShown) ? data.notificationsShown : [];
  const pushNext = typeof data.pushNotificationsEnabled === 'boolean' ? data.pushNotificationsEnabled : false;

  const rawLt = data.completedTasksLifetimeTotal;
  const fromRemote =
    typeof rawLt === 'number' && Number.isFinite(rawLt) && rawLt >= 0 ? Math.floor(rawLt) : 0;
  const completedInTasks = tasksNext.filter((t) => t.completed).length;
  const completedTasksLifetimeTotal = Math.max(fromRemote, completedInTasks);

  return {
    users: usersNext,
    tasks: tasksNext,
    channels: channelsNext,
    meetings: meetingsNext,
    staffBlocks,
    jobPositions,
    notificationsShown: notificationsNext,
    pushNotificationsEnabled: pushNext,
    completedTasksLifetimeTotal,
  };
}

function addRecurrenceStep(d: Date, recurrence: Task['recurrence']): Date {
  switch (recurrence) {
    case 'weekly':
      return addWeeks(d, 1);
    case 'biweekly':
      return addWeeks(d, 2);
    case 'monthly':
      return addMonths(d, 1);
    case 'quarterly':
      return addQuarters(d, 1);
    case 'yearly':
      return addYears(d, 1);
    default:
      return d;
  }
}

function subRecurrenceStep(d: Date, recurrence: Task['recurrence']): Date {
  switch (recurrence) {
    case 'weekly':
      return addWeeks(d, -1);
    case 'biweekly':
      return addWeeks(d, -2);
    case 'monthly':
      return addMonths(d, -1);
    case 'quarterly':
      return addQuarters(d, -1);
    case 'yearly':
      return addYears(d, -1);
    default:
      return d;
  }
}

function taskOccursOnCalendarDay(task: Task, targetDate: Date): boolean {
  if (!task.deadline) return false;
  const day = startOfDay(targetDate);
  let cur = startOfDay(new Date(task.deadline));
  if (task.recurrence === 'none') {
    if (isSameDay(cur, day)) return true;
    // Просроченные разовые задачи остаются на календаре в каждый следующий день, пока не выполнены
    if (!task.completed && isAfter(day, cur)) return true;
    return false;
  }
  let g = 0;
  while (isAfter(cur, day) && g++ < 400) {
    cur = startOfDay(subRecurrenceStep(cur, task.recurrence));
  }
  g = 0;
  while (isBefore(cur, day) && g++ < 400) {
    cur = startOfDay(addRecurrenceStep(cur, task.recurrence));
  }
  return isSameDay(cur, day);
}

export function useStore() {
  const [users, setUsers] = useState<User[]>(() => loadFromStorage(STORAGE_KEYS.USERS, initialUsers));
  const [tasks, setTasks] = useState<Task[]>(() => loadFromStorage(STORAGE_KEYS.TASKS, [] as Task[]));
  const [completedTasksLifetimeTotal, setCompletedTasksLifetimeTotal] = useState<number>(() =>
    loadCompletedTasksLifetimeInitial(),
  );
  const [channels, setChannels] = useState<CommunicationChannel[]>(() => loadFromStorage(STORAGE_KEYS.CHANNELS, initialChannels));
  const [meetings, setMeetings] = useState<Meeting[]>(() => loadFromStorage(STORAGE_KEYS.MEETINGS, [] as Meeting[]));
  const [staffBlocks, setStaffBlocks] = useState<StaffBlock[]>(() =>
    loadFromStorage(STORAGE_KEYS.STAFF_BLOCKS, initialStaffBlocks),
  );
  const [jobPositions, setJobPositions] = useState<JobPosition[]>(() =>
    loadFromStorage(STORAGE_KEYS.JOB_POSITIONS, initialJobPositions),
  );
  const [notificationsShown, setNotificationsShown] = useState<Set<string>>(() => {
    const stored = loadFromStorage<string[]>(STORAGE_KEYS.NOTIFICATIONS_SHOWN, []);
    return new Set(stored);
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => loadSessionUser());
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState<boolean>(() =>
    loadFromStorage<boolean>(STORAGE_KEYS.PUSH_NOTIFICATIONS_ENABLED, false)
  );
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('off');

  const lastWrittenRef = useRef<string | null>(null);
  const remotePersistTailRef = useRef(Promise.resolve());
  const latestRemotePayloadRef = useRef<RemoteStatePayload | null>(null);
  const cloudErrorResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Пока false — не отправляем PUT, чтобы не затереть БД старым localStorage до ответа GET */
  const remoteHydratedRef = useRef(!isRemoteSyncConfigured());
  /** Защищаемся от одновременных pull-проходов */
  const remotePullInFlightRef = useRef(false);

  const usersRef = useRef(users);
  usersRef.current = users;

  /** Если в Supabase пустой users, сайт подставляет демо — их нужно один раз записать, чтобы мобильное приложение и БД совпадали. */
  const persistSeededPayloadIfServerWasEmpty = useCallback(async (raw: RemoteStatePayload, payload: RemoteStatePayload) => {
    if (!isRemoteSyncConfigured()) return;
    if (raw.users.length > 0) return;
    if (payload.users.length === 0) return;
    try {
      await saveRemoteState(payload);
    } catch (e) {
      console.error(e);
      toast.error('Не удалось записать пользователей в Supabase. Проверьте сеть и попробуйте обновить страницу.');
    }
  }, []);

  const pullFromServer = useCallback(async (): Promise<boolean> => {
    if (!isRemoteSyncConfigured()) return false;
    setCloudSyncStatus('loading');
    try {
      const raw = await fetchRemoteState();
      const payload = buildStatePayloadFromRemote(raw);
      await persistSeededPayloadIfServerWasEmpty(raw, payload);
      lastWrittenRef.current = snapshotState(payload);
      setUsers(payload.users);
      setTasks(payload.tasks);
      setChannels(payload.channels);
      setMeetings(payload.meetings);
      setStaffBlocks(payload.staffBlocks);
      setJobPositions(payload.jobPositions);
      setNotificationsShown(new Set(payload.notificationsShown));
      setPushNotificationsEnabled(payload.pushNotificationsEnabled);
      setCompletedTasksLifetimeTotal(payload.completedTasksLifetimeTotal);
      // При серверной синхронизации права и пароль текущего пользователя всегда берём из payload.
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const fresh = payload.users.find((u) => u.id === prev.id);
        return fresh ?? null;
      });
      setCloudSyncStatus('ready');
      return true;
    } catch (e) {
      console.error(e);
      setCloudSyncStatus('error');
      toast.error('Не удалось загрузить данные из Supabase. Показаны локальные данные.');
      return false;
    } finally {
      remoteHydratedRef.current = true;
    }
  }, [persistSeededPayloadIfServerWasEmpty]);

  /** Перед проверкой пароля подтягиваем пользователей с Supabase — иначе на новом устройстве остаётся устаревший локальный список */
  const attemptLogin = useCallback(
    async (name: string, password: string): Promise<User | null> => {
      const trimmed = name.trim();
      try {
        if (isRemoteSyncConfigured()) {
          setCloudSyncStatus('loading');
          const raw = await fetchRemoteState();
          const payload = buildStatePayloadFromRemote(raw);
          await persistSeededPayloadIfServerWasEmpty(raw, payload);
          lastWrittenRef.current = snapshotState(payload);
          remoteHydratedRef.current = true;
          setUsers(payload.users);
          setTasks(payload.tasks);
          setChannels(payload.channels);
          setMeetings(payload.meetings);
          setStaffBlocks(payload.staffBlocks);
          setJobPositions(payload.jobPositions);
          setNotificationsShown(new Set(payload.notificationsShown));
          setPushNotificationsEnabled(payload.pushNotificationsEnabled);
          setCompletedTasksLifetimeTotal(payload.completedTasksLifetimeTotal);
          setCloudSyncStatus('ready');
          return payload.users.find((u) => credentialsMatch(u, trimmed, password)) ?? null;
        }
      } catch (e) {
        console.error(e);
        setCloudSyncStatus('error');
        toast.error('Не удалось загрузить данные с сервера. Вход без сервера отключён.');
        return null;
      }
      return usersRef.current.find((u) => credentialsMatch(u, trimmed, password)) ?? null;
    },
    [persistSeededPayloadIfServerWasEmpty],
  );

  useEffect(() => {
    if (!currentUser) {
      setCloudSyncStatus('off');
      return;
    }
    if (!isRemoteSyncConfigured()) {
      setCloudSyncStatus('off');
      return;
    }
    remoteHydratedRef.current = false;
    void pullFromServer();
  }, [currentUser?.id, pullFromServer]);

  // Периодически подтягиваем серверное состояние, чтобы несколько устройств не
  // перезаписывали друг друга "последним payload".
  useEffect(() => {
    if (!currentUser) return;
    if (!isRemoteSyncConfigured()) return;

    const intervalMs = 30_000;
    const id = setInterval(() => {
      if (remotePullInFlightRef.current) return;
      remotePullInFlightRef.current = true;
      // Не сбрасываем remoteHydratedRef — иначе во время pull блокируется запись на сервер
      void pullFromServer()
        .catch(() => {
          /* pullFromServer сам покажет тост/статус */
        })
        .finally(() => {
          remotePullInFlightRef.current = false;
        });
    }, intervalMs);

    return () => clearInterval(id);
  }, [currentUser?.id, pullFromServer]);

  useEffect(() => {
    return () => {
      if (cloudErrorResetRef.current) clearTimeout(cloudErrorResetRef.current);
    };
  }, []);

  // Локальный кэш для любого залогиненного пользователя (офлайн и без API-ключа)
  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }, [tasks, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(STORAGE_KEYS.CHANNELS, JSON.stringify(channels));
  }, [channels, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(STORAGE_KEYS.MEETINGS, JSON.stringify(meetings));
  }, [meetings, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(STORAGE_KEYS.STAFF_BLOCKS, JSON.stringify(staffBlocks));
  }, [staffBlocks, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(STORAGE_KEYS.JOB_POSITIONS, JSON.stringify(jobPositions));
  }, [jobPositions, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(STORAGE_KEYS.COMPLETED_TASKS_LIFETIME, JSON.stringify(completedTasksLifetimeTotal));
  }, [completedTasksLifetimeTotal, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_SHOWN, JSON.stringify([...notificationsShown]));
  }, [notificationsShown, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(STORAGE_KEYS.PUSH_NOTIFICATIONS_ENABLED, JSON.stringify(pushNotificationsEnabled));
  }, [pushNotificationsEnabled, currentUser]);

  // Актуальный снимок для дозаписи при уходе со страницы
  useEffect(() => {
    if (!currentUser) {
      latestRemotePayloadRef.current = null;
      return;
    }
    latestRemotePayloadRef.current = {
      users,
      tasks,
      channels,
      meetings,
      staffBlocks,
      jobPositions,
      notificationsShown: [...notificationsShown],
      pushNotificationsEnabled,
      completedTasksLifetimeTotal,
    };
  }, [
    users,
    tasks,
    channels,
    meetings,
    staffBlocks,
    jobPositions,
    notificationsShown,
    pushNotificationsEnabled,
    completedTasksLifetimeTotal,
    currentUser,
  ]);

  useEffect(() => {
    if (!isRemoteSyncConfigured()) return;

    const flushOnLeave = () => {
      if (document.visibilityState !== 'hidden') return;
      if (!remoteHydratedRef.current) return;
      const payload = latestRemotePayloadRef.current;
      if (!payload) return;
      void saveRemoteState(payload).catch(() => {
        /* офлайн / вкладка закрывается — повтор при следующем визите */
      });
    };

    document.addEventListener('visibilitychange', flushOnLeave);
    window.addEventListener('pagehide', flushOnLeave);
    return () => {
      document.removeEventListener('visibilitychange', flushOnLeave);
      window.removeEventListener('pagehide', flushOnLeave);
    };
  }, []);

  // Облачное состояние (Supabase) — сохраняем сразу после изменения, очередь гарантирует порядок PUT
  useEffect(() => {
    if (!currentUser) return;
    if (!isRemoteSyncConfigured()) return;
    if (!remoteHydratedRef.current) return;

    const payload: RemoteStatePayload = {
      users,
      tasks,
      channels,
      meetings,
      staffBlocks,
      jobPositions,
      notificationsShown: [...notificationsShown],
      pushNotificationsEnabled,
      completedTasksLifetimeTotal,
    };
    const snap = snapshotState(payload);
    if (lastWrittenRef.current === snap) return;

    setCloudSyncStatus((s) => (s === 'loading' || s === 'off' ? s : 'saving'));

    remotePersistTailRef.current = remotePersistTailRef.current
      .then(() => saveRemoteState(payload))
      .then(() => {
        lastWrittenRef.current = snap;
        setCloudSyncStatus((s) => (s === 'loading' ? 'loading' : 'ready'));
      })
      .catch((err) => {
        console.error(err);
        setCloudSyncStatus('error');
        if (cloudErrorResetRef.current) clearTimeout(cloudErrorResetRef.current);
        cloudErrorResetRef.current = setTimeout(() => {
          cloudErrorResetRef.current = null;
          setCloudSyncStatus((s) => (s === 'loading' ? 'loading' : 'ready'));
        }, 6000);
        toast.error('Не удалось сохранить в Supabase');
      });
  }, [
    users,
    tasks,
    channels,
    meetings,
    staffBlocks,
    jobPositions,
    notificationsShown,
    pushNotificationsEnabled,
    completedTasksLifetimeTotal,
    currentUser,
  ]);

  useEffect(() => {
    if (!currentUser) {
      sessionStorage.removeItem(SESSION_USER_KEY);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      return;
    }
    if (isServiceAccount(currentUser)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      sessionStorage.removeItem(SESSION_USER_KEY);
    } else {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(currentUser));
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  // Удаление из архива через месяц после дедлайна и после отметки «выполнено» (счётчик завершений не уменьшается).
  useEffect(() => {
    const purgeArchived = () => {
      setTasks((prev) => {
        const now = new Date();
        return prev.filter((t) => {
          if (!t.completed) return true;
          return !isAfter(now, archivedTaskPurgeAt(t));
        });
      });
    };
    purgeArchived();
    const id = setInterval(purgeArchived, 60_000);
    return () => clearInterval(id);
  }, []);

  const showReminderNotification = (title: string, description: string, notificationKey: string) => {
    // Уведомления через SW: отправляем сообщение в worker, а он вызывает showNotification.
    // Если SW недоступен — откатываемся на стандартный Notification.
    const canUseNotifications =
      typeof Notification !== 'undefined' && Notification.permission === 'granted';

    if (!pushNotificationsEnabled) return;
    if (!canUseNotifications) return;

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.ready
        .then((reg) => {
          if (reg && reg.active) {
            reg.active.postMessage({
              type: 'SHOW_NOTIFICATION',
              payload: { title, body: description, tag: notificationKey },
            });
            return;
          }

          // If not active yet, fallback to direct notification.
          // eslint-disable-next-line no-new
          new Notification(title, { body: description, tag: notificationKey });
        })
        .catch(() => {
          // eslint-disable-next-line no-new
          new Notification(title, { body: description, tag: notificationKey });
        });
      return;
    }

    // eslint-disable-next-line no-new
    new Notification(title, { body: description, tag: notificationKey });
  };

  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      
      tasks.forEach(task => {
        if (task.completed) return;
        if (!task.deadline) return;
        
        const deadline = new Date(task.deadline);
        const hoursUntilDeadline = differenceInHours(deadline, now);
        
        const intervals = [24, 12, 1];
        
        intervals.forEach(interval => {
          const notificationKey = `${task.id}-${interval}h`;
          
          if (hoursUntilDeadline <= interval && hoursUntilDeadline > 0 && !notificationsShown.has(notificationKey)) {
            setNotificationsShown((prev) => new Set([...prev, notificationKey]));

            const hoursText = interval === 1 ? 'час' : interval < 5 ? 'часа' : 'часов';
            const description = `До дедлайна осталось ${interval} ${hoursText}`;
            const title = `Напоминание: ${task.title}`;
            const canPush =
              pushNotificationsEnabled &&
              typeof Notification !== 'undefined' &&
              Notification.permission === 'granted';

            if (canPush) {
              showReminderNotification(title, description, notificationKey);
            } else {
              toast.warning(title, {
                description,
                duration: 60_000,
                closeButton: true,
              });
            }
          }
        });
      });
    };
    
    checkNotifications();
    const intervalId = setInterval(checkNotifications, 60000);
    
    return () => clearInterval(intervalId);
  }, [tasks, notificationsShown, pushNotificationsEnabled]);

  const requestPushNotificationsPermission = async () => {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') {
      setPushNotificationsEnabled(true);
      return true;
    }
    if (Notification.permission === 'denied') {
      setPushNotificationsEnabled(false);
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const enabled = permission === 'granted';
      setPushNotificationsEnabled(enabled);
      return enabled;
    } catch {
      setPushNotificationsEnabled(false);
      return false;
    }
  };

  const addUser = (user: Omit<User, 'id' | 'createdAt'>) => {
    const newUser = normalizeUserWire({
      ...user,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    } as unknown as Record<string, unknown>);
    setUsers((prev) => [...prev, newUser]);
    return newUser;
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? normalizeUserWire({ ...u, ...updates } as unknown as Record<string, unknown>) : u,
      ),
    );
    setCurrentUser((prev) => {
      if (!prev || prev.id !== userId) return prev;
      return normalizeUserWire({ ...prev, ...updates } as unknown as Record<string, unknown>);
    });
  };

  const deleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setTasks((prev) =>
      prev.map((t) =>
        t.assignees.includes(userId) ? { ...t, assignees: t.assignees.filter((id) => id !== userId) } : t,
      ),
    );
    setMeetings((prev) =>
      prev.map((m) =>
        m.participantIds.includes(userId)
          ? { ...m, participantIds: m.participantIds.filter((id) => id !== userId) }
          : m,
      ),
    );
    setStaffBlocks((prev) =>
      prev.map((b) => {
        const extra = b.taskVisibilityExtraUserIds ?? [];
        if (!extra.includes(userId)) return b;
        return { ...b, taskVisibilityExtraUserIds: extra.filter((id) => id !== userId) };
      }),
    );
    setCurrentUser((prev) => (prev?.id === userId ? null : prev));
  };

  const addChannel = (channel: Omit<CommunicationChannel, 'id' | 'createdAt'>) => {
    const newChannel: CommunicationChannel = normalizeChannelWire({
      ...channel,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    } as unknown as Record<string, unknown>);
    setChannels((prev) => [...prev, newChannel]);
    return newChannel;
  };

  const updateChannel = (channelId: string, updates: Partial<CommunicationChannel>) => {
    setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, ...updates } : c)));
  };

  const deleteChannel = (channelId: string) => {
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
    setTasks((prev) =>
      prev.map((t) =>
        t.channels?.includes(channelId)
          ? { ...t, channels: (t.channels ?? []).filter((id) => id !== channelId) }
          : t,
      ),
    );
  };

  const addTask = (task: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, newTask]);
    return newTask;
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks((prev) => {
      const t = prev.find((x) => x.id === taskId);
      if (!t) return prev;
      const merged = { ...t, ...updates };
      const was = Boolean(t.completed);
      const now = Boolean(merged.completed);
      const d = !was && now ? 1 : was && !now ? -1 : 0;
      if (d !== 0) {
        queueMicrotask(() => {
          setCompletedTasksLifetimeTotal((c) => Math.max(0, c + d));
        });
      }
      return prev.map((x) => (x.id === taskId ? merged : x));
    });
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const addMeeting = (input: Omit<Meeting, 'id' | 'createdAt' | 'createdBy'>) => {
    if (!currentUser) return null;
    const prep = input.preparation?.trim();
    const newMeeting: Meeting = {
      ...input,
      location: input.location ?? '',
      preparation: prep || undefined,
      participantIds: Array.isArray(input.participantIds) ? input.participantIds : [],
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
    };
    setMeetings((prev) => [...prev, newMeeting]);
    return newMeeting;
  };

  const updateMeeting = (meetingId: string, updates: Partial<Meeting>) => {
    setMeetings((prev) =>
      prev.map((m) => {
        if (m.id !== meetingId) return m;
        const merged = { ...m, ...updates };
        if (typeof merged.preparation === 'string' && !merged.preparation.trim()) {
          merged.preparation = undefined;
        }
        return merged;
      }),
    );
  };

  const deleteMeeting = (meetingId: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
  };

  const addStaffBlock = (name: string, parentBlockId: string | null = null) => {
    const row = normalizeStaffBlockWire({
      id: `blk-${Date.now()}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      parentBlockId,
      taskVisibility: 'block_only',
      taskVisibilityExtraUserIds: [],
    });
    setStaffBlocks((prev) => [...prev, row]);
    return row;
  };

  const updateStaffBlock = (blockId: string, updates: Partial<Omit<StaffBlock, 'id' | 'createdAt'>>) => {
    setStaffBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, ...updates } : b)),
    );
  };

  const deleteStaffBlock = (blockId: string): boolean => {
    if (staffBlocks.some((b) => b.parentBlockId === blockId)) {
      toast.error('Сначала удалите или перенесите подблоки');
      return false;
    }
    if (users.some((u) => u.blockId === blockId)) {
      toast.error('Нельзя удалить блок: есть сотрудники');
      return false;
    }
    if (jobPositions.some((p) => p.blockId === blockId)) {
      toast.error('Сначала удалите должности в этом блоке');
      return false;
    }
    setStaffBlocks((prev) => prev.filter((b) => b.id !== blockId));
    return true;
  };

  const addJobPosition = (input: Omit<JobPosition, 'id' | 'createdAt'>) => {
    const row: JobPosition = {
      ...input,
      id: `pos-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setJobPositions((prev) => [...prev, row]);
    return row;
  };

  const updateJobPosition = (positionId: string, updates: Partial<Omit<JobPosition, 'id' | 'createdAt'>>) => {
    setJobPositions((prev) => prev.map((p) => (p.id === positionId ? { ...p, ...updates } : p)));
  };

  const deleteJobPosition = (positionId: string): boolean => {
    if (users.some((u) => u.positionId === positionId)) {
      toast.error('Нельзя удалить должность: назначена сотрудникам');
      return false;
    }
    setJobPositions((prev) => prev.filter((p) => p.id !== positionId));
    return true;
  };

  const getTasksForDate = (date: Date) => {
    const targetDate = startOfDay(date);
    const filtered = tasks.filter(task => {
      if (task.completed) return false;
      if (!task.deadline) return true;

      const taskDeadline = startOfDay(new Date(task.deadline));
      
      if (task.recurrence === 'none') {
        // Разовая задача остаётся в медиаплане после дедлайна, пока не отмечена выполненной (просрочка подсвечивается в карточке)
        return true;
      }
      
      let currentDeadline = taskDeadline;
      const maxIterations = 100;
      let iterations = 0;
      
      while (isBefore(currentDeadline, targetDate) && iterations < maxIterations) {
        iterations++;
        switch (task.recurrence) {
          case 'weekly':
            currentDeadline = addWeeks(currentDeadline, 1);
            break;
          case 'biweekly':
            currentDeadline = addWeeks(currentDeadline, 2);
            break;
          case 'monthly':
            currentDeadline = addMonths(currentDeadline, 1);
            break;
          case 'quarterly':
            currentDeadline = addQuarters(currentDeadline, 1);
            break;
          case 'yearly':
            currentDeadline = addYears(currentDeadline, 1);
            break;
        }
      }
      
      return !isAfter(targetDate, currentDeadline);
    });

    // Сортируем по дедлайну: от самого раннего к самому позднему.
    // Это гарантирует стабильный порядок на экране и при перезагрузке.
    return filtered.sort((a, b) => {
      if (!a.deadline && !b.deadline) return a.title.localeCompare(b.title, 'ru');
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      const ta = new Date(a.deadline).getTime();
      const tb = new Date(b.deadline).getTime();
      if (ta !== tb) return ta - tb;
      // Техническая стабильность (если дедлайны совпали)
      return a.title.localeCompare(b.title, 'ru');
    });
  };

  /** Календарь: задачи с дедлайном/вхождением ровно на выбранный день, в том числе выполненные; удалённые из списка не попадают */
  const getCalendarTasksForDate = (date: Date) => {
    const filtered = tasks.filter((task) => taskOccursOnCalendarDay(task, date));
    return filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (!a.deadline && !b.deadline) return a.title.localeCompare(b.title, 'ru');
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      const ta = new Date(a.deadline).getTime();
      const tb = new Date(b.deadline).getTime();
      if (ta !== tb) return ta - tb;
      return a.title.localeCompare(b.title, 'ru');
    });
  };

  return {
    users,
    tasks,
    completedTasksLifetimeTotal,
    channels,
    meetings,
    staffBlocks,
    jobPositions,
    addUser,
    updateUser,
    deleteUser,
    addChannel,
    updateChannel,
    deleteChannel,
    addTask,
    updateTask,
    deleteTask,
    getTasksForDate,
    getCalendarTasksForDate,
    addStaffBlock,
    updateStaffBlock,
    deleteStaffBlock,
    addJobPosition,
    updateJobPosition,
    deleteJobPosition,
    addMeeting,
    updateMeeting,
    deleteMeeting,
    attemptLogin,
    currentUser,
    setCurrentUser,
    requestPushNotificationsPermission,
    pushNotificationsEnabled,
    cloudSyncStatus,
    pullFromServer,
  };
}