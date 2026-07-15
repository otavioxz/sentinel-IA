const {
  Events,
  REST,
  Routes,
  ActivityType,
  PresenceUpdateStatus,
} = require("discord.js");
const clientId = process.env.CLIENT_ID;
const token = process.env.TOKEN;
const colors = require("colors");
const fs = require("node:fs");
const path = require("node:path");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(readyClient) {
    console.log(`Pronto! Logado como ${readyClient.user.tag}`.blue.bold);

    try {
      const dbConfigPath = path.join(__dirname, "../../database/config.json");
      const dbConfig = JSON.parse(fs.readFileSync(dbConfigPath, "utf-8"));

      if (dbConfig.status) {
        let activityType;
        switch (dbConfig.status.activityType) {
          case "Streaming":
            activityType = ActivityType.Streaming;
            break;
          case "Listening":
            activityType = ActivityType.Listening;
            break;
          case "Watching":
            activityType = ActivityType.Watching;
            break;
          case "Competing":
            activityType = ActivityType.Competing;
            break;
          default:
            activityType = ActivityType.Playing;
            break;
        }

        let onlineStatus;
        switch (dbConfig.status.onlineStatus) {
          case "idle":
            onlineStatus = PresenceUpdateStatus.Idle;
            break;
          case "dnd":
            onlineStatus = PresenceUpdateStatus.DoNotDisturb;
            break;
          default:
            onlineStatus = PresenceUpdateStatus.Online;
            break;
        }

        const activity = { name: dbConfig.status.activityName, type: activityType };
        if (activityType === ActivityType.Streaming) {
          activity.url = dbConfig.status.streamUrl || "https://twitch.tv/discord";
        }

        readyClient.user.setPresence({
          activities: [activity],
          status: onlineStatus,
        });
        console.log(
          "[STATUS] Status personalizado carregado com sucesso.".magenta.bold
        );
      }
    } catch (error) {
      console.error(
        "[ERRO] Falha ao carregar status personalizado.".red.bold,
        error
      );
    }

    const rest = new REST({ version: "10" }).setToken(token);
    const localCommands = readyClient.commands.map((command) =>
      command.data.toJSON()
    );
    try {
      await readyClient.guilds.cache.forEach(async (guild) => {
        try {
          await rest.put(Routes.applicationGuildCommands(clientId, guild.id), {
            body: [],
          });
        } catch (err) {}
      });
      const data = await rest.put(Routes.applicationCommands(clientId), {
        body: localCommands,
      });
      console.log(
        `[SUCESSO] Sincronizados ${data.length} comandos (/) globais.`.green
          .bold
      );
    } catch (error) {
      console.error("[ERRO DE SINCRONIZAÇÃO]".red.bold, error);
    }
  },
};
