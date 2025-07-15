const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");

// === CONFIGURATION ===
const BOT_TOKEN = "8044425978:AAFV1dcTfsIICkbFlltdTSKZ30diyDHxvCQ";
const CHANNEL_FILE = "channels.json";
const YOUR_NAME = "Kaustav Ray";

// === INIT BOT & SERVER ===
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const app = express();

app.get("/", (req, res) => res.send("🤖 Bot is running!"));
app.listen(process.env.PORT || 3000, () => {
  console.log("✅ Express web server running...");
});

// === PERSISTENT ADMIN CHANNEL LIST ===
let adminChannels = new Set();

function loadChannelsFromFile() {
  if (fs.existsSync(CHANNEL_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CHANNEL_FILE, "utf8"));
      data.forEach((channel) => adminChannels.add(channel.id));
      console.log(`📂 Loaded ${adminChannels.size} channels from file.`);
    } catch (err) {
      console.error("❌ Failed to read channels.json:", err.message);
    }
  }
}

function saveChannelToFile(id, title) {
  let data = [];
  if (fs.existsSync(CHANNEL_FILE)) {
    data = JSON.parse(fs.readFileSync(CHANNEL_FILE, "utf8"));
    if (data.some((entry) => entry.id === id)) return; // already exists
  }
  data.push({ id, title });
  fs.writeFileSync(CHANNEL_FILE, JSON.stringify(data, null, 2));
  console.log(`💾 Saved new channel: ${title} (${id})`);
}

loadChannelsFromFile();

// === FORMAT CAPTION WITH NAME ===
function formatCaption(text) {
  return (text || "") + "\n\n" + YOUR_NAME;
}

// === HANDLE WHEN BOT IS MADE ADMIN ===
bot.on("my_chat_member", (msg) => {
  const chat = msg.chat;
  const status = msg.new_chat_member.status;

  if (chat.type === "channel" && (status === "administrator" || status === "creator")) {
    adminChannels.add(chat.id);
    saveChannelToFile(chat.id, chat.title || "Untitled");
    console.log(`✅ Bot added as admin in: ${chat.title || chat.id}`);
  }
});

// === HANDLE USER MESSAGES ===
bot.on("message", async (msg) => {
  if (!msg || msg.chat.type !== "private") return;

  const caption = formatCaption(msg.caption || msg.text || "");
  console.log(`📩 Message from user: ${msg.from.username || msg.from.id}`);

  if (adminChannels.size === 0) {
    bot.sendMessage(msg.chat.id, "⚠️ I'm not an admin in any channel yet.");
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

      console.log(`📤 Forwarded to channel: ${channelId}`);
    } catch (err) {
      console.error(`❌ Error sending to ${channelId}:`, err.message);
    }
  }

  bot.sendMessage(msg.chat.id, "✅ Forwarded to all admin channels.");
});

// === AUTO RESTART AFTER 1 HOUR ===
setTimeout(() => {
  console.log("♻️ Auto restarting bot after 1 hour...");
  process.exit(0); // Render will auto-restart it
}, 3600000);

console.log("🚀 Bot started at", new Date().toLocaleString());
