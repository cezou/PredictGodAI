import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getUserActivePredicts, deletePredicts } from '../db.js';

function truncate(str, n) {
  return (str.length > n) ? str.slice(0, n - 1) + '…' : str;
}

export const data = new SlashCommandBuilder()
  .setName('list')
  .setDescription('List your active predictions and optionally delete them')
  .setDMPermission(false);

export async function execute(interaction) {
  const authorId = interaction.user.id;
  const guildId = interaction.guildId;
  const currentChannelId = interaction.channelId;

  const getUpdatedPayload = async () => {
    let predicts = await getUserActivePredicts(authorId, guildId);
    
    if (predicts.length === 0) {
      return { content: "You have no active predictions.", embeds: [], components: [] };
    }

    // Discord limits strings Select Menu to 25 items max.
    if (predicts.length > 25) {
      predicts = predicts.slice(0, 25);
    }

    // Sort predictions
    predicts.sort((a, b) => {
      // 1. Current channel matches
      if (a.channelId === currentChannelId && b.channelId !== currentChannelId) return -1;
      if (a.channelId !== currentChannelId && b.channelId === currentChannelId) return 1;
      // 2. Then by channel
      if (a.channelId < b.channelId) return -1;
      if (a.channelId > b.channelId) return 1;
      // 3. Then by type
      if (a.type < b.type) return -1;
      if (a.type > b.type) return 1;
      // 4. Then by date (older first)
      return a.createdAt - b.createdAt;
    });

    let description = '';
    let currentChannelGrp = null;

    for (const p of predicts) {
      if (p.channelId !== currentChannelGrp) {
        if (description.length > 0) description += '\n\n';
        description += `Channel: <#${p.channelId}>\n`;
        currentChannelGrp = p.channelId;
      } else {
        description += '\n\n';
      }

      if (p.type === 'counter') {
        description += `Counterpredicted "${p.content}" from <@${p.targetId}> to <@${p.originalTargetId}>`;
      } else if (p.type === 'reaction') {
        description += `Predicted the "${p.content}" reaction from <@${p.targetId}>`;
      } else {
        description += `Predicted "${p.content}" from <@${p.targetId}>`;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('Your Active Predictions')
      .setColor('#0099ff')
      .setDescription(description);

    const options = predicts.map(p => {
      let typeLabel = 'Message';
      if (p.type === 'reaction') typeLabel = 'Reaction';
      if (p.type === 'counter') typeLabel = 'Counter';
      const label = truncate(`${typeLabel} on target - ${p.content}`, 90); 
      return {
        label: label,
        description: truncate(`ID: ${p.id} | In channel #${p.channelId}`, 100),
        value: p.id.toString(),
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('delete_predicts_menu')
      .setPlaceholder('Select predictions to cancel...')
      .setMinValues(1)
      .setMaxValues(options.length)
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return { content: '', embeds: [embed], components: [row] };
  };

  const payload = await getUpdatedPayload();
  const response = await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });

  if (payload.components.length === 0) return;

  const collector = response.createMessageComponentCollector({
    filter: i => i.user.id === authorId,
    time: 120000 // 2 minutes
  });

  collector.on('collect', async i => {
    if (i.customId === 'delete_predicts_menu') {
      const idsToDelete = i.values; // Array of string ids selected
      await deletePredicts(idsToDelete, authorId);
      
      const newPayload = await getUpdatedPayload();
      await i.update(newPayload);
    }
  });

  collector.on('end', async () => {
    // Optionally clean up the select menu when time expires
    const oldPayload = await getUpdatedPayload();
    if (oldPayload.components.length > 0) {
      await response.edit({ components: [] }).catch(() => {});
    }
  });
}