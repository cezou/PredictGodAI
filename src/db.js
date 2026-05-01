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

  CREATE UNIQUE INDEX IF NOT EXISTS uq_active_predict
    ON predicts(channel_id, author_id, target_id)
    WHERE resolved_at IS NULL;

  CREATE INDEX IF NOT EXISTS idx_active_target
    ON predicts(channel_id, target_id)
    WHERE resolved_at IS NULL;

  CREATE INDEX IF NOT EXISTS idx_quota
    ON predicts(author_id, created_at);
`);

const stmtCountToday = db.prepare(
  'SELECT COUNT(*) AS n FROM predicts WHERE author_id = ? AND created_at >= ?'
);
const stmtHasActive = db.prepare(
  'SELECT 1 FROM predicts WHERE channel_id = ? AND author_id = ? AND target_id = ? AND resolved_at IS NULL LIMIT 1'
);
const stmtInsert = db.prepare(
  'INSERT INTO predicts (guild_id, channel_id, author_id, target_id, message, created_at) VALUES (?, ?, ?, ?, ?, ?)'
);
const stmtSelectActiveForTarget = db.prepare(
  'SELECT id, author_id, message FROM predicts WHERE channel_id = ? AND target_id = ? AND resolved_at IS NULL'
);
const stmtResolve = db.prepare(
  'UPDATE predicts SET resolved_at = ? WHERE id = ? AND resolved_at IS NULL'
);

export function countTodayPredicts(authorId) {
  const startOfDayParis = DateTime.now().setZone('Europe/Paris').startOf('day').toMillis();
  return stmtCountToday.get(authorId, startOfDayParis).n;
}

export function hasActivePredict(channelId, authorId, targetId) {
  return !!stmtHasActive.get(channelId, authorId, targetId);
}

export function createPredict({ guildId, channelId, authorId, targetId, message }) {
  stmtInsert.run(guildId, channelId, authorId, targetId, message, Date.now());
}

export const popActivePredictsFor = db.transaction((channelId, targetId) => {
  const rows = stmtSelectActiveForTarget.all(channelId, targetId);
  const now = Date.now();
  const consumed = [];
  for (const row of rows) {
    const res = stmtResolve.run(now, row.id);
    if (res.changes === 1) consumed.push(row);
  }
  return consumed;
});
