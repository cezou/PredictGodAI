// Builds the conversation window handed to the decision model.
// CIBLE = every message the target sent after the predict was created, at most
// TARGET_WINDOW.messages within TARGET_WINDOW.ms of the first one. AUTEUR = the predictor's
// last message before the first CIBLE message, always kept even when older than MAX_AGE_MS.
// Context = the 5 messages before AUTEUR (or before the first CIBLE message), then everything up
// to the last CIBLE message.

export const TARGET_WINDOW = { messages: 3, ms: 2 * 60 * 1000 };
const FETCH_LIMIT = 50;
const MESSAGES_BEFORE = 5;
const MAX_MESSAGES = 25;
const MAX_AGE_MS = 30 * 60 * 1000;
const MAX_CHARS = 300;

function displayName(msg) {
  return msg.member?.displayName ?? msg.author.globalName ?? msg.author.username;
}

const GIF_URL_RE = /https?:\/\/(?:www\.)?(?:tenor\.com\/view|klipy\.com\/gifs|giphy\.com\/gifs)\/([\w-]+)\S*/gi;
const URL_RE = /https?:\/\/(?:www\.)?([^/\s]+)\S*/gi;

// The model can't see media: GIF links become their title (from the URL slug, e.g.
// tenor.com/view/aller-ferme-ta-guele-bassem-gif-123 → [GIF : aller ferme ta guele bassem]),
// other links their domain.
export function renderText(text) {
  return text
    .replace(GIF_URL_RE, (_, slug) => `[GIF : ${slug.replace(/-gif-\d+$/, '').replace(/-\d+$/, '').replace(/-/g, ' ')}]`)
    .replace(URL_RE, (_, host) => `[lien ${host}]`)
    .replace(/\s+/g, ' ')
    .trim();
}

function attachmentLabel(attachment) {
  const type = attachment.contentType ?? '';
  if (type === 'image/gif') return '[GIF]';
  if (type.startsWith('image/')) return '[image]';
  if (type.startsWith('video/')) return '[vidéo]';
  return '[pièce jointe]';
}

function formatMessage(msg, isTarget = false, isAuthorLast = false) {
  const parts = [
    renderText(msg.cleanContent),
    ...msg.attachments.map(attachmentLabel),
    ...msg.stickers.map((s) => `[sticker : ${s.name}]`),
  ].filter(Boolean);
  let content = parts.join(' ') || '[message vide]';
  if (content.length > MAX_CHARS) content = `${content.slice(0, MAX_CHARS)}…`;
  return { author: displayName(msg), content, isTarget, isAuthorLast };
}

// Fetched once per target message, shared by all the predicts it resolves.
export async function fetchHistory(message) {
  try {
    const fetched = await message.channel.messages.fetch({ before: message.id, limit: FETCH_LIMIT });
    return [...fetched.values()].reverse().filter((m) => !m.author.bot);
  } catch (err) {
    console.error('[judge] failed to fetch channel history:', err);
    return [];
  }
}

export function buildContext(history, message, row) {
  const all = [...history, message];
  const createdAt = row.createdAt.getTime();
  const targetMessages = all.filter((m) => m.author.id === message.author.id && m.createdTimestamp > createdAt);
  const cible = targetMessages
    .filter((m) => m.createdTimestamp - targetMessages[0].createdTimestamp <= TARGET_WINDOW.ms)
    .slice(0, TARGET_WINDOW.messages);
  if (!cible.includes(message)) cible.push(message);

  const firstIdx = all.indexOf(cible[0]);
  const lastIdx = all.indexOf(cible.at(-1));
  let attackerIdx = -1;
  for (let i = firstIdx - 1; i >= 0; i--) {
    if (all[i].author.id === row.authorId) {
      attackerIdx = i;
      break;
    }
  }
  const attacker = all[attackerIdx];
  const start = Math.max(0, (attackerIdx === -1 ? firstIdx : attackerIdx) - MESSAGES_BEFORE);
  const minTimestamp = cible.at(-1).createdTimestamp - MAX_AGE_MS;
  const recent = all
    .slice(start, lastIdx + 1)
    .filter((m) => m !== attacker && m.createdTimestamp >= minTimestamp)
    .slice(-(MAX_MESSAGES - 1));
  const window = (attacker ? [attacker, ...recent] : recent).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  // Mark a gap wherever two kept messages were not consecutive in the channel.
  const formatted = [];
  window.forEach((m, i) => {
    if (i > 0 && all.indexOf(m) !== all.indexOf(window[i - 1]) + 1) {
      formatted.push({ author: '…', content: '[messages omis]', isTarget: false, isAuthorLast: false });
    }
    formatted.push(formatMessage(m, cible.includes(m), m === attacker));
  });
  return formatted;
}
