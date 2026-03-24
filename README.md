# Untitled

Исходный макет: https://www.figma.com/design/FiLqFelRHAR6P0rjuwtqW6/Untitled

## Запуск

```bash
npm install
npm run dev
```

Создайте файл **`.env`** по образцу **`.env.example`** (ключи Supabase), иначе данные будут только в браузере (`localStorage`).

## Сборка

```bash
npm run build
```

Готовые файлы — в `dist/`. Роутинг с `#` (`#/…`), отдельный SPA-fallback на сервере не нужен.

## Supabase (общая база для команды)

1. Проект на [supabase.com](https://supabase.com) → **SQL Editor** → выполните скрипт из  
   `supabase/migrations/001_mediaplan_app_state.sql`
2. **Settings → API**: скопируйте **Project URL** и **anon public** key в `.env` как  
   `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`
3. `npm run build` и раздавайте `dist/` любым статическим хостингом (Netlify, Vercel, Cloudflare Pages, S3 и т.д.).

Подробнее: **`deploy-supabase.txt`**

**Безопасность:** в миграции включён анонимный доступ к таблице для простоты. Для публичного сайта лучше заменить политики RLS на авторизацию Supabase.

Документ **`deploy-ispmanager.txt`** (PHP/MySQL) актуален только если вы сознательно откатываетесь на свой PHP-бэкенд.
