import { config } from '../config.js'
import { validateMessage, recordViolation, clearViolations, guarded } from '../lib/antisec.js'
import { isRateLimited, enqueueSend } from '../lib/rateLimiter.js'
import { preReplyPause } from '../lib/humanDelay.js'
import { moderateText } from '../lib/gemini.js'
import { bumpMessageCount, getGroupSettings } from '../db.js'
import { routeCommand } from './commandRouter.js'
import { sendCard } from '../branding.js'

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

function hasMedia(msg) {
  const m = msg.message || {}
  return Boolean(m.imageMessage || m.videoMessage || m.stickerMessage)
}

function getMentions(msg) {
  const ctx =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo
  return ctx?.mentionedJid || []
}

function getQuoted(msg) {
  const ctx =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo
  if (!ctx?.quotedMessage) return { text: null, participant: null }
  const qm = ctx.quotedMessage
  const text = qm.conversation || qm.extendedTextMessage?.text || ''
  return { text, participant: ctx.participant || null }
}

const LINK_RE = /(https?:\/\/|wa\.me\/|chat\.whatsapp\.com\/)/i

export function registerMessageHandler(sock, controls = {}) {
  sock.ev.on(
    'messages.upsert',
    guarded('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue

        const jid = msg.key.remoteJid
        const isGroup = jid.endsWith('@g.us')
        const sender = isGroup ? msg.key.participant : jid

        // ---- Antisec: structural validation first, before anything else ----
        const validation = validateMessage(msg)
        if (!validation.ok) {
          console.warn(`[antisec] rejected message from ${sender}: ${validation.reason}`)
          const shouldKick = recordViolation(sender)
          if (isGroup && shouldKick) {
            try {
              await sock.groupParticipantsUpdate(jid, [sender], 'remove')
              clearViolations(sender)
              await enqueueSend(() =>
                sendCard(sock, jid, {
                  title: 'ANTISEC',
                  lines: [`@${sender.split('@')[0]} was removed for repeated abnormal messages.`],
                  mentions: [sender],
                })
              )
            } catch (err) {
              console.error('[antisec] auto-kick failed:', err.message)
            }
          }
          continue // never process a rejected message further
        }

        // ---- Rate limiting ----
        if (isRateLimited(sender)) {
          continue // silently drop, no reply, to avoid feeding a flood
        }

        const text = extractText(msg).trim()
        const mentionedJids = getMentions(msg)
        const quoted = getQuoted(msg)

        if (isGroup) bumpMessageCount(jid, sender)

        let isSenderAdmin = false
        if (isGroup) {
          try {
            const meta = await sock.groupMetadata(jid)
            const p = meta.participants.find((x) => x.id === sender)
            isSenderAdmin = p?.admin === 'admin' || p?.admin === 'superadmin'
          } catch {}
        }

        const ctx = {
          sock,
          msg,
          jid,
          sender,
          isGroup,
          isSenderAdmin,
          mentionedJids,
          quotedText: quoted.text,
          quotedParticipant: quoted.participant,
          quoted: msg,
          sessionId: controls.sessionId,
          restartSession: controls.restartSession,
        }

        // ---- Command handling ----
        if (text.startsWith(config.prefix)) {
          await preReplyPause()
          const handled = await routeCommand(text, ctx)
          if (handled) continue
        }

        // ---- Group auto-moderation (non-command messages) ----
        if (isGroup) {
          const settings = getGroupSettings(jid)

          if (settings.antilink && LINK_RE.test(text) && !isSenderAdmin) {
            try {
              await sock.sendMessage(jid, { delete: msg.key })
            } catch {}
            await enqueueSend(() =>
              sendCard(sock, jid, {
                lines: [`@${sender.split('@')[0]}, links are not allowed here.`],
                mentions: [sender],
              })
            )
            continue
          }

          if (settings.autoModeration && config.geminiApiKey && (text || hasMedia(msg))) {
            const result = await moderateText(sender, text || '[media message]')
            if (result.flagged) {
              try {
                await sock.sendMessage(jid, { delete: msg.key })
              } catch {}

              if (config.moderationAction === 'kick') {
                try {
                  await sock.groupParticipantsUpdate(jid, [sender], 'remove')
                } catch {}
                await enqueueSend(() =>
                  sendCard(sock, jid, {
                    title: 'AI MODERATION',
                    lines: [
                      `@${sender.split('@')[0]} was removed — flagged content (${result.reason}).`,
                    ],
                    mentions: [sender],
                  })
                )
              } else {
                await enqueueSend(() =>
                  sendCard(sock, jid, {
                    title: 'AI MODERATION',
                    lines: [`@${sender.split('@')[0]}, that message was removed (${result.reason}).`],
                    mentions: [sender],
                  })
                )
              }
            }
          }
        }
      }
    })
  )
}
