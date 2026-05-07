import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import * as predictCommand from './commands/predict.js';
import * as counterpredictCommand from './commands/counterpredict.js';
import * as interactionCreate from './events/interactionCreate.js';
import * as messageCreate from './events/messageCreate.js';
import * as messageReactionAdd from './events/messageReactionAdd.js';
import { sequelize } from './db.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildIdEnv = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('DISCORD_TOKEN and CLIENT_ID are missing in .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

client.commands = new Collection();
client.commands.set(predictCommand.data.name, predictCommand);
client.commands.set(counterpredictCommand.data.name, counterpredictCommand);

interactionCreate.register(client);
messageCreate.register(client);
messageReactionAdd.register(client);

client.once('clientReady', (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

try {
  await sequelize.sync();
  console.log('Database synced');

  // Register commands
  const rest = new REST({ version: '10' }).setToken(token);
  const commandsToDeploy = [
    predictCommand.data.toJSON(),
    counterpredictCommand.data.toJSON(),
  ];

  const guildIds = (guildIdEnv ?? '').split(',').map((s) => s.trim()).filter(Boolean);

  if (guildIds.length === 0) {
    console.log(`Deploying ${commandsToDeploy.length} command(s) globally...`);
    const data = await rest.put(Routes.applicationCommands(clientId), { body: commandsToDeploy });
    console.log(`✅ ${data.length} command(s) registered globally.`);
  } else {
    for (const gId of guildIds) {
      console.log(`Deploying ${commandsToDeploy.length} command(s) for guild ${gId}...`);
      const data = await rest.put(Routes.applicationGuildCommands(clientId, gId), {
        body: commandsToDeploy,
      });
      console.log(`✅ ${data.length} command(s) registered for guild ${gId}.`);
    }
  }

} catch (err) {
  console.error('Failed to sync database or deploy commands:', err);
  process.exit(1);
}

client.login(token);
