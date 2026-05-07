import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import * as predictCommand from './commands/predict.js';
import * as counterpredictCommand from './commands/counterpredict.js';

const { DISCORD_TOKEN, CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('DISCORD_TOKEN et CLIENT_ID requis dans .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

const commands = [
  predictCommand.data.toJSON(),
  counterpredictCommand.data.toJSON(),
];

console.log(`Deploying ${commands.length} command(s) globally...`);
try {
  const data = await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log(`✅ ${data.length} command(s) registered globally.`);
} catch (err) {
  console.error('Global deployment failed:', err);
  process.exit(1);
}
