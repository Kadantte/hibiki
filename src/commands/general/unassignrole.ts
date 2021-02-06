import type { EmbedField, Message, Role, TextChannel } from "eris";
import { Command } from "../../classes/Command";
import { itemExists } from "../../utils/itemExists";

export class UnassignroleCommand extends Command {
  description = "Removes a role from you that's set to be assignable.";
  clientperms = ["manageRoles"];
  args = "[role:role]";
  aliases = ["unassign", "removerole", "iamnot"];

  async run(msg: Message<TextChannel>, _pargs: ParsedArgs[], args: string[]) {
    const guildconfig = await this.bot.db.getGuildConfig(msg.channel.guild.id);

    // If no roles are set to be assigned
    if (!guildconfig?.assignableRoles?.length) {
      return msg.createEmbed(`📄 ${msg.string("general.ASSIGNABLE_ROLES")}`, msg.string("general.ASSIGN_NOTHINGSET"));
    }

    // Cleans up roles that no longer exist
    guildconfig.assignableRoles = (await itemExists(
      msg.channel.guild,
      "role",
      guildconfig.assignableRoles,
      this.bot.db,
      "assignableRoles",
    )) as string[];

    // List of assignable roles if no args given
    if (!args.length) {
      return msg.createEmbed(
        `📄 ${msg.string("general.ASSIGNABLE_ROLES")}`,
        `${guildconfig.assignableRoles.map((role) => `\`${msg.channel.guild.roles.get(role)?.name || role}\``).join(",")}`,
      );
    }

    // Tries to remove each role
    let roles = await Promise.all(
      args
        .join(" ")
        .split(/(?:\s{0,},\s{0,})|\s/)
        .map(async (role: string | Role) => {
          role = msg.channel.guild.roles.find(
            (r) => r.id === role || r.name.toLowerCase().startsWith(role as string) || role === `<@&${role}>`,
          );

          if (!role) return { removed: false, role: role };
          if (!msg.member.roles.includes(role.id)) return { removed: false, role: undefined };
          if (!guildconfig.assignableRoles.includes(role.id)) return { removed: false, role: undefined };

          try {
            // Removes the role
            await msg.member.removeRole(role.id, "Un self-assigned");
            return { removed: true, role: role };
          } catch (err) {
            return { removed: false, role: role };
          }
        }),
    );

    // Finds roles that exist in args
    roles = roles.filter((role) => role.role !== undefined);

    // If no roles were added; finds failed roles
    if (!roles.length) return msg.createEmbed(msg.string("global.ERROR"), msg.string("general.ASSIGN_NOROLES"), "error");
    const failed = roles.filter((r) => r.removed === false);
    const removed = roles.filter((r) => r.removed === true);
    const failedField: EmbedField[] = [];

    if (failed.length) {
      failedField.push({
        name: msg.string("general.UNASSIGN_FAILED"),
        value: failed.map((f) => `\`${f.role.name}\``).join(", "),
      });
    }

    // Sends added roles
    msg.channel.createMessage({
      embed: {
        title: msg.string("global.SUCCESS"),
        description: msg.string("general.UNASSIGN_UNASSIGNED", {
          amount: removed.length,
          roles: removed.map((r) => `\`${r.role.name}\``).join(", "),
        }),
        color: msg.convertHex("success"),
        fields: failedField,
        footer: {
          text: msg.string("global.RAN_BY", { author: msg.tagUser(msg.author) }),
          icon_url: msg.author.dynamicAvatarURL(),
        },
      },
    });

    this.bot.emit(
      "roleAssign",
      msg.channel.guild,
      msg.author,
      null,
      null,
      removed.map((r) => `${r.role.name}`),
    );
  }
}
