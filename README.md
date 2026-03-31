# Untitled

Исходный макет: https://www.figma.com/design/FiLqFelRHAR6P0rjuwtqW6/Untitled

## Запуск

```bash
npm install
npm run dev
```

Облако **включено по умолчанию**: URL и anon key проекта заданы в **`src/lib/supabaseConfig.ts`** (тот же Supabase, что в iOS `Secrets.plist`). Файл **`.env`** нужен только чтобы подставить другой проект — см. **`.env.example`**.

## Сборка

```bash
npm run build
```

Готовые файлы — в `dist/`. Роутинг с `#` (`#/…`), отдельный SPA-fallback на сервере не нужен.

## Supabase (общая база для команды)

1. Проект на [supabase.com](https://supabase.com) → **SQL Editor** → выполните скрипт из  
   `supabase/migrations/001_mediaplan_app_state.sql`
2. **Settings → API**: при необходимости обновите в **`src/lib/supabaseConfig.ts`** (или задайте те же значения в `.env` — они перекрывают встроенные).
3. `npm run build` и раздавайте `dist/` любым статическим хостингом (Netlify, Vercel, Cloudflare Pages, S3 и т.д.).

Подробнее: **`deploy-supabase.txt`**

**Безопасность:** в миграции включён анонимный доступ к таблице для простоты. Для публичного сайта лучше заменить политики RLS на авторизацию Supabase.

Документ **`deploy-ispmanager.txt`** (PHP/MySQL) актуален только если вы сознательно откатываетесь на свой PHP-бэкенд.
