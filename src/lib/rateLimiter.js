import { config } from '../config.js'

// Simple sliding-window rate limiter, per sender JID, plus a single global
// send queue so outbound traffic never bursts — this is what protects the
// WhatsApp account from being flagged for spam-like behavior.

const windows = new Map() // jid -> [timestamps]

export function isRateLimited(jid) {
  const now = Date.now()
  const { windowMs, maxPerWindow } = config.rateLimit
  const arr = (windows.get(jid) || []).filter((t) => now - t < windowMs)
  arr.push(now)
  windows.set(jid, arr)
  return arr.length > maxPerWindow
}

// --- Global outbound send queue -------------------------------------------
// Every outbound message funnels through here so sends are spaced out,
// never fired in an uncontrolled burst even if many events fire at once.

const queue = []
let draining = false

function minGapMs() {
  // Randomized gap between sends, keeps traffic looking human-paced.
  return 300 + Math.random() * 500
}

export function enqueueSend(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject })
    drain()
  })
}

async function drain() {
  if (draining) return
  draining = true
  while (queue.length) {
    const { fn, resolve, reject } = queue.shift()
    try {
      resolve(await fn())
    } catch (e) {
      reject(e)
    }
    await new Promise((r) => setTimeout(r, minGapMs()))
  }
  draining = false
}
