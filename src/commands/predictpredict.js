import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { countTodayMetaPredicts, hasActiveMetaPredict, createMetaPredict } from '../db.js';

const DAILY_LIMIT = 4;
const DAILY_LIMIT_ENABLED = false;

export const data = new SlashCommandBuilder()
  .setName('predictpredict')
  .setDescription('Predict what someone would predict another person is about to say')
  .addUserOption((opt) =>
    opt.setName('target').setDescription('The person whose predict you predict').setRequired(true),
  )
  .addUserOption((opt) =>
    opt
      .setName('target-of-the-target')
      .setDescription('The person who will trigger by speaking')
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName('prediction')
      .setDescription('The message you think target would predict finaltarget says')
      .setRequired(true)
      .setMaxLength(500),
  )
  .setDMPermission(false);

export async function execute(interaction) {
  const target = interaction.options.getUser('target', true);
  const finalTarget = interaction.options.getUser('target-of-the-target', true);
  const message = interaction.options.getString('prediction', true);
  const author = interaction.user;
  const channelId = interaction.channelId;
  const guildId = interaction.guildId;

  const reply = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });

  if (target.bot || finalTarget.bot) {
    return reply("You can't involve PredictGodAI in a predictpredict");
  }
  if (target.id === finalTarget.id) {
    return reply('Target and target-of-the-target must be different people');
  }
  if (target.id === author.id) {
    return reply("You can't predict your own predict");
  }

  if (DAILY_LIMIT_ENABLED) {
    const todayCount = countTodayMetaPredicts(author.id);
    if (todayCount >= DAILY_LIMIT) {
      return reply("You're cooked chief, try again tomorrow 💀");
    }
  }

  if (hasActiveMetaPredict(channelId, author.id, target.id, finalTarget.id)) {
    return reply(
      'You already have a predictpredict active on this chain in this channel, wait for it to resolve',
    );
  }

  try {
    createMetaPredict({
      guildId,
      channelId,
      authorId: author.id,
      targetId: target.id,
      finalTargetId: finalTarget.id,
      message,
    });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return reply(
        'You already have a predictpredict active on this chain in this channel, wait for it to resolve',
      );
    }
    throw err;
  }

  return reply(
    `Predicted that <@${target.id}> would predict "${message}" from <@${finalTarget.id}> 🤫`,
  );
}
