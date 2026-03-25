import type { User, Task, CommunicationChannel, Meeting, StaffBlock, JobPosition } from '../types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export type RemoteStatePayload = {
  users: User[];
  tasks: Task[];
  channels: CommunicationChannel[];
  meetings: Meeting[];
  staffBlocks: StaffBlock[];
  jobPositions: JobPosition[];
  notificationsShown: string[];
  pushNotificationsEnabled: boolean;
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
  };
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
  });
}
