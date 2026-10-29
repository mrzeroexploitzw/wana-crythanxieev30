// Gemini wrapper used by the single "master bot" key shared across all
// users/groups. Protects the shared quota with four layers, in order:
//   1. Local regex/word pre-filter (free, instant) — skips the obvious cases
//   2. Response cache (keyed by text hash) — avoids re-scoring repeats
//   3. Single global queue — serializes calls so bursts don't spike quota
//   4. Per-sender throttle — stops one busy group from exhausting it for
//      everyone else

import { config } from '../config.js'
import { localFlag } from '../data/badwords.js'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const cache = new Map() // textHash -> { result, expiry }
const CACHE_TTL_MS = 10 * 60 * 1000

const perUserLastCall = new Map()
const PER_USER_MIN_GAP_MS = 4000 // simple per-user fair-use throttle

let queue = Promise.resolve()

function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0
  }
  return String(h)
}

function enqueue(fn) {
  const run = queue.then(fn, fn)
  queue = run.catch(() => {})
  return run
}

async function callGemini(prompt) {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }
  const res = await fetch(`${GEMINI_URL}?key=${config.geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  })
  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// Moderates a piece of text. Returns { flagged, reason }.
export async function moderateText(senderId, text) {
  if (!text || !text.trim()) return { flagged: false }

  // Layer 1: local pre-filter can fast-flag obvious cases without Gemini.
  if (localFlag(text)) {
    return { flagged: true, reason: 'matched local bad-word pattern' }
  }

  // Layer 2: cache
  const key = hash(text.toLowerCase().trim())
  const cached = cache.get(key)
  if (cached && cached.expiry > Date.now()) {
    return cached.result
  }

  // Layer 4: per-user throttle — if this sender called too recently, skip
  // the Gemini check this time rather than blocking or erroring out.
  const now = Date.now()
  const last = perUserLastCall.get(senderId) || 0
  if (now - last < PER_USER_MIN_GAP_MS) {
    return { flagged: false, reason: 'throttled - skipped' }
  }
  perUserLastCall.set(senderId, now)

  // Layer 3: global queue
  const result = await enqueue(async () => {
    try {
      const prompt = `You are a strict WhatsApp group content moderator. Judge the following message for: sexual content, explicit/NSFW content, slurs, harassment, or ritual/occult threatening language aimed at harming someone. Reply with ONLY one word: "FLAG" if it violates these rules, or "OK" if it does not.\n\nMessage: """${text}"""`
      const out = await callGemini(prompt)
      const flagged = /FLAG/i.test(out.trim())
      return { flagged, reason: flagged ? 'gemini flagged content' : undefined }
    } catch (err) {
      console.error('[gemini] moderation call failed:', err.message)
      return { flagged: false, reason: 'gemini unavailable' }
    }
  })

  cache.set(key, { result, expiry: Date.now() + CACHE_TTL_MS })
  return result
}

// Translates text to targetLang (e.g. "English", "Shona", "French").
// If targetLang is omitted, detects the language and translates to English.
export async function translateText(text, targetLang) {
  const prompt = targetLang
    ? `Translate the following text to ${targetLang}. Reply with ONLY the translated text, nothing else.\n\n"""${text}"""`
    : `Detect the language of the following text and translate it to English. Reply in this exact format:\nDetected: <language>\nTranslation: <translated text>\n\n"""${text}"""`

  return callGemini(prompt)
}

// General-purpose chat reply (.ai command)
export async function chatReply(prompt) {
  return callGemini(prompt)
}
