import type {
  User,
  Task,
  CommunicationChannel,
  Meeting,
  StaffBlock,
  JobPosition,
  NotificationSettings,
  TaskTemplate,
  SavedTaskView,
  AuditLogEntry,
} from '../types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { defaultNotificationSettings } from '../lib/taskWorkspace';

export type RemoteStatePayload = {
  users: User[];
  tasks: Task[];
  channels: CommunicationChannel[];
  meetings: Meeting[];
  staffBlocks: StaffBlock[];
  jobPositions: JobPosition[];
  notificationsShown: string[];
  pushNotificationsEnabled: boolean;
  /** Сколько раз задачи были отмечены выполненными (не уменьшается при автоудалении из архива). */
  completedTasksLifetimeTotal: number;
  notificationSettings: NotificationSettings;
  taskTemplates: TaskTemplate[];
  savedTaskViews: SavedTaskView[];
  auditLog: AuditLogEntry[];
};

const ROW_ID = 'main';
const TABLE = 'mediaplan_app_state';

/** Синхронизация с облаком включена, если в .env заданы URL и anon key Supabase */
export function isRemoteSyncConfigured(): boolean {
  return isSupabaseConfigured();
}

function emptyPayload(): RemoteStatePayload {
  return {
    users: [],
    tasks: [],
    channels: [],
    meetings: [],
    staffBlocks: [],
    jobPositions: [],
    notificationsShown: [],
    pushNotificationsEnabled: false,
    completedTasksLifetimeTotal: 0,
    notificationSettings: defaultNotificationSettings(),
    taskTemplates: [],
    savedTaskViews: [],
    auditLog: [],
  };
}

function coerceNotificationSettings(raw: unknown): NotificationSettings {
  const d = defaultNotificationSettings();
  if (!raw || typeof raw !== 'object') return d;
  const o = raw as Record<string, unknown>;
  const hrs = o.notifyDeadlineHours;
  return {
    webhookUrl: typeof o.webhookUrl === 'string' ? o.webhookUrl : d.webhookUrl,
    notifyOnAssign: typeof o.notifyOnAssign === 'boolean' ? o.notifyOnAssign : d.notifyOnAssign,
    notifyDeadlineHours:
      hrs === null
        ? null
        : typeof hrs === 'number' && Number.isFinite(hrs) && hrs >= 0
          ? Math.floor(hrs)
          : d.notifyDeadlineHours,
  };
}

function coerceTaskTemplates(raw: unknown): TaskTemplate[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x && typeof x === 'object').map((x) => x as TaskTemplate);
}

function coerceSavedViews(raw: unknown): SavedTaskView[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x && typeof x === 'object').map((x) => x as SavedTaskView);
}

function coerceAuditLog(raw: unknown): AuditLogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x && typeof x === 'object').map((x) => x as AuditLogEntry).slice(-300);
}

function coercePayload(raw: unknown): RemoteStatePayload {
  if (!raw || typeof raw !== 'object') return emptyPayload();
  const o = raw as Record<string, unknown>;
  return {
    users: Array.isArray(o.users) ? (o.users as User[]) : [],
    tasks: Array.isArray(o.tasks) ? (o.tasks as Task[]) : [],
    channels: Array.isArray(o.channels) ? (o.channels as CommunicationChannel[]) : [],
    meetings: Array.isArray(o.meetings) ? (o.meetings as Meeting[]) : [],
    staffBlocks: Array.isArray(o.staffBlocks) ? (o.staffBlocks as StaffBlock[]) : [],
    jobPositions: Array.isArray(o.jobPositions) ? (o.jobPositions as JobPosition[]) : [],
    notificationsShown: Array.isArray(o.notificationsShown)
      ? (o.notificationsShown as string[])
      : [],
    pushNotificationsEnabled: typeof o.pushNotificationsEnabled === 'boolean' ? o.pushNotificationsEnabled : false,
    completedTasksLifetimeTotal:
      typeof o.completedTasksLifetimeTotal === 'number' &&
      Number.isFinite(o.completedTasksLifetimeTotal) &&
      o.completedTasksLifetimeTotal >= 0
        ? Math.floor(o.completedTasksLifetimeTotal)
        : 0,
    notificationSettings: coerceNotificationSettings(o.notificationSettings),
    taskTemplates: coerceTaskTemplates(o.taskTemplates),
    savedTaskViews: coerceSavedViews(o.savedTaskViews),
    auditLog: coerceAuditLog(o.auditLog),
  };
}

export async function fetchRemoteState(): Promise<RemoteStatePayload> {
  const sb = getSupabase();
  const { data, error } = await sb.from(TABLE).select('payload').eq('id', ROW_ID).maybeSingle();
  if (error) throw error;
  const payload = data?.payload;
  return coercePayload(payload);
}

export async function saveRemoteState(payload: RemoteStatePayload): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from(TABLE).upsert(
    {
      id: ROW_ID,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (error) throw error;
}

export function snapshotState(p: RemoteStatePayload): string {
  return JSON.stringify({
    users: p.users,
    tasks: p.tasks,
    channels: p.channels,
    meetings: [...p.meetings].sort((a, b) => a.id.localeCompare(b.id)),
    staffBlocks: [...p.staffBlocks].sort((a, b) => a.id.localeCompare(b.id)),
    jobPositions: [...p.jobPositions].sort((a, b) => a.id.localeCompare(b.id)),
    notificationsShown: [...p.notificationsShown].sort(),
    pushNotificationsEnabled: p.pushNotificationsEnabled,
    completedTasksLifetimeTotal: p.completedTasksLifetimeTotal,
    notificationSettings: p.notificationSettings,
    taskTemplates: [...p.taskTemplates].sort((a, b) => a.id.localeCompare(b.id)),
    savedTaskViews: [...p.savedTaskViews].sort((a, b) => a.id.localeCompare(b.id)),
    auditLog: [...p.auditLog].sort((a, b) => a.at.localeCompare(b.at)),
  });
}
