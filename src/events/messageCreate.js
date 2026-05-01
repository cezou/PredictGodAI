import { Events, EmbedBuilder } from 'discord.js';
import { popActivePredictsFor } from '../db.js';

export const name = Events.MessageCreate;

export function register(client) {
  client.on(name, async (message) => {
    if (message.author.bot) return;
    if (!message.inGuild()) return;

    let consumed;
    try {
      consumed = popActivePredictsFor(message.channel.id, message.author.id);
    } catch (err) {
      console.error('DB error in messageCreate:', err);
      return;
    }
    if (!consumed.length) return;

    for (const row of consumed) {
      const author = await client.users.fetch(row.author_id).catch(() => null);
      const authorTag = author ? `@${author.username}` : 'Quelqu\'un';

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${authorTag} predicted`,
          iconURL: author?.displayAvatarURL?.() ?? undefined,
        })
        .setDescription(`« ${row.message} »`)
        .setColor(0x2b2d31);

      await message
        .reply({ embeds: [embed], allowedMentions: { repliedUser: false } })
        .catch((err) => console.error('Failed to send predict reveal:', err));
    }
  });
}
