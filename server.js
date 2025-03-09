const mc = require('minecraft-protocol');
const mineflayer = require('mineflayer');
const fs = require('fs');
const path = require('path');
const Chunk = require('prismarine-chunk')('1.8.9');  // Use 1.8.9 here
const Vec3 = require('vec3');

// Data file configuration – data will be stored at C:\BlocksMC_TrackerData\prv.txt
const DATA_FOLDER = 'C:\\BlocksMC_TrackerData';
const DATA_FILE = path.join(DATA_FOLDER, 'prv.txt');
if (!fs.existsSync(DATA_FOLDER)) {
  fs.mkdirSync(DATA_FOLDER, { recursive: true });
}

// Mapping for status codes to human-readable messages with color codes
const statusMapping = {
  ipban: { text: "Failed to check because of IP banned", color: "§5" },       // Dark Purple
  slowdown: { text: "Rate limit failed check", color: "§3" },                  // Dark Aqua
  premium: { text: "Failed to check because of premium no ability to know if banned", color: "§d" }, // Light Purple
  unbp: { text: "is currently not banned and playing rn", color: "§b" },        // Aqua
  not: { text: "is not banned", color: "§a" }                                   // Green
};

// Update the tracking file for a given player (status codes: not, unbp, premium, ipban, slowdown)
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

// Load the stored tracking data as an array of strings
function loadPrevData() {
  if (fs.existsSync(DATA_FILE)) {
    return fs.readFileSync(DATA_FILE, 'utf8').split('\n').filter(Boolean);
  }
  return [];
}

// Clear the tracking file (erase all usernames)
function clearPrevData() {
  fs.writeFileSync(DATA_FILE, '', 'utf8');
}

// Function to format stored entry into human-readable message
function formatStatusEntry(entry) {
  // Entry format: [player:username|st:status]
  const match = entry.match(/\[player:(.*?)\|st:(.*?)\]/);
  if (match) {
    const username = match[1];
    const status = match[2];
    if (statusMapping[status]) {
      return username + ": " + statusMapping[status].color + statusMapping[status].text;
    } else {
      return username + ": " + status;
    }
  }
  return entry;
}

// New function: generate and send a chunk filled entirely with grass (block ID 2)
function sendGrassChunk(client, chunkX, chunkZ) {
  const chunk = new Chunk();
  // Loop through every block in the 16x256x16 chunk and set to grass
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 256; y++) {
      for (let z = 0; z < 16; z++) {
        chunk.setBlockType(new Vec3(x, y, z), 2);
        chunk.setBlockData(new Vec3(x, y, z), 0);
        chunk.setSkyLight(new Vec3(x, y, z), 15);
      }
    }
  }
  const data = chunk.dump() || Buffer.alloc(0);
  const bitMap = chunk.getMask();
  client.write('map_chunk', {
    x: chunkX,
    z: chunkZ,
    groundUpContinuous: true,  // required for 1.8.9
    primaryBitMap: bitMap,
    addBitMap: 0,
    chunkData: data,
    blockEntities: []
  });
}

// Function to parse kick messages and convert JSON formatted messages into colored text
function parseKickMessage(message) {
  let obj;
  try {
    obj = JSON.parse(message);
  } catch (e) {
    return message;
  }
  if (obj.extra && Array.isArray(obj.extra)) {
    let formatted = "";
    const colorMap = {
      red: "§c",
      gold: "§6",
      yellow: "§e",
      green: "§a",
      blue: "§9",
      dark_blue: "§1",
      dark_green: "§2",
      dark_aqua: "§3",
      dark_red: "§4",
      dark_purple: "§5",
      gray: "§7",
      dark_gray: "§8",
      aqua: "§b",
      light_purple: "§d",
      white: "§f"
    };
    for (const part of obj.extra) {
      let colorCode = "";
      if (part.color) {
        colorCode = colorMap[part.color] || "";
      }
      formatted += colorCode + (part.text || "");
    }
    return formatted;
  }
  return obj.text || message;
}

// Launch a mineflayer bot to check a username's status on BlocksMC
function createBotInstance(username, callback) {
  const bot = mineflayer.createBot({
    host: 'play.blocksmc.com',
    port: 25565,
    version: '1.8.9',  // use same version as client
    username: username,
    auth: 'offline'
  });
  
  let finished = false;
  function sendResult(message) {
    if (!finished) {
      finished = true;
      callback(message);
      if (bot && typeof bot.quit === 'function') {
        bot.quit("Disconnecting after final result");
      }
    }
  }
  
  bot.on("spawn", () => {
    updatePlayerStatus(username, 'not');
    setTimeout(() => {
      sendResult("§aThe player " + username + " is not banned!");
    }, 2300);
  });
  
  bot.on("kicked", (reason) => {
    let reasonObj;
    try {
      reasonObj = JSON.parse(reason);
    } catch(e) {
      reasonObj = { text: reason };
    }
    const reasonText = JSON.stringify(reasonObj);
    
    if (reasonText.includes("Premium ON") && reasonText.includes("PREMIUM.BLOCKSMC.COM")) {
      updatePlayerStatus(username, 'premium');
      sendResult("§6This is a premium account unable to check due to BlocksMC restrictions patch");
    } else if (reasonText.includes("already logged on")) {
      updatePlayerStatus(username, 'unbp');
      sendResult("§eThe player " + username + " is currently not banned and playing rn");
    } else if (reasonText.includes("banned from the server")) {
      updatePlayerStatus(username, 'ipban');
      sendResult("§cFailed to check " + username + ": You are IP banned from BlocksMC. Use a proxy to get it unbanned and be able to check");
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

// Create a custom Minecraft protocol server on localhost:3000
const mcServer = mc.createServer({
  'online-mode': false,
  host: '127.0.0.1',
  port: 3000,
  version: '1.8.9'  // match client version!
});

mcServer.on('login', client => {
  console.log(`Client ${client.username} connected.`);
  
  // Send the login packet with a view distance of 10
  client.write('login', {
    entityId: 1,
    levelType: 'default',
    gameMode: 0,
    dimension: 0,
    difficulty: 0,
    maxPlayers: 10,
    viewDistance: 10,
    reducedDebugInfo: false
  });
  
  // Send a full grid of grass-filled chunks covering the client’s view distance.
  // This will send chunks for coordinates from -10 to +10 (relative to the player's chunk)
  const viewDistance = 10;
  for (let cx = -viewDistance; cx <= viewDistance; cx++) {
    for (let cz = -viewDistance; cz <= viewDistance; cz++) {
      sendGrassChunk(client, cx, cz);
    }
  }
  
  // Send a position packet (position here can be set to the center of the world)
  client.write('position', {
    x: 0,
    y: 64,
    z: 0,
    yaw: 0,
    pitch: 0,
    flags: 0
  });
  
  // Send a welcome chat message
  client.write('chat', {
    message: JSON.stringify({ text: 'Welcome to the Ban Tracker Server. Commands: /check <username>, /prv, /eraseusernames' }),
    position: 1,
    sender: 'Server'
  });
  
  // Listen for chat commands from the client.
  client.on('chat', (packet) => {
    const message = packet.message;
    if (message.startsWith('/check ')) {
      const parts = message.split(' ');
      if (parts.length >= 2) {
        const usernameToCheck = parts[1].trim();
        createBotInstance(usernameToCheck, (resultMessage) => {
          client.write('chat', {
            message: JSON.stringify({ text: resultMessage }),
            position: 1,
            sender: 'Server'
          });
        });
      }
    } else if (message.trim() === '/prv') {
      const entries = loadPrevData();
      let listMessage = '';
      if (entries.length === 0) {
        listMessage = 'No previous usernames tracked.';
      } else {
        listMessage = entries.map(formatStatusEntry).join('\n');
      }
      client.write('chat', {
        message: JSON.stringify({ text: listMessage }),
        position: 1,
        sender: 'Server'
      });
    } else if (message.trim() === '/eraseusernames') {
      clearPrevData();
      } else if (message.trim() === '/help') {
        client.write('chat', {
        message: JSON.stringify({ text: "BlockTrackUtils: [help] /prv To view usernames previous, /eraseusernames Clear all usernames useful for storage. /check <usernameexample> It checks" }),
        position: 1,
        sender: 'Server'
        });
      } else if (message.trim() === '/eraseusernames') {
        clearPrevData();
        client.write('chat', {
        message: JSON.stringify({ text: "All previous usernames have been erased." }),
        position: 1,
        sender: 'Server'
        });
    }
  });
});

console.log('Minecraft Protocol Server running on 127.0.0.1:3000');
console.log('Bot Tracker Server running on play.blocksmc.com:25565');
