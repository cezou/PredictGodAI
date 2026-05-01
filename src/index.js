import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import * as predictCommand from './commands/predict.js';
import * as interactionCreate from './events/interactionCreate.js';
import * as messageCreate from './events/messageCreate.js';

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN manquant dans .env');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.commands = new Collection();
client.commands.set(predictCommand.data.name, predictCommand);

interactionCreate.register(client);
messageCreate.register(client);

client.once('clientReady', (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.login(token);
