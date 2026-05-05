import { Events } from 'discord.js';
import { popActivePredictsFor } from '../db.js';

export const name = Events.MessageCreate;

export function register(client) {
  client.on(name, async (message) => {
    if (message.author.bot) return;
    if (!message.inGuild()) return;

    let messagePredicts = [];
    let counterPredicts = [];
    try {
      messagePredicts = await popActivePredictsFor(
        message.channel.id,
        message.author.id,
        'message',
      );
      counterPredicts = await popActivePredictsFor(
        message.channel.id,
        message.author.id,
        'counter',
      );
    } catch (err) {
      console.error('DB error in messageCreate:', err);
      return;
    }
    if (!messagePredicts.length && !counterPredicts.length) return;

    for (const row of messagePredicts) {
      const content = `-# <@${row.authorId}> predicted\n${row.content}`;
      try {
        await message.reply({
          content,
          allowedMentions: { repliedUser: false, parse: [] },
        });
      } catch (err) {
        console.error('Failed to send predict reveal:', err);
      }
    }

    for (const row of counterPredicts) {
      const content = `-# <@${row.authorId}> counter-predicted\n${row.content}`;
      try {
        await message.reply({
          content,
          allowedMentions: { repliedUser: false, parse: [] },
        });
      } catch (err) {
        console.error('Failed to send counterpredict reveal:', err);
      }
    }
  });
}
