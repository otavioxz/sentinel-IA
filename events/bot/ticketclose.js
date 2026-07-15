const { Events } = require("discord.js");
const path = require("node:path");

const messageCreateHandlerPath = path.resolve(
  __dirname,
  "./ticket.js"
);

module.exports = {
  name: Events.ThreadUpdate,
  async execute(oldThread, newThread) {
    if (newThread.archived && !oldThread.archived) {
      const { ticketHistories } = require(messageCreateHandlerPath);
      if (ticketHistories.has(newThread.id)) {
        ticketHistories.delete(newThread.id);
      }
    }
  },
};