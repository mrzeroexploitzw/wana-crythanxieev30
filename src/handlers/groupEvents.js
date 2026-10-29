import { sendCard } from '../branding.js'
import { renderWelcome } from '../data/welcomeTemplates.js'
import { renderGoodbye } from '../data/goodbyeTemplates.js'
import { getGroupSettings, bumpJoin, bumpLeave } from '../db.js'
import { enqueueSend } from '../lib/rateLimiter.js'
import { guarded } from '../lib/antisec.js'

function numberOf(jid) {
  return jid?.split('@')[0]
}

export function registerGroupEvents(sock) {
  sock.ev.on(
    'group-participants.update',
    guarded('group-participants.update', async (update) => {
      const { id: groupJid, participants, action } = update
      const settings = getGroupSettings(groupJid)

      let meta
      try {
        meta = await sock.groupMetadata(groupJid)
      } catch {
        return
      }

      for (const participant of participants) {
        const user = `@${numberOf(participant)}`

        if (action === 'add') {
          bumpJoin(groupJid)
          if (!settings.welcome) continue
          const count = meta.participants.length
          const text = renderWelcome(user, meta.subject, count)
          await enqueueSend(() =>
            sendCard(sock, groupJid, {
              title: 'WELCOME',
              lines: [text],
              mentions: [participant],
            })
          ).catch(() => {})
        }

        if (action === 'remove') {
          bumpLeave(groupJid)
          if (!settings.goodbye) continue
          const text = renderGoodbye(user, meta.subject)
          await enqueueSend(() =>
            sendCard(sock, groupJid, {
              title: 'GOODBYE',
              lines: [text],
              mentions: [participant],
            })
          ).catch(() => {})
        }
      }
    })
  )
}
