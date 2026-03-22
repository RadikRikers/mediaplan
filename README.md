
  # Untitled

  This is a code bundle for Untitled. The original project is available at https://www.figma.com/design/FiLqFelRHAR6P0rjuwtqW6/Untitled.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

## Production (любой статический сервер)

1. Соберите проект: `npm run build`
2. Раздавайте содержимое папки `dist/` любым статическим сервером.
   - Пример: `npx serve dist` (локально)

Приложение использует hash-роутинг, поэтому не требует специальных правил “SPA fallback” на сервере.

## GitHub + GitHub Pages (сайт из любой точки мира)

Зависимости **не** хранятся в репозитории: в git идут `package.json` и `package-lock.json`; на GitHub при сборке выполняется `npm ci` (точная установка версий).

### 1. Создайте пустой репозиторий на GitHub

Например: `https://github.com/ВАШ_ЛОГИН/ИМЯ_РЕПО` (без README, если будете пушить существующий код).

### 2. Локально: первый коммит и отправка

```bash
cd путь/к/Untitled_1
git init
git branch -M main
git add .
git commit -m "Initial commit: Vite + React, GitHub Pages"
git remote add origin https://github.com/ВАШ_ЛОГИН/ИМЯ_РЕПО.git
git push -u origin main
```

Если GitHub просит авторизацию — используйте [Personal Access Token](https://github.com/settings/tokens) вместо пароля или `gh auth login`.

### 3. Включите GitHub Pages из Actions

На GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

После успешного workflow сайт будет по адресу:

`https://ВАШ_ЛОГИН.github.io/ИМЯ_РЕПО/` (для обычного репозитория).

Для репозитория `username.github.io` корень будет `https://username.github.io/`.

Сборка настроена в `.github/workflows/deploy-pages.yml` (ветки `main` и `master`).
  