import { Events } from 'discord.js';
import { popActiveMessagePredictsFor } from '../db.js';

export const name = Events.MessageCreate;

export function register(client) {
  client.on(name, async (message) => {
    if (message.author.bot) return;
    if (!message.inGuild()) return;

    let consumed;
    try {
      consumed = popActiveMessagePredictsFor(message.channel.id, message.author.id);
    } catch (err) {
      console.error('DB error in messageCreate:', err);
      return;
    }
    if (!consumed.length) return;

    for (const row of consumed) {
      const content = `-# <@${row.author_id}> predicted\n${row.message}`;

      await message
        .reply({
          content,
          allowedMentions: { repliedUser: false, parse: [] },
        })
        .catch((err) => console.error('Failed to send predict reveal:', err));
    }
  });
}
