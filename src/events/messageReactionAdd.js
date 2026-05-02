import { Events } from 'discord.js';
import { popActiveReactionPredictsFor } from '../db.js';

export const name = Events.MessageReactionAdd;

export function register(client) {
  client.on(name, async (reaction, user) => {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch {
        return;
      }
    }
    if (user.partial) {
      try {
        await user.fetch();
      } catch {
        return;
      }
    }

    if (user.bot) return;

    const message = reaction.message;
    if (!message?.guildId) return;

    if (message.partial) {
      try {
        await message.fetch();
      } catch {
        return;
      }
    }
    if (!message.author || message.author.bot) return;
    if (message.author.id === user.id) return;

    let consumed;
    try {
      consumed = popActiveReactionPredictsFor(message.channel.id, user.id, message.author.id);
    } catch (err) {
      console.error('DB error in messageReactionAdd:', err);
      return;
    }
    if (!consumed.length) return;

    for (const row of consumed) {
      try {
        const customMatch = row.message.match(/^<a?:\w+:(\d+)>$/);
        const reactPayload = customMatch ? customMatch[1] : row.message;
        await message.react(reactPayload);
      } catch (err) {
        console.error('Failed to add predicted reaction:', err);
      }
    }
  });
}
