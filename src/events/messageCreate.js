import { Events } from 'discord.js';
import { popActivePredictsFor, normalizeForMatch } from '../db.js';
import { createPuppetMasterAttachment, createDunkAttachment } from '../util/generateImage.js';

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
    } catch (err) {
      console.error('DB error in messageCreate:', err);
      return;
    }
    if (!messagePredicts.length) return;

    const normalizedMessage = normalizeForMatch(message.content);

    for (const row of messagePredicts) {
      const normalizedPredict = normalizeForMatch(row.content);
      const isMatch = normalizedMessage === normalizedPredict;

      if (isMatch) {
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
      } else {
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
      let counters = [];
      try {
        // On récupère les counters dirigés contre l'auteur de la prédiction (row.authorId) ET qui ciblaient (originalTargetId) l'auteur du message (message.author.id) - ou les anciens counters (null)
        counters = await popActivePredictsFor(message.channel.id, row.authorId, 'counter', null, message.author.id);
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
  });
}
