const { Events } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const geminiApiKey = process.env.GEMINI_API_KEY;

const ticketConfigPath = path.join(
  __dirname,
  "../../database/ticket-config.json"
);
const activeTicketsPath = path.join(
  __dirname,
  "../../database/active-tickets.json"
);

const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
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

      const chat = model.startChat({
        systemInstruction: {
          parts: [{ text: config.ai_prompt }],
        },
        history: history,
      });

      const result = await chat.sendMessage(message.content);
      const response = await result.response;
      const text = response.text();

      if (text) {
        await message.reply(text);

        history.push({
          role: "user",
          parts: [{ text: message.content }],
        });
        history.push({
          role: "model",
          parts: [{ text }],
        });

        ticketHistories.set(message.channel.id, history);
      }
    } catch (error) {
      console.error("Erro na API do Google AI:", error);
    }
  },
};
