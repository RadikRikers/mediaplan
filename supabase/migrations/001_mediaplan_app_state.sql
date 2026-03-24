-- Запуск: Supabase Dashboard → SQL Editor → вставить и выполнить.
-- Хранит одну строку с JSON состояния приложения (пользователи, задачи, каналы, напоминания).

create table if not exists public.mediaplan_app_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.mediaplan_app_state (id, payload)
values (
  'main',
  '{"users":[],"tasks":[],"channels":[],"notificationsShown":[],"pushNotificationsEnabled":false}'::jsonb
)
on conflict (id) do nothing;

alter table public.mediaplan_app_state enable row level security;

-- Анонимный доступ (только для демо / внутренних команд).
-- Для продакшена ограничьте через Supabase Auth или секрет Edge Function.
create policy "mediaplan_select_anon"
  on public.mediaplan_app_state for select
  to anon, authenticated
  using (true);

create policy "mediaplan_insert_anon"
  on public.mediaplan_app_state for insert
  to anon, authenticated
  with check (true);

create policy "mediaplan_update_anon"
  on public.mediaplan_app_state for update
  to anon, authenticated
  using (true)
  with check (true);
