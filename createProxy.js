const NodeRSA = require('node-rsa')
const path = require('path')

const Proxy = require('./Proxy')

const mcProtocolPath = require.resolve('minecraft-protocol')
const localServerPlugins = [
  require(path.join(mcProtocolPath, '../server/handshake')),
  require(path.join(mcProtocolPath, '../server/login')),
  require(path.join(mcProtocolPath, '../server/ping'))
]

const proxyPlugins = [
  require('./Plugins/ChatCommands')
]

/**
 * Create a new proxy
 * @param {Object} localServerOptions Settings for the minecraft-protocol server
 * @param {Object} serverList An object that maps a 'serverName' to the server info
 * @returns {MinecraftProxy} A new Minecraft proxy
 */
function createProxy (localServerOptions = {}, serverList = {}, proxyOptions = {}) {
  const {
    host = '0.0.0.0',
    'server-port': serverPort,
    port = serverPort || 25565,
    motd = 'A Minecraft server',
    'max-players': maxPlayers = 20,
    version,
    favicon = 'data:image/png;base64,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',
    customPackets
  } = localServerOptions

  const {
    enablePlugins = true
  } = proxyOptions

  const optVersion = version === undefined || version === false ? require(path.join(mcProtocolPath, '../version')).defaultVersion : version

  const mcData = require('minecraft-data')(optVersion)
  const mcversion = mcData.version

  const serverOptions = {
    version: mcversion.minecraftVersion,
    customPackets: customPackets
  }

  const proxy = new Proxy(serverOptions, serverList, proxyOptions)
  proxy.mcversion = mcversion
  proxy.motd = motd
  proxy.maxPlayers = maxPlayers
  proxy.playerCount = 0
  proxy.onlineModeExceptions = {}
  proxy.favicon = favicon
  proxy.serverKey = new NodeRSA({b: 1024})

  proxy.on('connection', function (client) {
    localServerPlugins.forEach((plugin) => plugin(client, proxy, localServerOptions, proxyOptions))
    if (enablePlugins) proxyPlugins.forEach((plugin) => plugin(client, proxy, localServerOptions, proxyOptions))
  })

  proxy.listen(port, host)
  return proxy
}

module.exports = createProxy
