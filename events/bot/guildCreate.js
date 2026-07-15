const { Events, REST, Routes } = require("discord.js");
const clientId = process.env.CLIENT_ID;
const token = process.env.TOKEN;
const colors = require("colors");

module.exports = {
  name: Events.GuildCreate,
  async execute(guild, client) {
    const rest = new REST({ version: "10" }).setToken(token);
    const localCommands = client.commands.map((cmd) => cmd.data.toJSON());

    try {
      console.log(
        `[INFO] Registrando comandos para o novo servidor: ${guild.name} (${guild.id})`
          .magenta.bold
      );
      await rest.put(Routes.applicationGuildCommands(clientId, guild.id), {
        body: localCommands,
      });
      console.log(
        `[SUCESSO] Comandos registrados em ${guild.name}.`.green.bold
      );
    } catch (error) {
      console.error(
        `[ERRO] Falha ao registrar comandos em ${guild.name}:`.red.bold,
        error
      );
    }
  },
};
