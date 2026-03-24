import { useState, useEffect, useRef, useCallback } from 'react';
import { User, Task, CommunicationChannel } from './types';
import { addDays, addWeeks, addMonths, addQuarters, addYears, isBefore, isAfter, startOfDay, differenceInHours } from 'date-fns';
import { toast } from 'sonner';
import { isServiceAccount, SERVICE_USER_ID } from './constants/serviceAccount';
import {
  fetchRemoteState,
  saveRemoteState,
  isRemoteSyncConfigured,
  snapshotState,
  type RemoteStatePayload,
} from './api/backend';

// Локальное хранилище данных
const STORAGE_KEYS = {
  USERS: 'mediaplanning_users',
  TASKS: 'mediaplanning_tasks',
  CHANNELS: 'mediaplanning_channels',
  NOTIFICATIONS_SHOWN: 'mediaplanning_notifications_shown',
  CURRENT_USER: 'mediaplanning_current_user',
  PUSH_NOTIFICATIONS_ENABLED: 'mediaplanning_push_notifications_enabled',
};

const SESSION_USER_KEY = 'mediaplanning_session_user';

// Начальные пользователи (id 1–8 — команда, 9 — сервисный аккаунт для сохранения в localStorage)
const initialUsers: User[] = [
  {
    id: '1',
    name: 'Капустин Родион',
    role: 'senior-smm-specialist',
    password: 'demo1',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Ермакова Виктория',
    role: 'smm-specialist',
    password: 'demo2',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Поздеева Анжела',
    role: 'editor',
    password: 'demo3',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Филатова Юлиана',
    role: 'copywriter',
    password: 'demo4',
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Асадуллин Наиль',
    role: 'designer',
    password: 'demo5',
    createdAt: new Date().toISOString(),
  },
  {
    id: '6',
    name: 'Валеев Тимур',
    role: 'videographer',
    password: 'demo6',
    createdAt: new Date().toISOString(),
  },
  {
    id: '7',
    name: 'Говорик Екатерина',
    role: 'smm-specialist',
    password: 'demo7',
    createdAt: new Date().toISOString(),
  },
  {
    id: '8',
    name: 'Антуганова Анна',
    role: 'copywriter',
    password: 'demo8',
    createdAt: new Date().toISOString(),
  },
  {
    id: SERVICE_USER_ID,
    name: 'Сервисный аккаунт',
    role: 'editor',
    password: 'service2024',
    createdAt: new Date().toISOString(),
  },
];

// Начальные каналы
const initialChannels: CommunicationChannel[] = [
  { id: '1', name: 'Telegram', createdAt: new Date().toISOString() },
  { id: '2', name: 'VK', createdAt: new Date().toISOString() },
  { id: '3', name: 'Instagram', createdAt: new Date().toISOString() },
  { id: '4', name: 'YouTube', createdAt: new Date().toISOString() },
  { id: '5', name: 'Facebook', createdAt: new Date().toISOString() },
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
        const existingIds = new Set(parsed.map((u: any) => u.id));
        const merged = [
          ...parsed,
          ...(Array.isArray(defaultValue) ? (defaultValue as User[]).filter((u) => !existingIds.has(u.id)) : []),
        ];
        return merged as T;
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

        // Merge in newly added demo tasks without removing user's existing changes.
        const existingIds = new Set(normalized.map((t: any) => t.id));
        const merged = [
          ...normalized,
          ...(Array.isArray(defaultValue) ? (defaultValue as any[]).filter((t) => !existingIds.has(t.id)) : []),
        ];

        return merged as T;
      }
      return parsed;
    }
    return defaultValue;
  } catch {
    return defaultValue;
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
      if (u.id === SERVICE_USER_ID) return u;
      return migrateServiceUserId(u);
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Старый сервисный аккаунт был id=7; теперь 7 — Говорик, сервис — id 9 */
function migrateServiceUserId(u: User): User {
  if (u.id === '7' && u.name?.includes('Сервис')) {
    return { ...u, id: SERVICE_USER_ID };
  }
  return u;
}

function normalizeTaskWire(raw: Record<string, unknown>): Task {
  return {
    ...(raw as unknown as Task),
    channels: Array.isArray(raw.channels) ? (raw.channels as string[]) : [],
    kpiType: (raw.kpiType as Task['kpiType']) || 'none',
    completed: Boolean(raw.completed),
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : undefined,
  };
}

export function useStore() {
  const [users, setUsers] = useState<User[]>(() => loadFromStorage(STORAGE_KEYS.USERS, initialUsers));
  const [tasks, setTasks] = useState<Task[]>(() => loadFromStorage(STORAGE_KEYS.TASKS, initialTasks));
  const [channels, setChannels] = useState<CommunicationChannel[]>(() => loadFromStorage(STORAGE_KEYS.CHANNELS, initialChannels));
  const [notificationsShown, setNotificationsShown] = useState<Set<string>>(() => {
    const stored = loadFromStorage<string[]>(STORAGE_KEYS.NOTIFICATIONS_SHOWN, []);
    return new Set(stored);
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => loadSessionUser());
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState<boolean>(() =>
    loadFromStorage<boolean>(STORAGE_KEYS.PUSH_NOTIFICATIONS_ENABLED, false)
  );

  const lastWrittenRef = useRef<string | null>(null);
  const remoteSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Пока false — не отправляем PUT, чтобы не затереть БД старым localStorage до ответа GET */
  const remoteHydratedRef = useRef(!isRemoteSyncConfigured());

  const pullFromServer = useCallback(async () => {
    if (!isRemoteSyncConfigured()) return;
    try {
      const data = await fetchRemoteState();
      const usersNext = data.users?.length ? data.users : initialUsers;
      const tasksNext = data.tasks?.length
        ? data.tasks.map((t) => normalizeTaskWire(t as unknown as Record<string, unknown>))
        : initialTasks;
      const channelsNext = data.channels?.length ? data.channels : initialChannels;
      const notificationsNext = Array.isArray(data.notificationsShown) ? data.notificationsShown : [];
      const pushNext = typeof data.pushNotificationsEnabled === 'boolean' ? data.pushNotificationsEnabled : false;

      const payload: RemoteStatePayload = {
        users: usersNext,
        tasks: tasksNext,
        channels: channelsNext,
        notificationsShown: notificationsNext,
        pushNotificationsEnabled: pushNext,
      };
      lastWrittenRef.current = snapshotState(payload);
      setUsers(usersNext);
      setTasks(tasksNext);
      setChannels(channelsNext);
      setNotificationsShown(new Set(notificationsNext));
      setPushNotificationsEnabled(pushNext);
    } catch (e) {
      console.error(e);
      toast.error('Не удалось загрузить данные из Supabase. Показаны локальные данные.');
    } finally {
      remoteHydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (!isRemoteSyncConfigured()) return;
    remoteHydratedRef.current = false;
    void pullFromServer();
  }, [currentUser?.id, pullFromServer]);

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
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_SHOWN, JSON.stringify([...notificationsShown]));
  }, [notificationsShown, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(STORAGE_KEYS.PUSH_NOTIFICATIONS_ENABLED, JSON.stringify(pushNotificationsEnabled));
  }, [pushNotificationsEnabled, currentUser]);

  // Облачное состояние (Supabase)
  useEffect(() => {
    if (!currentUser) return;
    if (!isRemoteSyncConfigured()) return;
    if (!remoteHydratedRef.current) return;

    const payload: RemoteStatePayload = {
      users,
      tasks,
      channels,
      notificationsShown: [...notificationsShown],
      pushNotificationsEnabled,
    };
    const snap = snapshotState(payload);
    if (lastWrittenRef.current === snap) return;

    if (remoteSaveTimerRef.current) clearTimeout(remoteSaveTimerRef.current);
    remoteSaveTimerRef.current = setTimeout(() => {
      remoteSaveTimerRef.current = null;
      saveRemoteState(payload)
        .then(() => {
          lastWrittenRef.current = snap;
        })
        .catch((err) => {
          console.error(err);
          toast.error('Не удалось сохранить в Supabase');
        });
    }, 450);

    return () => {
      if (remoteSaveTimerRef.current) {
        clearTimeout(remoteSaveTimerRef.current);
        remoteSaveTimerRef.current = null;
      }
    };
  }, [users, tasks, channels, notificationsShown, pushNotificationsEnabled, currentUser]);

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

  // Удаление из архива: не раньше чем через 2 суток после дедлайна И 2 суток после отметки выполненным
  // (иначе старые дедлайны мгновенно удаляли задачу из архива)
  useEffect(() => {
    const purgeArchived = () => {
      setTasks((prev) => {
        const now = new Date();
        return prev.filter((t) => {
          if (!t.completed) return true;
          const completedAt = t.completedAt ? new Date(t.completedAt) : new Date(t.deadline);
          const purgeAfterDeadline = addDays(new Date(t.deadline), 2);
          const purgeAfterComplete = addDays(completedAt, 2);
          const purgeAt = new Date(
            Math.max(purgeAfterDeadline.getTime(), purgeAfterComplete.getTime()),
          );
          return !isAfter(now, purgeAt);
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
        
        const deadline = new Date(task.deadline);
        const hoursUntilDeadline = differenceInHours(deadline, now);
        
        const intervals = [24, 12, 1];
        
        intervals.forEach(interval => {
          const notificationKey = `${task.id}-${interval}h`;
          
          if (hoursUntilDeadline <= interval && hoursUntilDeadline > 0 && !notificationsShown.has(notificationKey)) {
            setNotificationsShown(prev => new Set([...prev, notificationKey]));

            const hoursText = interval === 1 ? 'час' : interval < 5 ? 'часа' : 'часов';
            const description = `До дедлайна осталось ${interval} ${hoursText}`;
            const title = `Напоминание: ${task.title}`;
          showReminderNotification(title, description, notificationKey);

            // Fallback, когда push отключен/запрещен — можно закрыть вручную (крестик).
            toast.warning(title, {
              description,
              duration: 60_000,
              closeButton: true,
            });
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
    const newUser: User = {
      ...user,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setUsers([...users, newUser]);
    return newUser;
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers(users.map(u => (u.id === userId ? { ...u, ...updates } : u)));
    // Чтобы изменения (например, пароль) сразу отражались в текущей сессии.
    setCurrentUser((prev) => (prev && prev.id === userId ? { ...prev, ...updates } : prev));
  };

  const deleteUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
  };

  const addChannel = (channel: Omit<CommunicationChannel, 'id' | 'createdAt'>) => {
    const newChannel: CommunicationChannel = {
      ...channel,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setChannels([...channels, newChannel]);
    return newChannel;
  };

  const updateChannel = (channelId: string, updates: Partial<CommunicationChannel>) => {
    setChannels(channels.map(c => c.id === channelId ? { ...c, ...updates } : c));
  };

  const deleteChannel = (channelId: string) => {
    setChannels(channels.filter(c => c.id !== channelId));
  };

  const addTask = (task: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setTasks([...tasks, newTask]);
    return newTask;
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const getTasksForDate = (date: Date) => {
    const targetDate = startOfDay(date);
    const filtered = tasks.filter(task => {
      if (task.completed) return false;

      const taskDeadline = startOfDay(new Date(task.deadline));
      
      if (task.recurrence === 'none') {
        return !isAfter(targetDate, taskDeadline);
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
      const ta = new Date(a.deadline).getTime();
      const tb = new Date(b.deadline).getTime();
      if (ta !== tb) return ta - tb;
      // Техническая стабильность (если дедлайны совпали)
      return a.title.localeCompare(b.title, 'ru');
    });
  };

  return {
    users,
    tasks,
    channels,
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
    currentUser,
    setCurrentUser,
    requestPushNotificationsPermission,
    pushNotificationsEnabled,
  };
}