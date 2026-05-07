import { Events } from 'discord.js';
import { popActivePredictsFor, normalizeForMatch } from '../db.js';
import { createDunkAttachment } from '../util/generateImage.js';

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
      consumed = await popActivePredictsFor(
        message.channel.id,
        user.id,
        'reaction',
        message.author.id,
      );
    } catch (err) {
      console.error('DB error in messageReactionAdd:', err);
      return;
    }
    if (!consumed.length) return;

    for (const row of consumed) {
      try {
        const customMatch = row.content.match(/^<a?:\w+:(\d+)>$/);
        const reactPayload = customMatch ? customMatch[1] : row.content;
        await message.react(reactPayload);
      } catch (err) {
        console.error('Failed to add predicted reaction:', err);
      }

      // Résoudre les counters visant cette prédiction qui vient de se terminer
      let counters = [];
      try {
        // On récupère les counters dirigés contre l'auteur de la prédiction (row.authorId) ET qui ciblaient (originalTargetId) l'auteur de la réaction (user.id) - ou les anciens counters (null)
        counters = await popActivePredictsFor(message.channel.id, row.authorId, 'counter', null, user.id);
      } catch (err) {
        console.error('DB error pour résoudre les counters:', err);
      }

      for (const c of counters) {
        if (normalizeForMatch(c.content) === normalizeForMatch(row.content)) {
          // Le counter est un Succès ("Dunk")
          try {
            const counterAuthor = await message.client.users.fetch(c.authorId).catch(() => null);
            const predictAuthor = await message.client.users.fetch(row.authorId).catch(() => null);
            
            if (counterAuthor && predictAuthor) {
              const attachment = await createDunkAttachment(
                counterAuthor.displayAvatarURL({ extension: 'png', size: 256 }),
                predictAuthor.displayAvatarURL({ extension: 'png', size: 256 })
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
  });
}
