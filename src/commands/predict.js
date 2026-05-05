import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import {
  countTodayPredicts,
  hasActivePredict,
  createPredict,
  findAndResolveMatchingCounter,
} from '../db.js';
import { validateEmoji } from '../util/emoji.js';

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

  const matchingCounter = await findAndResolveMatchingCounter(channelId, author.id, stored);
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
    return interaction.reply({
      content: `COUNTER : <@${matchingCounter.authorId}> a contré la prédiction de <@${author.id}> https://tenor.com/view/venom-dunking-on-spiderman-gif-26119954`,
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
