import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import * as predictCommand from './commands/predict.js';
import * as counterpredictCommand from './commands/counterpredict.js';
import * as interactionCreate from './events/interactionCreate.js';
import * as messageCreate from './events/messageCreate.js';
import * as messageReactionAdd from './events/messageReactionAdd.js';
import { sequelize } from './db.js';
import { deployCommands } from './deploy-commands.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

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
  await sequelize.sync({ alter: true });
  console.log('Database synced');
  
  // Déploiement automatique des commandes Discord
  await deployCommands(clientId, token);
} catch (err) {
  console.error('Failed to sync database:', err);
  process.exit(1);
}

client.login(token);
