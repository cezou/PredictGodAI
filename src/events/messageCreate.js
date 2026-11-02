import { Events } from 'discord.js';
import { getActivePredictsFor, resolvePredict, popActivePredictsFor } from '../db.js';
import { fetchHistory, isPredictFulfilled, isCounterMatch } from '../judge/index.js';
import { TARGET_WINDOW } from '../judge/context.js';
import { createPuppetMasterAttachment, createDunkAttachment } from '../util/generateImage.js';

export const name = Events.MessageCreate;

// Un predict reste ouvert pendant les prochains messages de la cible : il est validé dès que
// ses messages le réalisent, et révélé comme raté (sur le 1er message) après TARGET_WINDOW.

// predictId -> { firstMessage, count, timer, queue, done }. Les jugements d'un même predict sont
// sérialisés dans `queue` pour qu'il ne soit révélé qu'une fois.
const windows = new Map();

export function register(client) {
  client.on(name, async (message) => {
    if (message.author.bot) return;
    if (!message.inGuild()) return;

    let rows;
    try {
      rows = await getActivePredictsFor(message.channel.id, message.author.id, 'message');
    } catch (err) {
      console.error('DB error in messageCreate:', err);
      return;
    }
    if (!rows.length) return;

    message.channel.sendTyping().catch(() => {});
    const history = await fetchHistory(message);

    for (const row of rows) {
      let w = windows.get(row.id);
      if (!w) {
        w = { firstMessage: message, count: 0, queue: Promise.resolve(), done: false };
        w.timer = setTimeout(() => enqueue(w, () => finish(row, w, false, w.firstMessage)), TARGET_WINDOW.ms);
        windows.set(row.id, w);
      }
      enqueue(w, () => judge(row, w, message, history));
    }
  });
}

function enqueue(w, task) {
  w.queue = w.queue.then(task).catch((err) => console.error('Predict window error:', err));
}

async function judge(row, w, message, history) {
  if (w.done) return;
  w.count += 1;
  if (await isPredictFulfilled(message, row, history)) return finish(row, w, true, message);
  if (w.count >= TARGET_WINDOW.messages) return finish(row, w, false, w.firstMessage);
}

async function finish(row, w, success, message) {
  if (w.done) return;
  w.done = true;
  clearTimeout(w.timer);
  windows.delete(row.id);
  await resolvePredict(row);
  if (success) await revealSuccess(row, message);
  else await revealFailure(row, message);
  await resolveCounters(row, message);
}

async function revealSuccess(row, message) {
  try {
    const targetAvatarUrl = message.author.displayAvatarURL({ extension: 'png', size: 256 });
    const attachment = await createPuppetMasterAttachment(targetAvatarUrl);

    await message.reply({
      content: `PREDICT : <@${row.authorId}> a prédis <@${message.author.id}>`,
      files: [attachment],
      allowedMentions: { repliedUser: false, parse: ['users'] },
    });
  } catch (err) {
    console.error('Failed to send successful predict reveal:', err);
  }
}

async function revealFailure(row, message) {
  const content = `-# <@${row.authorId}> predicted\n${row.content}`;
  try {
    await message.reply({
      content,
      allowedMentions: { repliedUser: false, parse: [] },
    });
  } catch (err) {
    console.error('Failed to send failed predict reveal:', err);
  }
}

// Résoudre les counters visant cette prédiction qui vient de se terminer
async function resolveCounters(row, message) {
  let counters = [];
  try {
    // On récupère les counters dirigés contre l'auteur de la prédiction (row.authorId) ET qui ciblaient (originalTargetId) l'auteur du message (message.author.id) - ou les anciens counters (null)
    counters = await popActivePredictsFor(message.channel.id, row.authorId, 'counter', null, message.author.id);
  } catch (err) {
    console.error('DB error pour résoudre les counters:', err);
  }

  for (const c of counters) {
    if (await isCounterMatch(c.content, row.content)) {
      // Le counter est un Succès ("Dunk")
      try {
        const counterAuthor = await message.client.users.fetch(c.authorId).catch(() => null);
        const predictAuthor = await message.client.users.fetch(row.authorId).catch(() => null);

        if (counterAuthor && predictAuthor) {
          let originalAvatarUrl = null;
          if (c.originalTargetId && c.originalTargetId !== c.authorId) {
            originalAvatarUrl = message.author.displayAvatarURL({ extension: 'png', size: 256 });
          }
          const attachment = await createDunkAttachment(
            counterAuthor.displayAvatarURL({ extension: 'png', size: 256 }),
            predictAuthor.displayAvatarURL({ extension: 'png', size: 256 }),
            originalAvatarUrl
          );

          await message.channel.send({
            content: `COUNTER : <@${c.authorId}> a contré la prédiction de <@${row.authorId}>`,
            files: [attachment]
          });
        }
      } catch (e) {
        console.error('Failed to send successful counter reveal:', e);
      }
    } else {
      // Le counter est raté
      try {
        await message.channel.send({
          content: `-# <@${c.authorId}> counter-predicted\n${c.content}`,
          allowedMentions: { parse: [] },
        });
      } catch (err) {
        console.error('Failed to send failed counter reveal:', err);
      }
    }
  }
}
