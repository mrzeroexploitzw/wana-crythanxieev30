// Structural defense against malformed / abnormal / oversized messages.
// This deliberately does NOT try to recognize any specific named exploit —
// it rejects anything outside normal WhatsApp usage shape, which catches
// known and unknown attack attempts alike, and never requires encoding
// exploit payloads into this codebase.

import { config } from '../config.js'

const violationLog = new Map() // senderId -> [timestamps]

function extractText(msg) {
  const m = msg.message
  if (!m) return ''
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ''
  )
}

function countMentions(msg) {
  const ctx =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo
  return ctx?.mentionedJid?.length || 0
}

function countContacts(msg) {
  if (msg.message?.contactMessage) return 1
  if (msg.message?.contactsArrayMessage) {
    return msg.message.contactsArrayMessage.contacts?.length || 0
  }
  return 0
}

// Returns { ok: true } or { ok: false, reason }
export function validateMessage(msg) {
  try {
    const text = extractText(msg)
    const { maxTextLength, maxMentions, maxContacts } = config.antisec

    if (text.length > maxTextLength) {
      return { ok: false, reason: `oversized text (${text.length} chars)` }
    }

    const mentions = countMentions(msg)
    if (mentions > maxMentions) {
      return { ok: false, reason: `excessive mentions (${mentions})` }
    }

    const contacts = countContacts(msg)
    if (contacts > maxContacts) {
      return { ok: false, reason: `excessive contacts (${contacts})` }
    }

    // Reject messages whose structure looks broken: a message object key
    // present but with no recognizable payload shape at all.
    if (msg.message && typeof msg.message === 'object' && Object.keys(msg.message).length === 0) {
      return { ok: false, reason: 'empty/malformed message envelope' }
    }

    return { ok: true }
  } catch (err) {
    // If parsing the message itself throws, that is itself the clearest
    // possible signal of a malformed/abnormal payload.
    return { ok: false, reason: `parse error: ${err.message}` }
  }
}

// Tracks repeated violations per sender within a rolling window and
// reports whether this sender has now crossed the auto-kick threshold.
export function recordViolation(senderId) {
  const now = Date.now()
  const { violationWindowMs, violationsBeforeKick } = config.antisec
  const arr = (violationLog.get(senderId) || []).filter((t) => now - t < violationWindowMs)
  arr.push(now)
  violationLog.set(senderId, arr)
  return arr.length >= violationsBeforeKick
}

export function clearViolations(senderId) {
  violationLog.delete(senderId)
}

// Wraps any handler so a thrown error never crashes the process or the
// session — it's isolated, logged, and (if we know the offending sender)
// counted as a violation.
export function guarded(label, fn) {
  return async (...args) => {
    try {
      await fn(...args)
    } catch (err) {
      console.error(`[antisec] handler "${label}" threw and was contained:`, err?.message || err)
    }
  }
}
