const { Events, AttachmentBuilder } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const geminiApiKey = process.env.GEMINI_API_KEY;
const fs = require("node:fs");
const path = require("node:path");

const dbPath = path.join(__dirname, "../../database");
const channelsFilePath = path.join(dbPath, "channels.json");
const promptFilePath = path.join(dbPath, "prompt.json");
const historyFilePath = path.join(dbPath, "historico.json");

if (!fs.existsSync(historyFilePath)) {
  fs.writeFileSync(historyFilePath, JSON.stringify({}, null, 2));
}

const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-flash-latest",
});

const userCooldowns = new Set();

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot) return;

    const allowedChannelsData = JSON.parse(
      fs.readFileSync(channelsFilePath, "utf-8")
    );
    if (!allowedChannelsData.canais.includes(message.channel.id)) return;

    if (userCooldowns.has(message.author.id)) return;

    try {
      await message.channel.sendTyping();

      const systemPromptData = JSON.parse(
        fs.readFileSync(promptFilePath, "utf-8")
      );
      const historyData = JSON.parse(fs.readFileSync(historyFilePath, "utf-8"));

      const channelHistories = historyData[message.channel.id] || {};
      const userHistory = channelHistories[message.author.id] || [];
      const userMessage = message.content.trim();

      if (!userMessage) return;

      userCooldowns.add(message.author.id);
      setTimeout(() => {
        userCooldowns.delete(message.author.id);
      }, 5000);

      const chat = model.startChat({
        systemInstruction: {
          role: "user",
          parts: [
            {
              text:
                systemPromptData.prompt || "Você é um assistente prestativo.",
            },
          ],
        },
        history: userHistory,
      });

      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      const responseText = response.text();

      if (responseText.length > 2000) {
        const buffer = Buffer.from(responseText, "utf-8");
        const attachment = new AttachmentBuilder(buffer, {
          name: "response.txt",
        });
        await message.reply({
          content:
            "A resposta era muito longa, então a enviei como um arquivo de texto.",
          files: [attachment],
        });
      } else {
        await message.reply(responseText);
      }

      userHistory.push({ role: "user", parts: [{ text: userMessage }] });
      userHistory.push({ role: "model", parts: [{ text: responseText }] });
      channelHistories[message.author.id] = userHistory;
      historyData[message.channel.id] = channelHistories;
      fs.writeFileSync(historyFilePath, JSON.stringify(historyData, null, 2));
    } catch (error) {
      userCooldowns.delete(message.author.id);
      console.error("[ERRO GEMINI]".red.bold, error);
      await message.reply(
        "Desculpe, não consegui processar sua solicitação no momento. Tente novamente mais tarde."
      );
    }
  },
};
