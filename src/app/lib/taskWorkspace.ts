import type {
  AuditLogEntry,
  NotificationSettings,
  Task,
  TaskActivityAction,
  TaskActivityEntry,
  User,
} from '../types';

const MAX_ACTIVITY = 120;
const MAX_AUDIT = 300;

export const defaultNotificationSettings = (): NotificationSettings => ({
  webhookUrl: '',
  notifyOnAssign: false,
  notifyDeadlineHours: null,
});

export function taskRevisionTime(t: Task): number {
  const u = t.updatedAt ? Date.parse(t.updatedAt) : NaN;
  if (!Number.isNaN(u)) return u;
  return Date.parse(t.createdAt) || 0;
}

export type MergeTasksOptions = {
  /**
   * Если в Supabase уже был непустой список задач, не добавляем локальные id, которых нет на сервере
   * (считаем, что задачу удалили на другом устройстве).
   */
  dropLocalOrphans?: boolean;
};

/** Слияние списков задач по updatedAt; при равенстве ревизий приоритет у сервера (поля), комментарии/история — из обеих копий. */
export function mergeTasksByUpdatedAt(local: Task[], remote: Task[], options?: MergeTasksOptions): Task[] {
  const dropOrphans = options?.dropLocalOrphans === true;
  const map = new Map<string, Task>();
  for (const t of remote) map.set(t.id, t);
  for (const t of local) {
    const r = map.get(t.id);
    if (!r) {
      if (!dropOrphans) map.set(t.id, t);
      continue;
    }
    const lt = taskRevisionTime(t);
    const rt = taskRevisionTime(r);
    if (lt > rt) map.set(t.id, t);
    else if (lt < rt) map.set(t.id, r);
    else map.set(t.id, mergeTasksSameRevision(r, t));
  }
  return [...map.values()];
}

/** primary — источник полей задачи; secondary — только для объединения комментариев и истории. */
function mergeTasksSameRevision(primary: Task, secondary: Task): Task {
  const cmerge = [...(primary.comments ?? []), ...(secondary.comments ?? [])].sort((x, y) =>
    x.createdAt.localeCompare(y.createdAt),
  );
  const cSeen = new Set<string>();
  const comments = cmerge.filter((c) => (cSeen.has(c.id) ? false : (cSeen.add(c.id), true))).slice(-200);
  const amerge = [...(primary.activity ?? []), ...(secondary.activity ?? [])].sort((x, y) =>
    x.at.localeCompare(y.at),
  );
  const aSeen = new Set<string>();
  const activity = amerge.filter((x) => (aSeen.has(x.id) ? false : (aSeen.add(x.id), true))).slice(-MAX_ACTIVITY);
  return { ...primary, comments, activity };
}

export function capTaskActivity(list: TaskActivityEntry[] | undefined): TaskActivityEntry[] {
  if (!list?.length) return [];
  return list.length > MAX_ACTIVITY ? list.slice(-MAX_ACTIVITY) : list;
}

export function buildActivitiesOnPatch(prev: Task, patch: Partial<Task>, userId: string): TaskActivityEntry[] {
  const now = new Date().toISOString();
  const mk = (action: TaskActivityAction, summary: string): TaskActivityEntry => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    at: now,
    userId,
    action,
    summary,
  });
  const out: TaskActivityEntry[] = [];
  if (patch.title !== undefined && patch.title !== prev.title) {
    out.push(mk('title_changed', `Название обновлено`));
  }
  if (patch.deadline !== undefined && patch.deadline !== prev.deadline) {
    out.push(mk('deadline_changed', 'Изменён дедлайн'));
  }
  if (
    patch.assignees !== undefined &&
    JSON.stringify([...patch.assignees].sort()) !== JSON.stringify([...prev.assignees].sort())
  ) {
    out.push(mk('assignees_changed', 'Изменены исполнители'));
  }
  if (patch.completed === true && !prev.completed) out.push(mk('completed', 'Задача выполнена'));
  if (patch.completed === false && prev.completed) out.push(mk('reopened', 'Снова в работе'));
  if (patch.category !== undefined && patch.category !== prev.category) {
    out.push(mk('other', 'Изменена категория'));
  }
  return out;
}

export function appendAudit(
  prev: AuditLogEntry[],
  entry: Omit<AuditLogEntry, 'id'> & { id?: string },
): AuditLogEntry[] {
  const row: AuditLogEntry = {
    id: entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    at: entry.at,
    userId: entry.userId,
    userName: entry.userName,
    action: entry.action,
    detail: entry.detail,
  };
  const next = [...prev, row];
  return next.length > MAX_AUDIT ? next.slice(-MAX_AUDIT) : next;
}

export async function postOrgWebhook(url: string, body: Record<string, unknown>): Promise<void> {
  const u = url.trim();
  if (!u) return;
  try {
    await fetch(u, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'mediaplanning', ...body }),
    });
  } catch {
    /* сеть / CORS */
  }
}

export function userLabel(users: User[], id: string): string {
  return users.find((u) => u.id === id)?.name ?? id;
}
