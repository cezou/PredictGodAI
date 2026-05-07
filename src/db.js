import { Sequelize, Op } from 'sequelize';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DateTime } from 'luxon';
import definePrediction from './models/Prediction.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '..', 'data', 'predicts.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: false,
});

export const Prediction = definePrediction(sequelize);

export async function countTodayPredicts(authorId, type) {
  const startOfDayParis = DateTime.now().setZone('Europe/Paris').startOf('day').toJSDate();
  return Prediction.count({
    where: {
      authorId,
      type,
      createdAt: { [Op.gte]: startOfDayParis },
    },
  });
}

export async function hasActivePredict(channelId, authorId, targetId, type, originalTargetId = null) {
  const whereClause = {
    channelId,
    authorId,
    targetId,
    type,
    resolvedAt: null,
  };
  if (originalTargetId !== null) {
    whereClause.originalTargetId = originalTargetId;
  }
  const predict = await Prediction.findOne({
    where: whereClause,
  });
  return !!predict;
}

export async function createPredict({
  guildId,
  channelId,
  authorId,
  targetId,
  originalTargetId = null,
  content,
  type,
  resolvedAt = null,
}) {
  // Enforce unique active predict
  if (resolvedAt === null) {
    const existing = await hasActivePredict(channelId, authorId, targetId, type, originalTargetId);
    if (existing) {
      const err = new Error('SQLITE_CONSTRAINT_UNIQUE');
      err.code = 'SQLITE_CONSTRAINT_UNIQUE';
      throw err;
    }
  }

  await Prediction.create({ guildId, channelId, authorId, targetId, originalTargetId, content, type, resolvedAt });
}

export function normalizeForMatch(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[\s.,/#!$%^&*;:{}=\-_~()]/g, '');
}

export async function findAndResolveMatchingPredict(channelId, authorId, originalTargetId, content) {
  const activePredicts = await Prediction.findAll({
    where: { channelId, authorId, targetId: originalTargetId, type: { [Op.in]: ['message', 'reaction'] }, resolvedAt: null },
  });
  const normalized = normalizeForMatch(content);
  for (const p of activePredicts) {
    if (normalizeForMatch(p.content) === normalized) {
      p.resolvedAt = new Date();
      await p.save();
      return p;
    }
  }
  return null;
}

export async function findAndResolveMatchingCounter(channelId, targetId, content) {
  const activeCounters = await Prediction.findAll({
    where: { channelId, targetId, type: 'counter', resolvedAt: null },
  });
  const normalized = normalizeForMatch(content);
  for (const c of activeCounters) {
    if (normalizeForMatch(c.content) === normalized) {
      c.resolvedAt = new Date();
      await c.save();
      return c;
    }
  }
  return null;
}

export async function popActivePredictsFor(channelId, targetId, type, authorId = null, originalTargetId = null) {
  const whereClause = {
    channelId,
    targetId,
    type,
    resolvedAt: null,
  };
  if (authorId) {
    whereClause.authorId = authorId;
  }
  if (originalTargetId) {
    whereClause[Op.or] = [
      { originalTargetId: originalTargetId },
      { originalTargetId: null }
    ];
  }

  const predicts = await Prediction.findAll({ where: whereClause });
  const consumed = [];
  const now = new Date();

  for (const predict of predicts) {
    predict.resolvedAt = now;
    await predict.save();
    consumed.push(predict);
  }

  return consumed;
}
