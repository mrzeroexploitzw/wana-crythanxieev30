import makeWASocket, { fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import P from 'pino'
import { useDbAuthState } from './dbAuthState.js'
import { pool } from './db.js'
import { registerMessageHandler } from '../src/handlers/messageHandler.js'
import { registerGroupEvents } from '../src/handlers/groupEvents.js'
import { startStatsScheduler } from '../src/lib/scheduler.js'
import { config } from '../src/config.js'

const logger = P({ level: 'warn' })

// sessionId -> { sock, status }
const activeSessions = new Map()

async function setStatus(sessionId, status, extra = {}) {
  const fields = { status, ...extra }
  const sets = Object.keys(fields)
    .map((k, i) => `${k} = $${i + 2}`)
    .join(', ')
  await pool.query(`UPDATE sessions SET ${sets} WHERE id = $1`, [sessionId, ...Object.values(fields)])
}

export function getSessionHandle(sessionId) {
  return activeSessions.get(sessionId)
}

// Starts (or resumes) a session. If phoneNumber is given, requests a
// pairing code and returns it; otherwise the caller is expected to use the
// 'qr' event path (not used by the dashboard flow, which standardizes on
// pairing codes, but kept available).
export async function startSession(sessionId, { phoneNumber } = {}) {
  if (activeSessions.has(sessionId)) {
    return activeSessions.get(sessionId)
  }

  const { state, saveCreds } = await useDbAuthState(sessionId)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
  })

  const handle = { sock, status: 'pairing', pairingCode: null, phoneNumber }
  activeSessions.set(sessionId, handle)

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
      const loggedOut = statusCode === DisconnectReason.loggedOut

      handle.status = 'offline'
      await setStatus(sessionId, 'offline', { last_seen_at: new Date() }).catch(() => {})

      if (loggedOut) {
        activeSessions.delete(sessionId)
      } else {
        activeSessions.delete(sessionId)
        const delay = handle.restarting ? 1200 : 4000
        setTimeout(() => startSession(sessionId, { phoneNumber }).catch((err) =>
          console.error(`[session:${sessionId}] reconnect failed:`, err.message)
        ), delay)
      }
    } else if (connection === 'open') {
      handle.status = 'online'
      await setStatus(sessionId, 'online', { connected_at: new Date(), last_seen_at: new Date() }).catch(
        () => {}
      )
      startStatsScheduler(sock)
    }
  })

  registerMessageHandler(sock, {
    sessionId,
    restartSession: () => restartSession(sessionId),
  })
  registerGroupEvents(sock)

  if (phoneNumber && !sock.authState.creds.registered) {
    try {
      // Baileys needs a short moment after socket creation before a
      // pairing code can be requested.
      await new Promise((r) => setTimeout(r, 1500))
      const code = await sock.requestPairingCode(phoneNumber)
      handle.pairingCode = code
      await setStatus(sessionId, 'pairing', { pairing_code: code, phone_number: phoneNumber })
    } catch (err) {
      handle.pairingCode = null
      console.error(`[session:${sessionId}] pairing code request failed:`, err.message)
    }
  }

  return handle
}

export async function restartSession(sessionId) {
  const handle = activeSessions.get(sessionId)
  if (!handle) {
    // A session may be offline already; a normal start resumes saved credentials.
    const { rows } = await pool.query('SELECT phone_number FROM sessions WHERE id = $1', [sessionId])
    if (!rows.length) throw new Error('Session not found')
    return startSession(sessionId, { phoneNumber: rows[0].phone_number })
  }

  handle.restarting = true
  try {
    // Close the transport without calling logout(), so stored credentials remain valid.
    handle.sock.ws?.close()
  } catch (err) {
    console.warn(`[session:${sessionId}] transport close warning:`, err?.message || err)
  }

  // Fallback in case the socket library does not emit a close event.
  setTimeout(() => {
    if (activeSessions.get(sessionId) === handle) {
      activeSessions.delete(sessionId)
      startSession(sessionId, { phoneNumber: handle.phoneNumber || undefined }).catch((err) =>
        console.error(`[session:${sessionId}] manual reconnect failed:`, err.message)
      )
    }
  }, 3500)
  return { ok: true }
}

export async function stopSession(sessionId) {
  const handle = activeSessions.get(sessionId)
  if (handle) {
    try {
      await handle.sock.logout()
    } catch {}
    activeSessions.delete(sessionId)
  }
}

// On boot, resume any session that was previously online/pairing so a
// Render restart doesn't silently drop connected users.
export async function resumeAllSessions() {
  const { rows } = await pool.query(
    "SELECT id, phone_number FROM sessions WHERE status IN ('online', 'pairing')"
  )
  for (const row of rows) {
    startSession(row.id, { phoneNumber: row.phone_number }).catch((err) =>
      console.error(`[session:${row.id}] resume failed:`, err.message)
    )
  }
}
