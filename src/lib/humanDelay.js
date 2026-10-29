// Makes the bot behave less like an instant script: shows typing/recording
// presence and waits a delay scaled to the reply length, with jitter, before
// actually sending. This is the core "antiban" pacing layer.

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function jitter(base, spreadPct = 0.35) {
  const spread = base * spreadPct
  return base + (Math.random() * 2 - 1) * spread
}

// ~ reading/typing speed simulation: base delay + per-character delay, capped.
export function computeDelay(text = '') {
  const base = 500
  const perChar = 18
  const raw = base + Math.min(text.length, 300) * perChar
  const capped = Math.min(raw, 6000)
  return Math.max(400, Math.round(jitter(capped)))
}

export async function humanizedSend(sock, jid, sendFn, replyText = '') {
  try {
    await sock.presenceUpdate('composing', jid)
  } catch {
    /* presence updates can fail silently, never block the reply */
  }

  await sleep(computeDelay(replyText))

  try {
    await sock.presenceUpdate('paused', jid)
  } catch {}

  return sendFn()
}

// Small random delay before even starting to "type" — simulates a human
// noticing the message rather than reacting at machine speed.
export async function preReplyPause() {
  await sleep(jitter(700, 0.5))
}
