const {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  DiscordAPIError,
} = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const ms = require("ms");

const autoClearFilePath = path.join(
  __dirname,
  "../../database/auto-clear.json"
);

async function checkAndClearChannels(client) {
  try {
    const data = JSON.parse(fs.readFileSync(autoClearFilePath, "utf-8"));
    if (!data.active || !data.channels || data.channels.length === 0) {
      return;
    }

    const now = Date.now();
    let changesMade = false;

    for (const channelConfig of data.channels) {
      const cooldownMs = ms(channelConfig.cooldown);
      if (now - (channelConfig.lastCleaned || 0) < cooldownMs) {
        continue;
      }

      const channel = await client.channels
        .fetch(channelConfig.id)
        .catch(() => null);
      if (!channel || !channel.isTextBased()) {
        console.log(
          `[AUTO-CLEAR] Canal ${channelConfig.id} não encontrado ou não é um canal de texto.`
        );
        continue;
      }

      let totalDeleted = 0;
      let deletedInLoop;

      try {
        do {
          const messages = await channel.messages.fetch({ limit: 100 });
          const messagesToDelete = messages.filter(
            (msg) => now - msg.createdAt < ms("14d")
          );

          if (messagesToDelete.size === 0) {
            break;
          }

          const deleted = await channel.bulkDelete(messagesToDelete, true);
          deletedInLoop = deleted.size;
          totalDeleted += deletedInLoop;
        } while (deletedInLoop > 0);
      } catch (error) {
        if (error instanceof DiscordAPIError && error.code === 50013) {
          console.error(
            `[AUTO-CLEAR] Erro: Permissão negada para limpar o canal ${channel.name} (${channel.id}).`
          );
        } else {
          console.error(
            `[AUTO-CLEAR] Erro ao limpar o canal ${channel.name}:`,
            error
          );
        }
        continue;
      }

      if (totalDeleted > 0) {
        const embed = new EmbedBuilder()
          .setColor("#2f3036")
          .setTitle("Limpeza de Mensagens")
          .setDescription(
            `🧹 Limpeza automática concluída! ${totalDeleted} mensagens foram removidas.`
          )
          .setFooter({
            text: "Limpeza automática",
            iconURL: client.user.displayAvatarURL(),
          })
          .setTimestamp();

        const button = new ButtonBuilder()
          .setCustomId("clear_info_btn")
          .setLabel("Limpeza de Mensagens")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:Relogio:1305593456311140443>")
          .setDisabled(true);

        await channel.send({
          embeds: [embed],
          components: [new ActionRowBuilder().addComponents(button)],
        });
      }

      channelConfig.lastCleaned = now;
      changesMade = true;
    }

    if (changesMade) {
      fs.writeFileSync(autoClearFilePath, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("[AUTO-CLEAR] Erro no processo principal:", error);
  }
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log("[SISTEMA] Módulo de Limpeza Automática iniciado.".green.bold);
    checkAndClearChannels(client);
    setInterval(() => checkAndClearChannels(client), 60000);
  },
};
