import { Events } from 'discord.js';
import { popActiveMessagePredictsFor, popActiveMetaPredictsFor } from '../db.js';

export const name = Events.MessageCreate;

export function register(client) {
  client.on(name, async (message) => {
    if (message.author.bot) return;
    if (!message.inGuild()) return;

    let messagePredicts = [];
    let metaPredicts = [];
    try {
      messagePredicts = popActiveMessagePredictsFor(message.channel.id, message.author.id);
      metaPredicts = popActiveMetaPredictsFor(message.channel.id, message.author.id);
    } catch (err) {
      console.error('DB error in messageCreate:', err);
      return;
    }
    if (!messagePredicts.length && !metaPredicts.length) return;

    const revealByPredicter = new Map();

    for (const row of messagePredicts) {
      const content = `-# <@${row.author_id}> predicted\n${row.message}`;
      try {
        const reveal = await message.reply({
          content,
          allowedMentions: { repliedUser: false, parse: [] },
        });
        revealByPredicter.set(row.author_id, reveal.id);
      } catch (err) {
        console.error('Failed to send predict reveal:', err);
      }
    }

    for (const row of metaPredicts) {
      const content = `-# <@${row.author_id}> predicted that <@${row.target_id}> would predict <@${message.author.id}>\n${row.message}`;
      const parentId = revealByPredicter.get(row.target_id) ?? message.id;
      try {
        await message.channel.send({
          content,
          reply: { messageReference: parentId, failIfNotExists: false },
          allowedMentions: { repliedUser: false, parse: [] },
        });
      } catch (err) {
        console.error('Failed to send metapredict reveal:', err);
      }
    }
  });
}
