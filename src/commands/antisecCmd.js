import { sendCard, renderCard } from '../branding.js'
import { config } from '../config.js'

export const antisecCommands = {
  antisecmenu: {
    description: 'Show antisec protection status',
    permission: 'public',
    async run(ctx) {
      await sendCard(ctx.sock, ctx.jid, {
        lines: [
          renderCard('ANTISEC — PROTECTION ACTIVE', [
            `MESSAGE SIZE CAP: ${config.antisec.maxTextLength} chars`,
            `MENTION CAP: ${config.antisec.maxMentions}`,
            `CONTACT CAP: ${config.antisec.maxContacts}`,
            `AUTO-KICK THRESHOLD: ${config.antisec.violationsBeforeKick} violations / ${
              config.antisec.violationWindowMs / 1000
            }s`,
            `AI CONTENT MODERATION: ${config.geminiApiKey ? 'ON' : 'NOT CONFIGURED'}`,
            `MODERATION ACTION: ${config.moderationAction.toUpperCase()}`,
          ]),
        ],
        extra:
          '\n\nThis bot rejects malformed/abnormal messages structurally — it does not ' +
          'rely on recognizing specific known exploits, so new attack attempts are caught too. ' +
          'Senders who trigger repeated violations are automatically removed.',
      })
    },
  },
}
