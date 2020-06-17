const Command = require("structures/Command");
const fetch = require("node-fetch");

class bangheadCommand extends Command {
  constructor(...args) {
    super(...args, {
      description: "Bangs your head on something.",
      cooldown: 3,
    });
  }

  async run(msg) {
    const body = await fetch("https://api.weeb.sh/images/random?type=banghead", { headers: { "Authorization": `Wolke ${this.bot.key.weebsh}`, "User-Agent": `${this.bot.user.username}/${this.bot.version}` } })
      .then(async res => await res.json().catch(() => {}));
    let image;

    // Fallback image
    if (body.status !== 200) image = "https://cdn.weeb.sh/images/rJRepkXoW.gif";
    else if (body.status === 200) image = body.url;

    msg.channel.createMessage({
      embed: {
        description: `💢 **${msg.author.username}** is banging their head!`,
        color: this.bot.embed.color("general"),
        image: {
          url: image,
        },
        footer: {
          icon_url: this.bot.user.dynamicAvatarURL(),
          text: "Powered by weeb.sh",
        },
      },
    });
  }
}

module.exports = bangheadCommand;