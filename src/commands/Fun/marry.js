const Command = require("structures/Command");
const yn = require("utils/ask").YesNo;

class marryCommand extends Command {
  constructor(...args) {
    super(...args, {
      aliases: ["propose"],
      args: "<member:member>",
      description: "Proposes to another member.",
    });
  }

  async run(msg, args, pargs) {
    const user = pargs[0].value;
    const state = await this.bot.db.table("marriages").getAll(msg.author.id, user.id, { index: "marriages" }).run();

    // If author is married
    if (state.find(m => m.id === msg.author.id || m.marriedTo === msg.author.id)) {
      return msg.channel.createMessage(this.bot.embed("❌ Error", "You're already married.", "error"));
    }

    // If mentioned user is married
    if (state.find(m => m.id === user.id || m.marriedTo === user.id)) {
      return msg.channel.createMessage(this.bot.embed("❌ Error", `**${user.username}** is already married.`, "error"));
    }

    // Asks for a response
    const marrymsg = await msg.channel.createMessage(this.bot.embed("💝 Marry", `**${user.username}**, do you wish to marry **${msg.author.username}**?`));
    const response = await yn(this.bot, { author: user, channel: msg.channel });
    if (response) {
      await this.bot.db.table("marriages").insert({ id: msg.author.id, spouse: user.id }).run();
      marrymsg.edit(this.bot.embed("💝 Marry", `**${msg.author.username}** and **${user.username}** are now married.`));
    } else {
      marrymsg.edit(this.bot.embed("💝 Marry", "Marriage cancelled."));
    }
  }
}

module.exports = marryCommand;