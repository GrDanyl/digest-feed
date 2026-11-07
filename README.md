# digest-feed

News digests committed as `issues/YYYY-MM-DD.md`, automatically forwarded to Telegram.

## How it works

1. An agent commits a new `issues/YYYY-MM-DD.md` file to the `main` branch.
2. GitHub Actions (`.github/workflows/telegram.yml`) reacts to pushes that change `issues/**.md`, finds the added files, and runs `scripts/send-telegram.mjs` for each one.
3. The script strips Markdown formatting (headings, `**bold**`, `__bold__`, `*italic*`, `[text](url)` → `text (url)`, list items → `▪️`), splits the text into paragraph-aligned chunks if it exceeds ~4000 characters (tagged `(1/N)`), and sends it via the Telegram Bot API `sendMessage` with link previews disabled.
4. If the Telegram API returns an error (other than `429 Too Many Requests`, which the script retries automatically after `retry_after`), the workflow fails.

## Required repository secrets

Add these under **Settings → Secrets and variables → Actions**:

- `TELEGRAM_BOT_TOKEN` — bot token from [@BotFather](https://t.me/BotFather).
- `TELEGRAM_CHAT_ID` — ID of the chat/user to send messages to.

The token and chat ID never end up in the repository code and are never printed in logs.

## Manual run

Via **Actions → Send digest to Telegram → Run workflow**:

- with no parameters — sends the newest file in `issues/`;
- with the `file` parameter — sends the specified file, e.g. `issues/2026-10-30.md`.

Or via GitHub CLI:

```bash
gh workflow run telegram.yml -f file=issues/2026-10-30.md
```
