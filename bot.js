const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

// === Configuration ===
const BOT_TOKEN = "8044425978:AAFuuQPVxH2Q8GEzhUM46d80Cv9DZJYZDgg";
const YOUR_NAME = "Kaustav Ray";

// === Initialize bot ===
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const app = express();

// Express server (for Render to keep alive)
app.get("/", (req, res) => res.send("🤖 Bot is alive!"));
app.listen(process.env.PORT || 3000, () => {
  console.log("✅ Web server running...");
});

// === Keep track of all admin channels ===
let adminChannels = new Set();

// === Helper to format caption ===
function formatCaption(original) {
  return (original || "") + "\n\n" + YOUR_NAME;
}

// === Watch for channel admin changes ===
bot.on("my_chat_member", (msg) => {
  const chat = msg.chat;
  const newStatus = msg.new_chat_member.status;

  if (chat.type === "channel") {
    if (["administrator", "creator"].includes(newStatus)) {
      adminChannels.add(chat.id);
      console.log(`✅ Bot added as admin in channel: ${chat.title} (${chat.id})`);
    } else if (["left", "kicked", "member"].includes(newStatus)) {
      adminChannels.delete(chat.id);
      console.log(`❌ Bot removed from channel: ${chat.title} (${chat.id})`);
    }
  }
});

// === Handle private user messages ===
bot.on("message", async (msg) => {
  if (!msg || msg.chat.type !== "private") return;

  const caption = formatCaption(msg.caption || msg.text || "");

  console.log(`📩 New message from ${msg.from.username || msg.from.id}`);

  if (adminChannels.size === 0) {
    bot.sendMessage(msg.chat.id, "⚠️ I’m not an admin in any channel yet.");
    return;
  }

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
        await bot.sendMessage(channelId, `⚠️ Unsupported message type.\n\n${caption}`);
      }

      console.log(`📤 Forwarded message to channel ID: ${channelId}`);
    } catch (err) {
      console.error(`❌ Failed to send to ${channelId}:`, err.message);
    }
  }

  bot.sendMessage(msg.chat.id, "✅ Sent to channels successfully!");
});
