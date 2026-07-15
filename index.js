require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const colors = require('colors');
const fs = require('node:fs');
const path = require('node:path');

colors.enable();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

const loadCommands = () => {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[AVISO] O comando em ${filePath} está faltando a propriedade "data" ou "execute".`
          .yellow.bold
      );
    }
  }
};

const loadEvents = () => {
  const eventsPath = path.join(__dirname, 'events');

  const readEventsInFolder = (folderPath) => {
    const files = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(folderPath, file.name);
      if (file.isDirectory()) {
        readEventsInFolder(fullPath);
      } else if (file.name.endsWith('.js')) {
        const event = require(fullPath);
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }
      }
    }
  };

  const eventFolders = fs.readdirSync(eventsPath);
  for (const folder of eventFolders) {
    const folderPath = path.join(eventsPath, folder);
    readEventsInFolder(folderPath);
  }
};

loadCommands();
loadEvents();

process.on("unhandledRejection", (reason) => {
  console.log(`Erro Detectado:\n\n${reason.stack}`);
});
process.on("uncaughtException", (error) => {
  console.log(`Erro Detectado:\n\n${error.stack}`);
});
process.on("uncaughtExceptionMonitor", (error) => {
  console.log(`Erro Detectado:\n\n${error.stack}`);
});

client.login(process.env.TOKEN);