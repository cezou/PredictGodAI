import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import * as predictCommand from './commands/predict.js';
import * as predictpredictCommand from './commands/predictpredict.js';
import * as interactionCreate from './events/interactionCreate.js';
import * as messageCreate from './events/messageCreate.js';
import * as messageReactionAdd from './events/messageReactionAdd.js';

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN missing in .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

client.commands = new Collection();
client.commands.set(predictCommand.data.name, predictCommand);
client.commands.set(predictpredictCommand.data.name, predictpredictCommand);

interactionCreate.register(client);
messageCreate.register(client);
messageReactionAdd.register(client);

client.once('clientReady', (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.login(token);
