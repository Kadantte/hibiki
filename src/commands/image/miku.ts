import type { Message, TextChannel } from "eris";
import { Command } from "../../classes/Command";
import { resError } from "../../utils/exception";
import axios from "axios";

export class MikuCommand extends Command {
  aliases = ["hatsunemiku"];
  description = "Sends a random picture of Hatsune Miku.";
  cooldown = 3000;
  allowdms = true;

  async run(msg: Message<TextChannel>) {
    const body = await axios
      .get("https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=hatsune_miku%20rating:safe")
      .catch((err) => {
        resError(err);
      });

    if (!body || !body.data[0]?.image || !body.data[0]?.directory) {
      return msg.createEmbed(msg.string("global.ERROR"), msg.string("global.RESERROR_IMAGE"), "error");
    }

    // Handles videos
    if (body.data?.[0]?.image.endsWith(".webm") || body?.data[0]?.image.endsWith(".mp4")) {
      return msg.createEmbed(
        msg.string("global.ERROR"),
        msg.string("global.RESERROR_ATTACHMENT", {
          url: `https://safebooru.org/images/${body.data?.[0]?.directory}/${body?.data?.[0]?.image}`,
        }),
        "error",
      );
    }

    const random = Math.floor(Math.random() * body?.data.length);

    msg.channel.createMessage({
      embed: {
        title: `🌸 ${msg.string("image.MIKU")}`,
        color: msg.convertHex("general"),
        image: {
          url: `https://safebooru.org/images/${body.data?.[random]?.directory}/${body?.data?.[random]?.image}`,
        },
        footer: {
          text: msg.string("global.RAN_BY", {
            author: msg.tagUser(msg.author),
            poweredBy: "safebooru.org",
          }),
          icon_url: msg.author.dynamicAvatarURL(),
        },
      },
    });
  }
}
