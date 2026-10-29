import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

if (!process.env.JWT_SECRET) {
  console.warn('[auth] JWT_SECRET is not set — using an insecure default. Set it in production.')
}

export async function signup(email, password) {
  email = email.trim().toLowerCase()
  if (!email || !password || password.length < 6) {
    const err = new Error('Email and a password of at least 6 characters are required.')
    err.status = 400
    throw err
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rows.length) {
    const err = new Error('An account with that email already exists.')
    err.status = 409
    throw err
  }

  const hash = await bcrypt.hash(password, 10)
  const { rows } = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
    [email, hash]
  )
  return issueToken(rows[0])
}

export async function login(email, password) {
  email = email.trim().toLowerCase()
  const { rows } = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [
    email,
  ])
  const user = rows[0]
  if (!user) {
    const err = new Error('Invalid email or password.')
    err.status = 401
    throw err
  }
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) {
    const err = new Error('Invalid email or password.')
    err.status = 401
    throw err
  }
  return issueToken(user)
}

function issueToken(user) {
  const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' })
  return { token, user: { id: user.id, email: user.email } }
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing authorization token.' })

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' })
  }
}
