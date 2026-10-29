import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import P from 'pino'
import qrcode from 'qrcode-terminal'
import { config } from './config.js'
import { registerMessageHandler } from './handlers/messageHandler.js'
import { registerGroupEvents } from './handlers/groupEvents.js'
import { startStatsScheduler } from './lib/scheduler.js'

const logger = P({ level: 'warn' })

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
    browser: Browsers.macOS(config.botName),
  })

  // Pairing code flow (preferred for headless/server deployments)
  if (config.pairingNumber && !sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(config.pairingNumber)
        console.log(`\n=== PAIRING CODE for ${config.pairingNumber}: ${code} ===\n`)
      } catch (err) {
        console.error('Failed to request pairing code:', err.message)
      }
    }, 3000)
  }

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr && !config.pairingNumber) {
      console.log('\nScan this QR code with WhatsApp:\n')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
      const loggedOut = statusCode === DisconnectReason.loggedOut

      console.warn(`Connection closed (code ${statusCode}). Logged out: ${loggedOut}`)

      if (!loggedOut) {
        console.log('Reconnecting...')
        setTimeout(start, 3000)
      } else {
        console.error('Session logged out. Delete the auth folder and pair again.')
      }
    } else if (connection === 'open') {
      console.log(`✅ ${config.botName} v${config.botVersion} connected.`)
      startStatsScheduler(sock)
    }
  })

  registerMessageHandler(sock)
  registerGroupEvents(sock)

  return sock
}

start().catch((err) => {
  console.error('Fatal startup error:', err)
  // Never let a startup crash kill the process silently in a way that
  // looks like a clean exit — retry instead of dying, since this runs
  // unattended on Render.
  setTimeout(start, 5000)
})

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] contained:', err?.message || err)
})
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection] contained:', err?.message || err)
})
