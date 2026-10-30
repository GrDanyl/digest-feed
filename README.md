# digest-feed

Новостные дайджесты в `issues/YYYY-MM-DD.md`, автоматически пересылаемые в Telegram.

## Как это работает

1. Агент коммитит новый файл `issues/YYYY-MM-DD.md` в ветку `main`.
2. GitHub Actions (`.github/workflows/telegram.yml`) реагирует на push с изменениями в `issues/**.md`, находит добавленные файлы и для каждого запускает `scripts/send-telegram.mjs`.
3. Скрипт убирает Markdown-разметку (заголовки, `**bold**`, `__bold__`, `*italic*`, `[текст](url)` → `текст (url)`, пункты списков → `▪️`), при необходимости режет текст на части по границам абзацев (лимит ~4000 символов, с пометкой `(1/N)`) и отправляет через Telegram Bot API `sendMessage` без предпросмотра ссылок.
4. При ошибке Telegram API (кроме `429 Too Many Requests`, которую скрипт обрабатывает сам с повтором после `retry_after`) workflow завершается с ошибкой.

## Нужные секреты репозитория

В **Settings → Secrets and variables → Actions** должны быть добавлены:

- `TELEGRAM_BOT_TOKEN` — токен бота от [@BotFather](https://t.me/BotFather).
- `TELEGRAM_CHAT_ID` — ID чата/пользователя, которому слать сообщения.

Токен и chat_id никогда не попадают в код репозитория и не печатаются в логах.

## Ручной запуск

В **Actions → Send digest to Telegram → Run workflow**:

- без параметров — отправит самый свежий файл в `issues/`;
- с параметром `file` — отправит указанный файл, например `issues/2026-10-30.md`.

Либо через GitHub CLI:

```bash
gh workflow run telegram.yml -f file=issues/2026-10-30.md
```
