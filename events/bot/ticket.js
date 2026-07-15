const { Events } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const Groq = require("groq-sdk");
const { withRetry } = require("../../utils/withRetry");
const groqApiKey = process.env.GROQ_API_KEY;

const ticketConfigPath = path.join(
  __dirname,
  "../../database/ticket-config.json"
);
const activeTicketsPath = path.join(
  __dirname,
  "../../database/active-tickets.json"
);

const groq = new Groq({ apiKey: groqApiKey });
const GROQ_MODEL = "llama-3.3-70b-versatile";
const ticketHistories = new Map();

module.exports = {
  name: Events.MessageCreate,
  ticketHistories,
  async execute(message) {
    if (message.author.bot || !message.channel.isThread()) return;

    const activeTickets = JSON.parse(
      fs.readFileSync(activeTicketsPath, "utf-8")
    );
    const ticket = activeTickets[message.channel.id];
    if (!ticket) return;

    const isUserMessage = message.author.id === ticket.owner_id;
    if (ticket.status !== "open" || !isUserMessage) {
      return;
    }

    try {
      await message.channel.sendTyping();

      const config = JSON.parse(fs.readFileSync(ticketConfigPath, "utf-8"));
      const history = ticketHistories.get(message.channel.id) || [];

      const messages = [
        { role: "system", content: config.ai_prompt },
        ...history,
        { role: "user", content: message.content },
      ];

      const completion = await withRetry(() =>
        groq.chat.completions.create({
          model: GROQ_MODEL,
          messages,
        })
      );
      const text = completion.choices[0]?.message?.content;

      if (text) {
        await message.reply(text);

        history.push({ role: "user", content: message.content });
        history.push({ role: "assistant", content: text });

        ticketHistories.set(message.channel.id, history);
      }
    } catch (error) {
      console.error("Erro na API da Groq:", error);
      await message.reply(
        "Desculpe, não consegui processar sua mensagem agora. Tente novamente em instantes."
      );
    }
  },
};
