const McProxy = require('basic-minecraft-proxy');
const mineflayer = require('mineflayer');
const fs = require('fs');
const path = require('path');

// Data file configuration – data will be stored at C:\BlocksMC_TrackerData\prv.txt
const DATA_FOLDER = 'C:\\BlocksMC_TrackerData';
const DATA_FILE = path.join(DATA_FOLDER, 'prv.txt');
if (!fs.existsSync(DATA_FOLDER)) {
  fs.mkdirSync(DATA_FOLDER, { recursive: true });
}

// Mapping for status codes to human-readable messages with color codes
const statusMapping = {
  ipban: { text: "You are IP banned, cannot check why?", color: "§4" },
  slowdown: { text: "Rate limit failed check", color: "§3" },
  premium: { text: " is Premium Account uncheckable. Type /faq to know", color: "§6" },
  unbp: { text: "is currently not banned and playing now", color: "§e" },
  not: { text: "is currently not banned!", color: "§a" }
};

// Adjusted color scheme for kick messages
const colorMap = {
  red: "§c",
  gold: "§6",
  yellow: "§e",
  green: "§a",
  dark_red: "§4",
  dark_green: "§2",
  dark_aqua: "§3",
  dark_purple: "§5",
  gray: "§7",
  dark_gray: "§8",
  aqua: "§b",
  light_purple: "§d",
  white: "§f"
};

function updatePlayerStatus(username, statusCode) {
  let lines = [];
  if (fs.existsSync(DATA_FILE)) {
    lines = fs.readFileSync(DATA_FILE, 'utf8').split('\n').filter(Boolean);
  }
  const entry = `[player:${username}|st:${statusCode}]`;
  let found = false;
  const newLines = lines.map(line => {
    if (line.startsWith(`[player:${username}|`)) {
      found = true;
      return entry;
    }
    return line;
  });
  if (!found) {
    newLines.push(entry);
  }
  fs.writeFileSync(DATA_FILE, newLines.join('\n') + '\n', 'utf8');
}

function loadPrevData() {
  if (fs.existsSync(DATA_FILE)) {
    return fs.readFileSync(DATA_FILE, 'utf8').split('\n').filter(Boolean);
  }
  return [];
}

function clearPrevData() {
  fs.writeFileSync(DATA_FILE, '', 'utf8');
}

function formatStatusEntry(entry) {
  const match = entry.match(/\[player:(.*?)\|st:(.*?)\]/);
  if (match) {
    const username = match[1];
    const status = match[2];
    if (statusMapping[status]) {
      // Always reset after the message to prevent stray white text.
      return username + ": " + statusMapping[status].color + statusMapping[status].text + "§r";
    } else {
      return username + ": " + status;
    }
  }
  return entry;
}

function parseKickMessage(message) {
  let obj;
  try {
    obj = JSON.parse(message);
  } catch (e) {
    return message;
  }
  if (obj.extra && Array.isArray(obj.extra)) {
    let formatted = "";
    for (const part of obj.extra) {
      let colorCode = "";
      if (part.color) {
        colorCode = colorMap[part.color] || "§f"; // Default to white if no color is found
      }
      formatted += colorCode + (part.text || "");
    }
    return formatted;
  }
  return obj.text || message;
}

function createBotInstance(username, callback) {
  const bot = mineflayer.createBot({
    host: 'play.blocksmc.com',
    port: 25565,
    version: '1.8.9',
    username: username,
    auth: 'offline'
  });

  let finished = false;
  function sendResult(message) {
    if (!finished) {
      finished = true;
      // Append reset code to prevent stray white text.
      callback(message + "§r");
      if (bot && typeof bot.quit === 'function') {
        bot.quit("Disconnecting after final result");
      }
    }
  }

  bot.on("spawn", () => {
    updatePlayerStatus(username, 'not');
    sendResult("§aThe player " + username + " is currently not banned!");
  });
  
  bot.on("kicked", (reason) => {
    let reasonObj;
    try {
      reasonObj = JSON.parse(reason);
    } catch (e) {
      reasonObj = { text: reason };
    }
    const reasonText = JSON.stringify(reasonObj);

    if (reasonText.includes("Premium ON") && reasonText.includes("PREMIUM.BLOCKSMC.COM")) {
      updatePlayerStatus(username, 'premium');
      // Updated premium message with orange text and a short message.
      sendResult("§6That player " + username + " is a premium account and cannot be checked. Type /faq to know.");
    } else if (reasonText.includes("already logged on")) {
      updatePlayerStatus(username, 'unbp');
      sendResult("§eThe player " + username + " is currently not banned and playing now.");
    } else if (reasonText.includes("banned from the server")) {
      updatePlayerStatus(username, 'ipban');
      sendResult("§4You are IP banned, cannot check why?");
    } else if (reasonText.includes("Please slow down")) {
      updatePlayerStatus(username, 'slowdown');
      sendResult("§cPlease slow down. BlocksMC might rate limit due to advanced DDoS attacks. Please type again /check " + username);
    } else {
      const formattedKick = parseKickMessage(reason);
      sendResult("§c" + username + " was kicked: " + formattedKick);
    }
  });

  bot.on("error", (err) => {
    if (err.message && err.message.includes("ECONNRESET")) {
      sendResult("§cFailed to check " + username + " (ECONNRESET)");
    } else {
      sendResult("§cError: " + err.message);
    }
  });
}

// Proxy Configuration
const localServerOptions = {
  port: '25565',
  version: '1.8.9',
  'online-mode': false,
  motd: '§b✦ §7BlocksTrackUtils §b✦ §7Local Proxy Server',
};

const serverList = {
  BlocksMC: {
    host: 'play.blocksmc.com',
    port: 25565,
    isDefault: true,
    isFallback: true
  }
};

const proxyOptions = {
  enablePlugins: false,
  autoConnect: true,
  autoFallback: true
};

const proxy = McProxy.createProxy(localServerOptions, serverList, proxyOptions);

proxy.on('error', console.error);

proxy.on('listening', () => {
  // Updated console output with custom ANSI escape codes:
  // "Blocks" in blue, "MC" in cyan, and "made by ForgedSengoku" in bold magenta.
  console.info('\x1b[34mBlocks\x1b[36mMC \x1b[1;35mmade by ForgedSengoku\x1b[0m Proxy listening on port ' + localServerOptions.port);
});

function handleInternalCommand(player, packet) {
  const message = packet.message;
  if (message.startsWith('/check ')) {
    const parts = message.split(' ');
    if (parts.length >= 2) {
      const usernameToCheck = parts[1].trim();
      createBotInstance(usernameToCheck, (resultMessage) => {
        player.write('chat', {
          message: JSON.stringify({ text: resultMessage }),
          position: 1,
          sender: 'Server'
        });
      });
    }
  } else if (message.trim() === '/prv') {
    const entries = loadPrevData();
    const listMessage = entries.length === 0
      ? 'No previous usernames tracked.'
      : entries.map(formatStatusEntry).join('\n');
    player.write('chat', {
      message: JSON.stringify({ text: listMessage }),
      position: 1,
      sender: 'Server'
    });
  } else if (message.trim() === '/eraseusernames') {
    clearPrevData();
    player.write('chat', {
      message: JSON.stringify({ text: "All previous usernames have been erased." }),
      position: 1,
      sender: 'Server'
    });
  } else if (message.trim() === '/faq') {
    // Updated FAQ text with three bullet points.
    player.write('chat', {
      message: JSON.stringify({ text: "FAQ:\n• Premium account: Premium accounts cannot be checked.\n• IP banned: If you're IP banned, use a proxy.\n• Why Minecraft? We ported our Electron app to Minecraft because it's funnier, no need to tab out, and easier to manage!" }),
      position: 1,
      sender: 'Server'
    });
  } else if (message.trim() === '/help') {
    player.write('chat', {
      message: JSON.stringify({ text: "BlocksMCTrackUtils: /prv to view tracked usernames, /eraseusernames to clear all usernames, /check <username> to check status." }),
      position: 1,
      sender: 'Server'
    });
  }
}

proxy.on('login', (player) => {
  console.log(`Player ${player.username} connected.`);

  player.write('chat', {
    message: JSON.stringify({ text: 'Welcome to the Ban Tracker Server. Commands: /check <username>, /prv, /eraseusernames, /faq, /help' }),
    position: 1,
    sender: 'Server'
  });

  player.on('chat', (data) => {
    const message = data.message.trim();
    if (
      message.startsWith('/check') ||
      message === '/prv' ||
      message === '/eraseusernames' ||
      message === '/help' ||
      message === '/faq'
    ) {
      handleInternalCommand(player, data);
      return;
    }
  });

  const overrideLocalWrite = () => {
    if (player.localClient) {
      const originalWrite = player.localClient.write;
      player.localClient.write = function(packetName, packetData) {
        if (packetName === 'chat' && typeof packetData.message === 'string') {
          const cmd = packetData.message.trim();
          if (
            cmd.startsWith('/check') ||
            cmd === '/prv' ||
            cmd === '/eraseusernames' ||
            cmd === '/help' ||
            cmd === '/faq'
          ) {
            console.log(`Intercepted internal command '${cmd}' from ${player.username}, not forwarding to backend.`);
            return;
          }
        }
        return originalWrite.call(this, packetName, packetData);
      };
    } else {
      setTimeout(overrideLocalWrite, 100);
    }
  };
  overrideLocalWrite();
});
