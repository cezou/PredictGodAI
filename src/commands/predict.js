import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import {
  countTodayPredicts,
  hasActivePredict,
  createPredict,
  popActivePredictsFor,
  normalizeForMatch
} from '../db.js';
import { validateEmoji } from '../util/emoji.js';
import { createDunkAttachment } from '../util/generateImage.js';

const DAILY_LIMIT = 4;
const DAILY_LIMIT_ENABLED = false;

export const data = new SlashCommandBuilder()
  .setName('predict')
  .setDescription('Predict what someone is about to say or react with in this channel')
  .addUserOption((opt) =>
    opt.setName('target').setDescription('The person to predict').setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName('prediction')
      .setDescription('A message, or a single emoji to predict a reaction')
      .setRequired(true)
      .setMaxLength(500),
  )
  .setDMPermission(false);

export async function execute(interaction) {
  const target = interaction.options.getUser('target', true);
  const rawPrediction = interaction.options.getString('prediction', true);
  const author = interaction.user;
  const channelId = interaction.channelId;
  const guildId = interaction.guildId;

  const reply = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });

  if (target.bot) {
    return reply("You can't predict the PredictGodAI");
  }
  if (target.id === author.id) {
    return reply("You can't predict yourself, unless you are the PredictGodAI");
  }

  const trimmed = rawPrediction.trim();
  const emoji = await validateEmoji(trimmed, interaction.guild);
  const type = emoji ? 'reaction' : 'message';
  const stored = emoji ? emoji.raw : rawPrediction;

  if (DAILY_LIMIT_ENABLED) {
    const todayCount = await countTodayPredicts(author.id, type);
    if (todayCount >= DAILY_LIMIT) {
      return reply("You're cooked chief, try again tomorrow 💀");
    }
  }

  const counterPredicts = await popActivePredictsFor(channelId, author.id, 'counter', target.id);
  const normalized = normalizeForMatch(stored);
  let matchingCounter = null;
  const failedCounters = [];

  for (const c of counterPredicts) {
    if (normalizeForMatch(c.content) === normalized) {
      matchingCounter = c;
    } else {
      failedCounters.push(c);
    }
  }

  if (matchingCounter) {
    try {
      await createPredict({
        guildId,
        channelId,
        authorId: author.id,
        targetId: target.id,
        content: stored,
        type,
        resolvedAt: new Date(),
      });
    } catch (e) {}
    
    // L'auteur du counter est celui qui dunk, l'auteur de l'interaction (predict) est celui qui se fait dunk
    const counterAuthor = await interaction.client.users.fetch(matchingCounter.authorId).catch(() => target);
    const attachment = await createDunkAttachment(
      counterAuthor.displayAvatarURL({ extension: 'png', size: 256 }),
      author.displayAvatarURL({ extension: 'png', size: 256 })
    );

    return interaction.reply({
      content: `COUNTER : <@${matchingCounter.authorId}> a contré la prédiction de <@${author.id}>`,
      files: [attachment]
    });
  }

  if (await hasActivePredict(channelId, author.id, target.id, type)) {
    return reply(
      `You can't predict twice a same people, wait for him to answer, we never know I swear`,
    );
  }

  try {
    await createPredict({
      guildId,
      channelId,
      authorId: author.id,
      targetId: target.id,
  // Affichage des counters ratés s'il y en a, on les envoie dans le channel séparément
  for (const row of failedCounters) {
    const content = `-# <@${row.authorId}> counter-predicted\n${row.content}`;
    try {
      await interaction.channel.send({
        content,
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      console.error('Failed to send counterpredict reveal:', err);
    }
  }

      content: stored,
      type,
    });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return reply(
        `You can't predict twice a same people, wait for him to answer, we never know I swear`,
      );
    }
    throw err;
  }

  if (type === 'reaction') {
    return reply(`Predicted ${emoji.display} reaction from <@${target.id}> 🤫`);
  }
  return reply(`Predicted "${rawPrediction}" from <@${target.id}> 🤫`);
}
