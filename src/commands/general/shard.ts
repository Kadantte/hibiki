import type { CommandInteraction } from "discord.js";
import { HibikiCommand } from "../../classes/Command";
import { localiseShardStatus } from "../../utils/localiser";

export class ShardCommand extends HibikiCommand {
  description = "Checks what shard the server is on and its status.";

  public async runWithInteraction(interaction: CommandInteraction) {
    const shard = interaction.guild?.shard;

    // Sends if the shard doesn't exist..?
    if (!shard) {
      return interaction.reply({
        embeds: [
          {
            title: interaction.getString("global.ERROR"),
            description: interaction.getString("general.COMMAND_SHARD_ERROR"),
            color: this.bot.config.colours.error,
          },
        ],
      });
    }

    await interaction.reply({
      embeds: [
        {
          title: interaction.getString("general.COMMAND_SHARD_TITLE"),
          description: interaction.getString("general.COMMAND_SHARD_DESCRIPTION", { shard: shard.id }),
          color: this.bot.config.colours.primary,
          fields: [
            {
              name: interaction.getString("global.STATUS"),
              value: localiseShardStatus(interaction.getString, shard.status),
              inline: true,
            },
            {
              name: interaction.getString("global.PING"),
              value: interaction.getString("global.MILLISECOND_INFO", { amount: interaction.guild.shard.ping.toFixed(0) }),
              inline: true,
            },
          ],
        },
      ],
    });
  }
}