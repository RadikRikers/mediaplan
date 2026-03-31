-- Черновик серверной части для аудита и резервных копий JSON payload.
-- Сама логика веба сейчас пишет auditLog внутри JSON (`mediaplan_app_state.payload`).
-- Эти таблицы и задания — ориентир для миграции на Supabase Auth + Edge Functions.

-- Журнал входов и чувствительных действий (отдельно от монолитного payload).
create table if not exists public.org_audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  at timestamptz not null default now(),
  user_id text,
  user_name text,
  action text not null,
  detail text not null default ''
);

create index if not exists org_audit_log_org_at on public.org_audit_log (org_id, at desc);

comment on table public.org_audit_log is 'Серверный аудит; клиент может дублировать записи из payload.auditLog через Edge Function.';

-- Снимки payload для бэкапа (по расписанию cron → Edge Function или pg_cron).
create table if not exists public.org_state_snapshot (
  id bigserial primary key,
  org_id text not null,
  taken_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists org_state_snapshot_org_taken on public.org_state_snapshot (org_id, taken_at desc);

comment on table public.org_state_snapshot is 'Исторические копии JSON; ротация по политике хранения (например, удалять старше 90 дней).';

-- Пример вызова из Edge Function (псевдокод, не исполнять как SQL):
-- insert into org_state_snapshot (org_id, payload)
-- select 'default', payload from mediaplan_app_state where id = $1;
