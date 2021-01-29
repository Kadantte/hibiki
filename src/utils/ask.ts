/**
 * @file Ask
 * @description Asks for a user's input and validates it
 * @module utils/ask
 */

import type { HibikiClient } from "../classes/Client";
import type { Channel, Emoji, Member, Message, Role, TextChannel, VoiceChannel } from "eris";
import { defaultEmojiRegex, fullInviteRegex } from "../helpers/constants";
import { localizeSetupItems } from "../utils/format";
import { timeoutHandler, waitFor } from "./waitFor";

// Dayjs plugins
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

const localeEmojis = {};
const localeNames = {};

// Asks a user for yes or no
export async function askYesNo(bot: HibikiClient, msg: Message) {
  if (!msg.content) return;
  let response: Promise<any> | Record<string, unknown>;

  const no = msg.string("global.NO").toLowerCase();
  const yes = msg.string("global.YES").toLowerCase();
  const sameStartingChar = no[0] === yes[0];

  await waitFor(
    "messageCreate",
    15000,
    (m: Message) => {
      if (!m.content) return;
      if (m.author.id !== msg.author.id) return;
      if (m.channel?.id !== msg?.channel.id) return;

      // If two locales start with the same y/n chars
      if (sameStartingChar) {
        if (m.content.toLowerCase() === no) response = { msg: m, response: false };
        else if (m.content.toLowerCase() === yes) response = { msg: m, response: true };
      } else if (m.content.toLowerCase().startsWith(no[0])) response = { msg: m, response: false };
      else if (m.content.toLowerCase().startsWith(yes[0])) response = { msg: m, response: true };
      if (!response) response = { msg: null, response: false };
      return true;
    },

    bot,
  );

  return response;
}

// Asks for a specific type of input
export function askFor(bot: HibikiClient, msg: Message<TextChannel>, type: string, arg: any) {
  if (!type) return "No type";
  if (!arg) return "No arg";
  if (!msg.channel.guild) return "No guild";
  const clear = arg.toLowerCase() === "clear" || arg.toLowerCase() === "off" || arg.toLowerCase() === "null";

  // Looks for a role
  if (type === "roleID") {
    const role = bot.args.argtypes.role(arg, msg, undefined) as Role | undefined;
    if (clear) return "clear";
    if (!role || role?.managed) return "No role";
    return role.id;
  }

  // Looks for a channel
  if (type === "channelID") {
    const channel = bot.args.argtypes.channel(arg, msg, undefined) as Channel | undefined;
    if (clear) return "clear";
    if (!channel) return;
    return channel.id;
  }

  // Looks for a voice Channel
  if (type === "voiceChannel") {
    const channel = bot.args.argtypes.voiceChannel(arg, msg, undefined) as VoiceChannel | undefined;
    if (clear) return "clear";
    if (channel.type !== 2) return "Invalid channel type";
    if (!channel) return;
    return channel.id;
  }

  // Looks for a number
  if (type === "number") {
    const number = bot.args.argtypes.number(arg, msg);
    if (!number) return "No number";
    return number;
  }

  // Looks for a string
  if (type === "string") {
    const string = bot.args.argtypes.string(arg);
    if (clear) return "clear";
    if (!string) return "No string";
    return string;
  }

  // Looks for a boolean
  if (type === "bool") {
    const boolean = bot.args.argtypes.boolean(arg, undefined, arg);
    if (!boolean) return "No boolean";
    return boolean;
  }

  // Looks for a roleArray
  if (type === "roleArray") {
    const roles = bot.args.argtypes.roleArray(arg.split(/(?:\s{0,},\s{0,})|\s/), msg);
    if (!roles?.length) return "Invalid rolearray";
    return roles;
  }

  // Looks for a channelArray
  if (type === "channelArray") {
    const channels = bot.args.argtypes.channelArray(arg.split(/(?:\s{0,},\s{0,})|\s/), msg);
    if (!channels?.length) return "Invalid channelArray";
    return channels;
  }

  // Looks for an emoji
  if (type === "emoji") {
    const emoji = defaultEmojiRegex.exec(arg);
    if (!emoji) return "No emoji";
    return emoji[0];
  }

  // Looks for a timezone
  if (type === "timezone") {
    let invalidTimezone = false;
    try {
      dayjs(new Date()).tz(arg);
    } catch (err) {
      invalidTimezone = true;
    }

    if (invalidTimezone) return "No valid timezone";
    return arg;
  }
}

// Asks for input for a specific setting
export async function askForValue(
  msg: Message<TextChannel>,
  omsg: Message<TextChannel>,
  bot: HibikiClient,
  category: string,
  config: GuildConfig | UserConfig,
  editFunction: any,
  setting: ValidItem,
) {
  let cooldown = 0;

  await waitFor(
    "messageCreate",
    60000,
    async (m: Message) => {
      if (m.author.id !== msg.author.id || m.channel.id !== msg.channel.id || !msg.content) return;
      let result = askFor(bot, m as Message<TextChannel>, setting.type, m.content);

      const invalidChecks = {
        notBoolean: {
          check: setting.type !== "bool" && !result,
          errorMsg: msg.string("general.CONFIG_ISINVALID"),
        },

        // Checks if it's invalid
        isInvalid: {
          check: typeof result === "string" && result.startsWith("No"),
          errorMsg: msg.string("general.CONFIG_ISINVALID"),
        },

        // Checks if it contains an invite
        containsInvite: {
          check: setting.inviteFilter === true && fullInviteRegex.test(result),
          errorMsg: msg.string("general.CONFIG_CONTAINSINVITE"),
        },

        // role arrayyyy
        roleArrayTooLong: {
          check: setting.type === "roleArray" && setting.maximum && result.length > setting.maximum,
          errorMsg: msg.string("general.CONFIG_ROLEARRAYTOOLONG", { maximum: setting.maximum }),
        },

        // chanenlewlewlplp
        channelArrayTooLong: {
          check: setting.type === "channelArray" && setting.maximum && result.length > setting.maximum,
          errorMsg: msg.string("general.CONFIG_CHANNELARRAYTOOLONG", { maximum: setting.maximum }),
        },

        invalidNumberSize: {
          check: setting.type === "number" && setting.maximum && (setting.minimum > result || setting.maximum < result),
          errorMsg: msg.string("general.CONFIG_INVALIDNUMBERSIZE"),
        },
      };
      //

      // If an invalid repsonse was given
      let error = "";
      Object.keys(invalidChecks).forEach((checkKey) => {
        if (error) return;
        const check = invalidChecks[checkKey];
        if (check.check) {
          error = check.errorMsg;
        }
      });

      // Sends if something is invalid >:(
      if (error) {
        const errormsg = await msg.createEmbed(
          msg.string("global.ERROR"),
          `${error} ${msg.string("general.CONFIG_ATTEMPTS_LEFT", { attempts: Math.abs(cooldown - 2) })}`,
          "error",
        );

        cooldown++;
        setTimeout(() => {
          errormsg.delete();
        }, 2000);

        // If cooldown reached
        if (cooldown > 2) {
          omsg.edit(editFunction(category, bot));
          return true;
        }

        return;
      }

      // Clears or sets the result
      if (result === "clear") result = null;
      config[setting.id] = result;

      // Updates configs
      if (category === "profile") await bot.db.updateUserConfig(msg.author.id, config);
      else await bot.db.updateGuildConfig(msg.channel.guild.id, config);
      m.delete();

      // Sends a success message
      const setmsg = await msg.createEmbed(
        msg.string("global.SUCCESS"),
        // TODO: Localize result types.
        // TODO: Localize setting return (i.e channelID)
        `**${localizeSetupItems(msg.string, setting.id, true)}** ${msg.string("global.SET_TO")} **${result}**.`,
        "success",
      );
      setTimeout(() => {
        setmsg.delete();
      }, 2000);

      // Edits the original message
      omsg.edit(editFunction(category, bot));
      return true;
    },

    bot,
  ).catch((err) => timeoutHandler(err, omsg, msg.string));
}

// Asks for a locale
export async function askForLocale(
  omsg: Message,
  msg: Message<TextChannel>,
  bot: HibikiClient,
  userconfig: UserConfig | GuildConfig,
  editFunction: any,
  category?: string,
  isGuildConfig?: boolean,
) {
  // Locale emojis
  Object.keys(bot.localeSystem.locales).forEach((locale) => {
    localeEmojis[bot.localeSystem.getLocale(locale, "EMOJI")] = bot.localeSystem.getLocale(locale, "NAME");
    localeNames[bot.localeSystem.getLocale(locale, "EMOJI")] = locale;
  });

  await omsg.removeReactions();
  Object.keys(localeEmojis).forEach(async (emoji) => omsg.addReaction(emoji));

  // Asks for input
  omsg.editEmbed(
    "select locale bitch",
    Object.entries(localeEmojis)
      .map((p) => `${p[0]}: ${p[1]}`)
      .join("\n"),
  );

  // Waits for message reactions for locale
  return waitFor(
    "messageReactionAdd",
    10000,
    async (m: Message<TextChannel>, emoji: Emoji, user: Member) => {
      if (m.id !== omsg.id) return;
      if (user.id !== msg.author.id) return;
      if (!emoji.name) return;

      // Gets the locale and updates config
      const locale = localeNames[emoji.name];
      if (!locale) return;
      userconfig.locale = locale;
      if (isGuildConfig) bot.db.updateGuildConfig(msg.channel.guild.id, userconfig);
      else bot.db.updateUserConfig(msg.author.id, userconfig);

      // Cleans up afterwards
      await omsg.edit(isGuildConfig ? editFunction(category, bot) : editFunction(bot.localeSystem));
      await omsg.removeReactions();
      return true;
    },

    bot,
  ).catch((err) => {
    if (err !== "timeout") throw err;
  });
}
