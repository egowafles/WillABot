import { Events } from "discord.js";
import { logger, startupLog } from "../utils/logger.js";
import config from "../config/application.js";
import { reconcileReactionRoleMessages } from "../services/reactionRoleService.js";
import cron from "node-cron";
import { EmbedBuilder } from "discord.js";
import { fetchGAG2Stocks, notifierChannels } from "../commands/gag2.js";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    try {
      client.user.setPresence(config.bot.presence);
      startupLog(`Ready! Logged in as ${client.user.tag}`);
      startupLog(`Serving ${client.guilds.cache.size} guild(s)`);
      startupLog(`Loaded ${client.commands.size} commands`);

      const reconciliationSummary = await reconcileReactionRoleMessages(client);
      startupLog(
        `Reaction role reconciliation: scanned ${reconciliationSummary.scannedMessages}, removed ${reconciliationSummary.removedMessages}, errors ${reconciliationSummary.errors}`
      );

      // === GROW A GARDEN 2 LIVE TRACKER ===
      startupLog("🌱 GAG2 Stock Notifier Initialized");

      cron.schedule('*/5 * * * *', async () => {
        const stocks = await fetchGAG2Stocks();
        if (!stocks) return;

        for (const [guildId, channelId] of notifierChannels.entries()) {
          const channel = client.channels.cache.get(channelId);
          if (channel) {
            const embed = new EmbedBuilder()
              .setTitle("🌱 Grow a Garden 2 - Stock Update!")
              .setDescription("The shop has refreshed! Use `/gag2 stocks`")
              .setColor(0x00ff9d)
              .setTimestamp();
            channel.send({ embeds: [embed] }).catch(() => {});
          }
        }
      });

    } catch (error) {
      logger.error("Error in ready event:", error);
    }
  },
};
