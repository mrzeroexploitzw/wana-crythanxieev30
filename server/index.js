import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { pool, initSchema } from './db.js'
import { signup, login, authMiddleware } from './auth.js'
import { startSession, stopSession, getSessionHandle, resumeAllSessions } from './sessionManager.js'
import { config } from '../src/config.js'

const app = express()
app.use(express.json())
app.use(
  cors({
    origin: process.env.DASHBOARD_ORIGIN?.split(',') || '*',
  })
)

// ---- Auth ------------------------------------------------------------
app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const result = await signup(email, password)
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const result = await login(email, password)
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

// ---- Sessions (require auth) ------------------------------------------
app.use('/sessions', authMiddleware)

app.get('/sessions', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, label, phone_number, region, status, pairing_code, connected_at, last_seen_at, created_at
     FROM sessions WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.userId]
  )
  res.json({ sessions: rows })
})

app.post('/sessions', async (req, res) => {
  try {
    const { phoneNumber, region = 'auto', label } = req.body || {}
    const normalizedPhone = String(phoneNumber || '').replace(/[^\d]/g, '')
    // WhatsApp pairing expects an international number without a leading +.
    // E.164 numbers contain 8-15 digits and cannot start with 0.
    if (!/^\d{8,15}$/.test(normalizedPhone) || normalizedPhone.startsWith('0')) {
      return res.status(400).json({
        error: 'Enter a valid international WhatsApp number including its country calling code (8–15 digits).',
      })
    }

    const { rows } = await pool.query(
      `INSERT INTO sessions (user_id, phone_number, region, label, status)
       VALUES ($1, $2, $3, $4, 'pairing') RETURNING id`,
      [req.userId, normalizedPhone, ['auto', 'africa', 'europe', 'us', 'asia'].includes(region) ? region : 'auto', label || normalizedPhone]
    )
    const sessionId = rows[0].id

    const handle = await startSession(sessionId, { phoneNumber: normalizedPhone })
    res.json({ sessionId, pairingCode: handle.pairingCode, status: handle.status })
  } catch (err) {
    console.error('[POST /sessions] failed:', err.message)
    res.status(500).json({ error: 'Failed to start pairing. Try again.' })
  }
})

app.get('/sessions/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM sessions WHERE id = $1 AND user_id = $2', [
    req.params.id,
    req.userId,
  ])
  if (!rows.length) return res.status(404).json({ error: 'Session not found.' })

  const live = getSessionHandle(req.params.id)
  res.json({ ...rows[0], pairing_code: live?.pairingCode || rows[0].pairing_code })
})

app.delete('/sessions/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT id FROM sessions WHERE id = $1 AND user_id = $2', [
    req.params.id,
    req.userId,
  ])
  if (!rows.length) return res.status(404).json({ error: 'Session not found.' })

  await stopSession(req.params.id)
  await pool.query('DELETE FROM sessions WHERE id = $1', [req.params.id])
  res.json({ ok: true })
})

app.get('/health', (req, res) => res.json({ ok: true, bot: config.botName, version: config.botVersion }))

const PORT = process.env.PORT || 3000

async function boot() {
  await initSchema()
  await resumeAllSessions()
  app.listen(PORT, () => console.log(`API listening on :${PORT}`))
}

boot().catch((err) => {
  console.error('Fatal server startup error:', err)
  process.exit(1)
})

process.on('uncaughtException', (err) => console.error('[uncaughtException] contained:', err?.message))
process.on('unhandledRejection', (err) => console.error('[unhandledRejection] contained:', err?.message))
