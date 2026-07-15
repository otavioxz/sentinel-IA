const {
  SlashCommandBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const owner = process.env.OWNER;
const fs = require("fs");
const path = require("path");

const ticketConfigPath = path.join(__dirname, "../database/ticket-config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("painel-ticket")
    .setDescription("Abre o painel de configurações do sistema de tickets."),
  async execute(interaction) {
    if (interaction.user.id !== owner) {
      return interaction.reply({
        content: "Este comando só pode ser usado pelo dono do bot.",
        flags: [MessageFlags.Ephemeral],
      });
    }

    const config = JSON.parse(fs.readFileSync(ticketConfigPath, "utf-8"));

    const toggleSystem = new ButtonBuilder()
      .setCustomId("ticket_toggle_system")
      .setLabel(config.active ? "Sistema Ligado" : "Sistema Desligado")
      .setEmoji(config.active ? "<:accept:1305153239821324319>" : "<:xx1:1306694256559128637>")
      .setStyle(config.active ? ButtonStyle.Success : ButtonStyle.Danger);

    const configEmbed = new ButtonBuilder()
      .setCustomId("ticket_config_embed")
      .setLabel("Configurar Embed")
      .setEmoji("<:configbot:1305593471285067776>")
      .setStyle(ButtonStyle.Secondary);

    const supportRoles = new ButtonBuilder()
      .setCustomId("ticket_support_roles")
      .setLabel("Cargos de Suporte")
      .setEmoji("<:ed55:1309962440372649984>")
      .setStyle(ButtonStyle.Secondary);

    const configPrompt = new ButtonBuilder()
      .setCustomId("ticket_config_prompt")
      .setLabel("Configurar Prompt AI")
      .setEmoji("<:1245149003012902985:1305152392828031027>")
      .setStyle(ButtonStyle.Secondary);

    const configLogs = new ButtonBuilder()
      .setCustomId("ticket_config_logs")
      .setLabel("Configurar Logs")
      .setEmoji("<:SinoStorm:1306981122852388904>")
      .setStyle(ButtonStyle.Secondary);

    const sendPanel = new ButtonBuilder()
      .setCustomId("ticket_send_panel")
      .setLabel("Enviar Painel")
      .setEmoji("<:accept:1305153239821324319>")
      .setStyle(ButtonStyle.Primary);

    const row1 = new ActionRowBuilder().addComponents(
      toggleSystem,
      configEmbed,
      supportRoles
    );
    const row2 = new ActionRowBuilder().addComponents(
      configPrompt,
      configLogs,
      sendPanel
    );

    await interaction.reply({
      content: "Painel de controle do sistema de tickets:",
      components: [row1, row2],
      flags: [MessageFlags.Ephemeral],
    });
  },
};
