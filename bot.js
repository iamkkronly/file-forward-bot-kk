const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

// ==== CONFIGURATION ====
const BOT_TOKEN = "7536099881:AAEy7vuba93VnAFmxbBIUrS2oJVx8ueNR9c";
const YOUR_NAME = "Kaustav Ray";
// ========================

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Express server to keep alive on Render
const app = express();
app.get("/", (req, res) => res.send("Bot is running!"));
app.listen(process.env.PORT || 3000, () => console.log("Server running"));

// In-memory cache of channels where bot is admin
let adminChannels = new Set();

// Helper: Append your name to caption or text
function formatCaption(original) {
  return (original || "") + "\n\n" + YOUR_NAME;
}

// On startup: update admin channel list on member status change
bot.on("my_chat_member", (msg) => {
  const chat = msg.chat;
  const newStatus = msg.new_chat_member.status;
  if (chat.type === "channel") {
    if (newStatus === "administrator" || newStatus === "creator") {
      adminChannels.add(chat.id);
      console.log(`✅ Added channel: ${chat.title || chat.id}`);
    } else if (["left", "kicked", "member"].includes(newStatus)) {
      adminChannels.delete(chat.id);
      console.log(`❌ Removed channel: ${chat.title || chat.id}`);
    }
  }
});

// Handle user messages and forward
bot.on("message", async (msg) => {
  if (!msg || msg.chat.type !== "private") return; // Only handle private messages

  const caption = formatCaption(msg.caption || msg.text || "");

  for (let channelId of adminChannels) {
    try {
      if (msg.photo) {
        await bot.sendPhoto(channelId, msg.photo.at(-1).file_id, { caption });
      } else if (msg.video) {
        await bot.sendVideo(channelId, msg.video.file_id, { caption });
      } else if (msg.document) {
        await bot.sendDocument(channelId, msg.document.file_id, { caption });
      } else if (msg.audio) {
        await bot.sendAudio(channelId, msg.audio.file_id, { caption });
      } else if (msg.voice) {
        await bot.sendVoice(channelId, msg.voice.file_id, { caption });
      } else if (msg.text) {
        await bot.sendMessage(channelId, caption);
      } else {
        await bot.sendMessage(channelId, `Unsupported content.\n\n${caption}`);
      }
    } catch (err) {
      console.error(`❌ Error sending to channel ${channelId}:`, err.message);
    }
  }
});
