const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const owner = process.env.OWNER;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("botconfig")
    .setDescription("Abre o painel de configurações do bot. (Apenas Dono)"),
  async execute(interaction) {
    if (interaction.user.id !== owner) {
      return interaction.reply({
        content: "Este comando só pode ser usado pelo dono do bot.",
        flags: [MessageFlags.Ephemeral],
      });
    }

    const promptButton = new ButtonBuilder()
      .setCustomId("config_prompt_btn")
      .setLabel("Configurar Prompt")
      .setEmoji("<:configbot:1305593471285067776>")
      .setStyle(ButtonStyle.Secondary);

    const channelsButton = new ButtonBuilder()
      .setCustomId("config_channels_panel_btn")
      .setLabel("Configurar Canais")
      .setEmoji("<:configbot:1305593471285067776>")
      .setStyle(ButtonStyle.Secondary);

    const customizeButton = new ButtonBuilder()
      .setCustomId("customize_bot_panel_btn")
      .setLabel("Personalizar BOT")
      .setEmoji("<:robo:1305672475459326054>")
      .setStyle(ButtonStyle.Secondary);

    const autoClearButton = new ButtonBuilder()
      .setCustomId("auto_clear_panel_btn")
      .setLabel("Limpeza Automática")
      .setEmoji("<:Relogio:1305593456311140443>")
      .setStyle(ButtonStyle.Secondary);

    const resetButton = new ButtonBuilder()
      .setCustomId("reset_history_btn")
      .setLabel("Resetar Histórico")
      .setEmoji("1309962546718969908")
      .setStyle(ButtonStyle.Danger);

    const row1 = new ActionRowBuilder().addComponents(
      promptButton,
      channelsButton,
      customizeButton
    );
    const row2 = new ActionRowBuilder().addComponents(
      autoClearButton,
      resetButton
    );

    await interaction.reply({
      content: "Olá! Seja bem-vindo a configuração do seu BOT de Ticket.",
      components: [row1, row2],
      flags: [MessageFlags.Ephemeral],
    });
  },
};