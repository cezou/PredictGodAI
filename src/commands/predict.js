import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { countTodayPredicts, hasActivePredict, createPredict } from "../db.js";

const DAILY_LIMIT = 4;
const DAILY_LIMIT_ENABLED = false;

export const data = new SlashCommandBuilder()
  .setName("predict")
  .setDescription("Predict what someone is about to say in this channel")
  .addUserOption((opt) =>
    opt
      .setName("target")
      .setDescription("The person to predict")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("message")
      .setDescription("The message you predict")
      .setRequired(true)
      .setMaxLength(500),
  )
  .setDMPermission(false);

export async function execute(interaction) {
  const target = interaction.options.getUser("target", true);
  const message = interaction.options.getString("message", true);
  const author = interaction.user;
  const channelId = interaction.channelId;
  const guildId = interaction.guildId;

  const reply = (content) =>
    interaction.reply({ content, flags: MessageFlags.Ephemeral });

  if (target.bot) {
    return reply("You can't predict the PredictGodAI");
  }
  if (target.id === author.id) {
    return reply("You can't predict yourself, unless you are the PredictGodAI");
  }

  if (DAILY_LIMIT_ENABLED) {
    const todayCount = countTodayPredicts(author.id);
    if (todayCount >= DAILY_LIMIT) {
      return reply("You're cooked chief, try again tomorrow 💀");
    }
  }

  if (hasActivePredict(channelId, author.id, target.id)) {
    return reply(
      `You can't predict twice a same people, wait for him to answer, we never know I swear`,
    );
  }

  try {
    createPredict({
      guildId,
      channelId,
      authorId: author.id,
      targetId: target.id,
      message,
    });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return reply(
        `You can't predict twice a same people, wait for him to answer, we never know I swear`,
      );
    }
    throw err;
  }

  return reply(`Predicted "${message}" from <@${target.id}> 🤫`);
}
