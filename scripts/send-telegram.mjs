#!/usr/bin/env node
// Sends a Markdown digest file to Telegram via the Bot API, stripped to plain text.
import { readFileSync } from 'node:fs';

const MAX_LEN = 4000;

const [, , filePath] = process.argv;
if (!filePath) {
  console.error('Usage: node send-telegram.mjs <path-to-markdown-file>');
  process.exit(1);
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
if (!token || !chatId) {
  console.error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set');
  process.exit(1);
}

function stripMarkdown(md) {
  const lines = md.split('\n').map((line) => {
    let l = line.replace(/^\s{0,3}#{1,6}\s+/, '');
    l = l.replace(/^(\s*)[-*+]\s+/, '$1▪️ ');
    return l;
  });
  let text = lines.join('\n');

  // [text](url) -> text (url)
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1 ($2)');
  // **bold** / __bold__
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '$1');
  text = text.replace(/__([^_\n]+)__/g, '$1');
  // *italic* / _italic_ (word-boundary guarded so stray underscores/asterisks survive)
  text = text.replace(/(?<![\w*])\*([^*\n]+)\*(?!\w)/g, '$1');
  text = text.replace(/(?<![\w_])_([^_\n]+)_(?!\w)/g, '$1');

  return text;
}

function splitIntoChunks(text, maxLen) {
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];
  let current = '';

  const flush = () => {
    if (current) {
      chunks.push(current);
      current = '';
    }
  };

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length <= maxLen) {
      current = candidate;
      continue;
    }
    flush();
    if (para.length <= maxLen) {
      current = para;
      continue;
    }
    // A single paragraph is longer than the limit: fall back to splitting by line.
    let sub = '';
    for (const line of para.split('\n')) {
      const subCandidate = sub ? `${sub}\n${line}` : line;
      if (subCandidate.length <= maxLen) {
        sub = subCandidate;
      } else {
        if (sub) chunks.push(sub);
        sub = line.slice(0, maxLen);
      }
    }
    current = sub;
  }
  flush();

  return chunks;
}

async function sendMessage(text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = JSON.stringify({
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });

  for (;;) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const data = await res.json();

    if (data.ok) return;

    if (res.status === 429 && data.parameters?.retry_after) {
      const waitSec = data.parameters.retry_after;
      console.error(`Rate limited by Telegram, retrying after ${waitSec}s`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      continue;
    }

    console.error(`Telegram API error: ${data.description ?? 'unknown error'}`);
    process.exit(1);
  }
}

const raw = readFileSync(filePath, 'utf8');
const plain = stripMarkdown(raw).trim();

if (!plain) {
  console.error(`File ${filePath} is empty after stripping, nothing to send`);
  process.exit(1);
}

const chunks = splitIntoChunks(plain, MAX_LEN);

for (let i = 0; i < chunks.length; i++) {
  let chunk = chunks[i];
  if (chunks.length > 1) {
    chunk += `\n\n(${i + 1}/${chunks.length})`;
  }
  await sendMessage(chunk);
  console.log(`Sent chunk ${i + 1}/${chunks.length} of ${filePath}`);
}
