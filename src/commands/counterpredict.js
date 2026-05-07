import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import {
  countTodayPredicts,
  hasActivePredict,
  createPredict,
  findAndResolveMatchingPredict,
} from '../db.js';
import { createDunkAttachment } from '../util/generateImage.js';

const DAILY_LIMIT = 4;
const DAILY_LIMIT_ENABLED = false;

export const data = new SlashCommandBuilder()
  .setName('counterpredict')
  .setDescription('Counter a prediction someone is about to make')
  .addUserOption((opt) =>
    opt
      .setName('target')
      .setDescription('The person whose prediction you are countering')
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName('predictiontocounter')
      .setDescription('The counter prediction message')
      .setRequired(true)
      .setMaxLength(500),
  )
  .addUserOption((opt) =>
    opt
      .setName('originalpredictiontarget')
      .setDescription('The person they are predicting (defaults to yourself)')
      .setRequired(false),
  )
  .setDMPermission(false);

export async function execute(interaction) {
  const target = interaction.options.getUser('target', true);
  const rawPrediction = interaction.options.getString('predictiontocounter', true);
  const originalPredictionTarget = interaction.options.getUser('originalpredictiontarget') || interaction.user;
  const author = interaction.user;
  const channelId = interaction.channelId;
  const guildId = interaction.guildId;

  const reply = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });

  if (target.bot) {
    return reply("You can't counter-predict the PredictGodAI");
  }
  if (target.id === author.id) {
    return reply("You can't counter-predict yourself");
  }

  const trimmed = rawPrediction.trim();

  if (DAILY_LIMIT_ENABLED) {
    const todayCount = await countTodayPredicts(author.id, 'counter');
    if (todayCount >= DAILY_LIMIT) {
      return reply("You're cooked chief, try again tomorrow 💀");
    }
  }

  const matchingPredict = await findAndResolveMatchingPredict(channelId, target.id, originalPredictionTarget.id, trimmed);
  if (matchingPredict) {
    try {
      await createPredict({
        guildId,
        channelId,
        authorId: author.id,
        targetId: target.id,
        originalTargetId: originalPredictionTarget.id,
        content: trimmed,
        type: 'counter',
        resolvedAt: new Date(),
      });
    } catch (e) {}

    const attachment = await createDunkAttachment(
      author.displayAvatarURL({ extension: 'png', size: 256 }),
      target.displayAvatarURL({ extension: 'png', size: 256 })
    );

    return interaction.reply({
      content: `COUNTER : <@${author.id}> a contré la prédiction de <@${target.id}> (qui prédisait <@${originalPredictionTarget.id}>)`,
      files: [attachment],
    });
  }

  if (await hasActivePredict(channelId, author.id, target.id, 'counter', originalPredictionTarget.id)) {
    return reply(
      `You already have an active counter-predict on this person in this channel, wait for it to resolve`,
    );
  }

  try {
    await createPredict({
      guildId,
      channelId,
      authorId: author.id,
      targetId: target.id,
      originalTargetId: originalPredictionTarget.id,
      content: trimmed,
      type: 'counter',
    });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return reply(
        `You already have an active counter-predict on this person in this channel, wait for it to resolve`,
      );
    }
    throw err;
  }

  return reply(`Counter-predicted "${trimmed}" against <@${target.id}> 🤫`);
}
