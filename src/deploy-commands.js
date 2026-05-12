import { REST, Routes } from 'discord.js';
import * as predictCommand from './commands/predict.js';
import * as counterpredictCommand from './commands/counterpredict.js';
import * as listCommand from './commands/list.js';

export async function deployCommands(clientId, token) {
  const rest = new REST({ version: '10' }).setToken(token);

  const commands = [
    predictCommand.data.toJSON(),
    counterpredictCommand.data.toJSON(),
    listCommand.data.toJSON(),
  ];

  console.log(`Deploying ${commands.length} command(s) globally...`);
  try {
    const data = await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log(`✅ ${data.length} command(s) registered globally.`);
  } catch (err) {
    console.error('Global deployment failed:', err);
    throw err;
  }
}
