const {
  Events,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ChannelType,
  ThreadAutoArchiveDuration,
  ChannelSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  UserSelectMenuBuilder,
} = require("discord.js");
const fs = require("node:fs/promises");
const path = require("node:path");
const owner = process.env.OWNER;

const ticketConfigPath = path.join(
  __dirname,
  "../../database/ticket-config.json"
);
const activeTicketsPath = path.join(
  __dirname,
  "../../database/active-tickets.json"
);

async function getTicketConfig() {
  const data = await fs.readFile(ticketConfigPath, "utf-8");
  return JSON.parse(data);
}

async function getActiveTickets() {
  const data = await fs.readFile(activeTicketsPath, "utf-8");
  return JSON.parse(data);
}

function createMainMenu(config) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_toggle_system")
      .setEmoji(
        config.active
          ? "<:accept:1305153239821324319>"
          : "<:xx1:1306694256559128637>"
      )
      .setLabel(config.active ? "Sistema Ligado" : "Sistema Desligado")
      .setStyle(config.active ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("ticket_config_embed")
      .setEmoji("<:configbot:1305593471285067776>")
      .setLabel("Configurar Embed")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ticket_support_roles")
      .setEmoji("<:ed55:1309962440372649984>")
      .setLabel("Cargos de Suporte")
      .setStyle(ButtonStyle.Secondary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_config_prompt")
      .setEmoji("<:1245149003012902985:1305152392828031027>")
      .setLabel("Configurar Prompt AI")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ticket_config_logs")
      .setEmoji("<:SinoStorm:1306981122852388904>")
      .setLabel("Configurar Logs")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ticket_send_panel")
      .setEmoji("<:accept:1305153239821324319>")
      .setLabel("Enviar Painel")
      .setStyle(ButtonStyle.Primary)
  );
  return [row1, row2];
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName !== "painel-ticket"
    )
      return;
    if (
      interaction.customId &&
      !interaction.customId.startsWith("ticket_") &&
      ![
        "create_ticket_btn",
        "attend_ticket_btn",
        "delete_ticket_btn",
        "ticket_add_member",
      ].includes(interaction.customId)
    )
      return;
    if (!interaction.isChatInputCommand() && !interaction.customId) return;

    const { customId } = interaction;

    if (interaction.isButton()) {
      const isOwnerAction = customId.startsWith("ticket_");
      if (isOwnerAction && interaction.user.id !== owner) {
        if (!interaction.replied && !interaction.deferred) {
          return interaction.reply({
            content: "Você não tem permissão para usar este painel.",
            flags: [MessageFlags.Ephemeral],
          });
        }
        return;
      }

      if (
        [
          "create_ticket_btn",
          "attend_ticket_btn",
          "delete_ticket_btn",
          "ticket_add_member",
        ].includes(customId)
      ) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        }

        const config = await getTicketConfig();
        const activeTickets = await getActiveTickets();

        if (customId === "create_ticket_btn") {
          if (!config.active)
            return interaction.editReply({
              content: "O sistema de tickets está desativado no momento.",
            });
          if (
            Object.values(activeTickets).some(
              (t) => t.owner_id === interaction.user.id
            )
          )
            return interaction.editReply({
              content: "Você já possui um ticket aberto.",
            });

          const thread = await interaction.channel.threads.create({
            name: `📪・ticket-${interaction.user.username}`,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
            type: ChannelType.PrivateThread,
          });
          await thread.members.add(interaction.user.id);

          const supportRolesMention = config.support_roles
            .map((r) => `<@&${r}>`)
            .join(" ");
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("attend_ticket_btn")
              .setEmoji("<:accept:1305153239821324319>")
              .setLabel("Atender Ticket")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId("delete_ticket_btn")
              .setEmoji("<:delete:1306690936272588830>")
              .setLabel("Excluir Ticket")
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId("ticket_add_member")
              .setEmoji("<:adicionar:1305243177803972781>")
              .setLabel("Adicionar Membro")
              .setStyle(ButtonStyle.Secondary)
          );
          const embed = new EmbedBuilder()
            .setColor(config.panel_embed.color)
            .setTitle("👋 Bem-vindo ao seu Ticket!")
            .setDescription(
              `Enquanto isso, nossa inteligência artificial tentará te ajudar. Por favor, descreva seu problema.`
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({
              text: "Sistema de Tickets",
              iconURL: client.user.displayAvatarURL(),
            })
            .setTimestamp();

          await thread.send({
            content: `Olá ${interaction.user}, um membro da equipe de suporte ${supportRolesMention} estará com você em breve.`,
            embeds: [embed],
            components: [row],
          });

          activeTickets[thread.id] = {
            owner_id: interaction.user.id,
            status: "open",
          };
          await fs.writeFile(
            activeTicketsPath,
            JSON.stringify(activeTickets, null, 2)
          );

          await interaction.editReply({
            content: `Seu ticket foi criado em ${thread}.`,
          });

          if (config.logs_active && config.log_channel_id) {
            const logChannel = await client.channels
              .fetch(config.log_channel_id)
              .catch(() => null);
            if (logChannel)
              logChannel.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("✨ Ticket Criado")
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .addFields(
                      { name: "Ticket", value: `${thread}`, inline: true },
                      {
                        name: "Criado por",
                        value: `${interaction.user}`,
                        inline: true,
                      }
                    )
                    .setFooter({
                      text: "Sistema de Tickets",
                      iconURL: client.user.displayAvatarURL(),
                    })
                    .setTimestamp(),
                ],
              });
          }
          return;
        }

        const ticket = activeTickets[interaction.channelId];
        if (!ticket)
          return interaction.editReply({
            content: "Este ticket não é mais válido.",
          });

        const member = await interaction.guild.members.fetch(
          interaction.user.id
        );
        if (
          !member.roles.cache.some((r) =>
            config.support_roles.includes(r.id)
          ) &&
          interaction.user.id !== owner
        ) {
          return interaction.editReply({
            content: "Você não tem permissão para usar este botão.",
          });
        }

        if (customId === "attend_ticket_btn") {
          if (ticket.status === "attended")
            return interaction.editReply({
              content: "Este ticket já foi atendido.",
            });

          ticket.status = "attended";
          await fs.writeFile(
            activeTicketsPath,
            JSON.stringify(activeTickets, null, 2)
          );

          const newRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("attend_ticket_btn")
              .setEmoji("<:accept:1305153239821324319>")
              .setLabel("Ticket Atendido")
              .setStyle(ButtonStyle.Success)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId("delete_ticket_btn")
              .setEmoji("<:delete:1306690936272588830>")
              .setLabel("Excluir Ticket")
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId("ticket_add_member")
              .setEmoji("<:adicionar:1305243177803972781>")
              .setLabel("Adicionar Membro")
              .setStyle(ButtonStyle.Secondary)
          );
          await interaction.message.edit({ components: [newRow] });

          const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("✅ Atendimento Iniciado")
            .setDescription(
              `${interaction.user} está cuidando do seu ticket agora.`
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({
              text: "Sistema de Tickets",
              iconURL: client.user.displayAvatarURL(),
            })
            .setTimestamp();
          await interaction.channel.send({ embeds: [embed] });
          await interaction.deleteReply();

          const ticketOwner = await client.users
            .fetch(ticket.owner_id)
            .catch(() => {});
          if (ticketOwner)
            ticketOwner
              .send(
                `Seu ticket no servidor **${interaction.guild.name}** está sendo atendido por **${interaction.user.username}**!`
              )
              .catch(() => {});

          if (config.logs_active && config.log_channel_id) {
            const logChannel = await client.channels
              .fetch(config.log_channel_id)
              .catch(() => null);
            if (logChannel)
              logChannel.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("🎟️ Ticket Atendido")
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .addFields(
                      {
                        name: "Ticket",
                        value: `${interaction.channel}`,
                        inline: true,
                      },
                      {
                        name: "Atendido por",
                        value: `${interaction.user}`,
                        inline: true,
                      }
                    )
                    .setFooter({
                      text: "Sistema de Tickets",
                      iconURL: client.user.displayAvatarURL(),
                    })
                    .setTimestamp(),
                ],
              });
          }
        } else if (customId === "delete_ticket_btn") {
          await interaction.editReply({
            content: `O ticket será excluído em 5 segundos por ${interaction.user}.`,
          });
          if (config.logs_active && config.log_channel_id) {
            const ticketOwner = await client.users
              .fetch(ticket.owner_id)
              .catch(() => null);
            const logChannel = await client.channels
              .fetch(config.log_channel_id)
              .catch(() => null);
            if (logChannel && ticketOwner)
              logChannel.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("🗑️ Ticket Excluído")
                    .setThumbnail(ticketOwner.displayAvatarURL())
                    .addFields(
                      {
                        name: "Dono do Ticket",
                        value: `${ticketOwner}`,
                        inline: true,
                      },
                      {
                        name: "Excluído por",
                        value: `${interaction.user}`,
                        inline: true,
                      }
                    )
                    .setFooter({
                      text: "Sistema de Tickets",
                      iconURL: client.user.displayAvatarURL(),
                    })
                    .setTimestamp(),
                ],
              });
          }
          delete activeTickets[interaction.channelId];
          await fs.writeFile(
            activeTicketsPath,
            JSON.stringify(activeTickets, null, 2)
          );
          setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        } else if (customId === "ticket_add_member") {
          const selectMenu = new UserSelectMenuBuilder()
            .setCustomId("ticket_add_member_select")
            .setPlaceholder("Selecione um membro para adicionar");
          await interaction.editReply({
            content: "Selecione o membro que deseja adicionar:",
            components: [new ActionRowBuilder().addComponents(selectMenu)],
          });
        }
        return;
      }

      if (isOwnerAction) {
        const config = await getTicketConfig();
        if (
          customId === "ticket_send_panel" ||
          customId === "ticket_view_log_channel"
        ) {
          if (!interaction.replied && !interaction.deferred) {
            if (customId === "ticket_send_panel") {
              return interaction.reply({
                content: "Selecione onde o painel de ticket deve ser enviado:",
                components: [
                  new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                      .setCustomId("ticket_select_channel_for_panel")
                      .setPlaceholder("Selecione o canal para enviar o painel")
                  ),
                ],
                flags: [MessageFlags.Ephemeral],
              });
            } else {
              return interaction.reply({
                content: config.log_channel_id
                  ? `O canal de logs atual é <#${config.log_channel_id}>.`
                  : "Nenhum canal de logs está configurado.",
                flags: [MessageFlags.Ephemeral],
              });
            }
          }
          return;
        }

        const modalTriggers = [
          "ticket_config_prompt",
          "ticket_edit_embed_title",
          "ticket_edit_embed_desc",
          "ticket_edit_embed_color",
          "ticket_add_role",
          "ticket_remove_role",
          "ticket_set_log_channel",
        ];
        if (modalTriggers.includes(customId)) {
          const modal = new ModalBuilder().setTitle("Configuração de Ticket");
          let input;
          switch (customId) {
            case "ticket_config_prompt":
              modal.setCustomId("ticket_modal_prompt");
              input = new TextInputBuilder()
                .setCustomId("ticket_input")
                .setLabel("Prompt da IA")
                .setStyle(TextInputStyle.Paragraph)
                .setValue(config.ai_prompt || "");
              break;
            case "ticket_edit_embed_title":
              modal.setCustomId("ticket_modal_title");
              input = new TextInputBuilder()
                .setCustomId("ticket_input")
                .setLabel("Título da Embed")
                .setStyle(TextInputStyle.Short)
                .setValue(config.panel_embed.title);
              break;
            case "ticket_edit_embed_desc":
              modal.setCustomId("ticket_modal_desc");
              input = new TextInputBuilder()
                .setCustomId("ticket_input")
                .setLabel("Descrição da Embed")
                .setStyle(TextInputStyle.Paragraph)
                .setValue(config.panel_embed.description);
              break;
            case "ticket_edit_embed_color":
              modal.setCustomId("ticket_modal_color");
              input = new TextInputBuilder()
                .setCustomId("ticket_input")
                .setLabel("Cor Hexadecimal da Embed")
                .setStyle(TextInputStyle.Short)
                .setValue(config.panel_embed.color);
              break;
            case "ticket_add_role":
              modal.setCustomId("ticket_modal_add_role");
              input = new TextInputBuilder()
                .setCustomId("ticket_input")
                .setLabel("ID do Cargo de Suporte")
                .setStyle(TextInputStyle.Short);
              break;
            case "ticket_remove_role":
              modal.setCustomId("ticket_modal_remove_role");
              input = new TextInputBuilder()
                .setCustomId("ticket_input")
                .setLabel("ID do Cargo a ser Removido")
                .setStyle(TextInputStyle.Short);
              break;
            case "ticket_set_log_channel":
              modal.setCustomId("ticket_modal_set_log");
              input = new TextInputBuilder()
                .setCustomId("ticket_input")
                .setLabel("ID do Canal de Logs")
                .setStyle(TextInputStyle.Short);
              break;
          }
          if (input) {
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
          }
          return;
        }

        if (!interaction.replied && !interaction.deferred) {
          await interaction.deferUpdate();
        }

        if (customId.startsWith("ticket_view_roles_")) {
          const page = parseInt(customId.split("_")[3]) || 0;
          const roles = config.support_roles || [];
          if (roles.length === 0)
            return interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle("Cargos de Suporte")
                  .setDescription("Nenhum cargo configurado.")
                  .setColor(config.panel_embed.color),
              ],
              components: [],
            });
          const ROLES_PER_PAGE = 5;
          const totalPages = Math.ceil(roles.length / ROLES_PER_PAGE);
          const pageRoles = roles.slice(
            page * ROLES_PER_PAGE,
            (page + 1) * ROLES_PER_PAGE
          );
          const embed = new EmbedBuilder()
            .setTitle("Cargos de Suporte")
            .setDescription(
              pageRoles
                .map(
                  (r, i) =>
                    `${page * ROLES_PER_PAGE + i + 1}. <@&${r}> (\`${r}\`)`
                )
                .join("\n")
            )
            .setColor(config.panel_embed.color)
            .setFooter({ text: `Página ${page + 1} de ${totalPages}` });
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`ticket_view_roles_${page - 1}`)
              .setEmoji("<:icoutlinearrowback:1397063579483508837>")
              .setLabel("Anterior")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === 0),
            new ButtonBuilder()
              .setCustomId(`ticket_view_roles_${page + 1}`)
              .setEmoji("<:icsharparrowforward1:1397063432494387251>")
              .setLabel("Próximo")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page + 1 >= totalPages),
            new ButtonBuilder()
              .setCustomId("ticket_support_roles")
              .setEmoji("<:emoji_45:1305590970062082078>")
              .setLabel("Voltar ao Painel")
              .setStyle(ButtonStyle.Primary)
          );
          return interaction.editReply({ embeds: [embed], components: [row] });
        }

        switch (customId) {
          case "ticket_toggle_system":
          case "ticket_back_to_main": {
            let currentConfig = config;
            if (customId === "ticket_toggle_system") {
              currentConfig.active = !currentConfig.active;
              await fs.writeFile(
                ticketConfigPath,
                JSON.stringify(currentConfig, null, 2)
              );
            }
            return interaction.editReply({
              content: "Painel de controle do sistema de tickets:",
              embeds: [],
              components: createMainMenu(currentConfig),
            });
          }
          case "ticket_config_embed": {
            const backButton = new ButtonBuilder()
              .setCustomId("ticket_back_to_main")
              .setEmoji("<:emoji_45:1305590970062082078>")
              .setLabel("Voltar")
              .setStyle(ButtonStyle.Primary);
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("ticket_edit_embed_title")
                .setEmoji("<:lapis:1305591472887959663>")
                .setLabel("Editar Título")
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId("ticket_edit_embed_desc")
                .setEmoji("<:lapis:1305591472887959663>")
                .setLabel("Editar Descrição")
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId("ticket_edit_embed_color")
                .setEmoji("<:ed36:1309962551110402099>")
                .setLabel("Cor da Embed")
                .setStyle(ButtonStyle.Secondary)
            );
            return interaction.editReply({
              content: "Configure a embed do painel de ticket:",
              embeds: [],
              components: [
                row,
                new ActionRowBuilder().addComponents(backButton),
              ],
            });
          }
          case "ticket_support_roles": {
            const backButton = new ButtonBuilder()
              .setCustomId("ticket_back_to_main")
              .setEmoji("<:emoji_45:1305590970062082078>")
              .setLabel("Voltar")
              .setStyle(ButtonStyle.Primary);
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("ticket_add_role")
                .setEmoji("<:adicionar:1305243177803972781>")
                .setLabel("Adicionar Cargo")
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId("ticket_remove_role")
                .setEmoji("<:menos:1305243152952725646>")
                .setLabel("Remover Cargo")
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId("ticket_view_roles_0")
                .setEmoji("<:cisearchmagnifyingglass:1397071717351952416>")
                .setLabel("Ver Cargos")
                .setStyle(ButtonStyle.Secondary)
            );
            return interaction.editReply({
              content: "Gerencie os cargos que podem dar suporte:",
              embeds: [],
              components: [
                row,
                new ActionRowBuilder().addComponents(backButton),
              ],
            });
          }
          case "ticket_config_logs": {
            const backButton = new ButtonBuilder()
              .setCustomId("ticket_back_to_main")
              .setEmoji("<:emoji_45:1305590970062082078>")
              .setLabel("Voltar")
              .setStyle(ButtonStyle.Primary);
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("ticket_toggle_logs")
                .setLabel(
                  config.logs_active ? "Logs Ativados" : "Logs Desativados"
                )
                .setEmoji(
                  config.logs_active
                    ? "<:accept:1305153239821324319>"
                    : "<:xx1:1306694256559128637>"
                )
                .setStyle(
                  config.logs_active ? ButtonStyle.Success : ButtonStyle.Danger
                ),
              new ButtonBuilder()
                .setCustomId("ticket_set_log_channel")
                .setEmoji("<:SinoStorm:1306981122852388904>")
                .setLabel("Definir Canal de Logs")
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId("ticket_view_log_channel")
                .setEmoji("<:cisearchmagnifyingglass:1397071717351952416>")
                .setLabel("Ver Canal Atual")
                .setStyle(ButtonStyle.Secondary)
            );
            return interaction.editReply({
              content: "Configure o canal de logs de tickets:",
              embeds: [],
              components: [
                row,
                new ActionRowBuilder().addComponents(backButton),
              ],
            });
          }
          case "ticket_toggle_logs": {
            config.logs_active = !config.logs_active;
            await fs.writeFile(
              ticketConfigPath,
              JSON.stringify(config, null, 2)
            );
            const backButton = new ButtonBuilder()
              .setCustomId("ticket_back_to_main")
              .setEmoji("<:emoji_45:1305590970062082078>")
              .setLabel("Voltar")
              .setStyle(ButtonStyle.Primary);
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("ticket_toggle_logs")
                .setEmoji(
                  config.logs_active
                    ? "<:accept:1305153239821324319>"
                    : "<:xx1:1306694256559128637>"
                )
                .setLabel(
                  config.logs_active ? "Logs Ativados" : "Logs Desativados"
                )
                .setStyle(
                  config.logs_active ? ButtonStyle.Success : ButtonStyle.Danger
                ),
              new ButtonBuilder()
                .setCustomId("ticket_set_log_channel")
                .setEmoji("<:SinoStorm:1306981122852388904>")
                .setLabel("Definir Canal de Logs")
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId("ticket_view_log_channel")
                .setEmoji("<:cisearchmagnifyingglass:1397071717351952416>")
                .setLabel("Ver Canal Atual")
                .setStyle(ButtonStyle.Secondary)
            );
            return interaction.editReply({
              components: [
                row,
                new ActionRowBuilder().addComponents(backButton),
              ],
            });
          }
        }
      }
    } else if (
      interaction.isModalSubmit() &&
      customId.startsWith("ticket_modal_")
    ) {
      if (interaction.user.id !== owner) return;
      if (!interaction.replied && !interaction.deferred) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
      }
      const value = interaction.fields.getTextInputValue("ticket_input");
      let newConfig = await getTicketConfig();
      switch (customId) {
        case "ticket_modal_prompt":
          newConfig.ai_prompt = value;
          break;
        case "ticket_modal_title":
          newConfig.panel_embed.title = value;
          break;
        case "ticket_modal_desc":
          newConfig.panel_embed.description = value;
          break;
        case "ticket_modal_color":
          newConfig.panel_embed.color = value;
          break;
        case "ticket_modal_add_role":
          if (!newConfig.support_roles.includes(value))
            newConfig.support_roles.push(value);
          break;
        case "ticket_modal_remove_role":
          newConfig.support_roles = newConfig.support_roles.filter(
            (r) => r !== value
          );
          break;
        case "ticket_modal_set_log":
          newConfig.log_channel_id = value;
          break;
      }
      await fs.writeFile(ticketConfigPath, JSON.stringify(newConfig, null, 2));
      await interaction.editReply({
        content: "Configuração salva com sucesso!",
      });
    } else if (
      interaction.isAnySelectMenu() &&
      customId.startsWith("ticket_")
    ) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.deferUpdate();
      }
      const config = await getTicketConfig();
      if (customId === "ticket_select_channel_for_panel") {
        if (interaction.user.id !== owner) return;
        const channelId = interaction.values[0];
        const channel = await client.channels.fetch(channelId);
        if (channel && channel.isTextBased()) {
          const embed = new EmbedBuilder()
            .setTitle(config.panel_embed.title)
            .setDescription(config.panel_embed.description)
            .setColor(config.panel_embed.color);
          const button = new ButtonBuilder()
            .setCustomId("create_ticket_btn")
            .setEmoji("<:ed55:1309962440372649984>")
            .setLabel("Abrir Ticket")
            .setStyle(ButtonStyle.Primary);
          await channel.send({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(button)],
          });
          await interaction.editReply({
            content: `Painel enviado com sucesso para ${channel}!`,
            components: [],
            embeds: [],
          });
        }
      } else if (customId === "ticket_add_member_select") {
        const memberId = interaction.values[0];
        try {
          await interaction.channel.members.add(memberId);
          await interaction.editReply({
            content: `Membro <@${memberId}> adicionado ao ticket com sucesso!`,
            components: [],
          });
        } catch (error) {
          await interaction.editReply({
            content: `Não foi possível adicionar o membro. Verifique se ele já não está no ticket.`,
            components: [],
          });
        }
      }
    }
  },
};
