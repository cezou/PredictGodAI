import { Events } from 'discord.js';
import { popActivePredictsFor, normalizeForMatch } from '../db.js';
import { createPuppetMasterAttachment } from '../util/generateImage.js';

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
