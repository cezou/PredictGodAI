import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { DateTime } from 'luxon';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '..', 'data', 'predicts.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS predicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    resolved_at INTEGER
  );
`);

const cols = db
  .prepare('PRAGMA table_info(predicts)')
  .all()
  .map((r) => r.name);
if (!cols.includes('type')) {
  db.exec(`ALTER TABLE predicts ADD COLUMN type TEXT NOT NULL DEFAULT 'message'`);
}

db.exec(`
  DROP INDEX IF EXISTS uq_active_predict;
  CREATE UNIQUE INDEX IF NOT EXISTS uq_active_predict
    ON predicts(channel_id, author_id, target_id, type)
    WHERE resolved_at IS NULL;

  DROP INDEX IF EXISTS idx_active_target;
  CREATE INDEX IF NOT EXISTS idx_active_target
    ON predicts(channel_id, target_id, type)
    WHERE resolved_at IS NULL;

  CREATE INDEX IF NOT EXISTS idx_quota
    ON predicts(author_id, type, created_at);
`);

const stmtCountToday = db.prepare(
  'SELECT COUNT(*) AS n FROM predicts WHERE author_id = ? AND type = ? AND created_at >= ?',
);
const stmtHasActive = db.prepare(
  'SELECT 1 FROM predicts WHERE channel_id = ? AND author_id = ? AND target_id = ? AND type = ? AND resolved_at IS NULL LIMIT 1',
);
const stmtInsert = db.prepare(
  'INSERT INTO predicts (guild_id, channel_id, author_id, target_id, message, created_at, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
);
const stmtSelectActiveMessage = db.prepare(
  "SELECT id, author_id, message FROM predicts WHERE channel_id = ? AND target_id = ? AND type = 'message' AND resolved_at IS NULL",
);
const stmtSelectActiveReaction = db.prepare(
  "SELECT id, author_id, message FROM predicts WHERE channel_id = ? AND target_id = ? AND author_id = ? AND type = 'reaction' AND resolved_at IS NULL",
);
const stmtResolve = db.prepare(
  'UPDATE predicts SET resolved_at = ? WHERE id = ? AND resolved_at IS NULL',
);

export function countTodayPredicts(authorId, type = 'message') {
  const startOfDayParis = DateTime.now().setZone('Europe/Paris').startOf('day').toMillis();
  return stmtCountToday.get(authorId, type, startOfDayParis).n;
}

export function hasActivePredict(channelId, authorId, targetId, type = 'message') {
  return !!stmtHasActive.get(channelId, authorId, targetId, type);
}

export function createPredict({
  guildId,
  channelId,
  authorId,
  targetId,
  message,
  type = 'message',
}) {
  stmtInsert.run(guildId, channelId, authorId, targetId, message, Date.now(), type);
}

export const popActiveMessagePredictsFor = db.transaction((channelId, targetId) => {
  const rows = stmtSelectActiveMessage.all(channelId, targetId);
  const now = Date.now();
  const consumed = [];
  for (const row of rows) {
    const res = stmtResolve.run(now, row.id);
    if (res.changes === 1) consumed.push(row);
  }
  return consumed;
});

export const popActiveReactionPredictsFor = db.transaction((channelId, targetId, authorId) => {
  const rows = stmtSelectActiveReaction.all(channelId, targetId, authorId);
  const now = Date.now();
  const consumed = [];
  for (const row of rows) {
    const res = stmtResolve.run(now, row.id);
    if (res.changes === 1) consumed.push(row);
  }
  return consumed;
});
