import { sendCard } from '../branding.js'
import {
  getGroupSettings,
  updateGroupSettings,
  addWarning,
  resetWarnings,
  getWarnings,
  listWarnings,
} from '../db.js'

function isAdminAction(ctx) {
  return ctx.isGroup && (ctx.isSenderAdmin || ctx.isOwner)
}

async function requireGroupAdmin(ctx) {
  if (!ctx.isGroup) {
    await sendCard(ctx.sock, ctx.jid, { lines: ['This command only works in groups.'] })
    return false
  }
  if (!isAdminAction(ctx)) {
    await sendCard(ctx.sock, ctx.jid, { lines: ['You must be a group admin to use this.'] })
    return false
  }
  return true
}

function targetParticipant(ctx) {
  const mentioned = ctx.mentionedJids?.[0]
  const quotedParticipant = ctx.quotedParticipant
  return mentioned || quotedParticipant || null
}

export const moderationCommands = {
  kick: {
    description: 'Kick a mentioned/replied user. Usage: .kick (reply or @mention)',
    permission: 'admin',
    async run(ctx) {
      if (!(await requireGroupAdmin(ctx))) return
      const target = targetParticipant(ctx)
      if (!target) {
        return sendCard(ctx.sock, ctx.jid, { lines: ['Mention or reply to the user to kick.'] })
      }
      await ctx.sock.groupParticipantsUpdate(ctx.jid, [target], 'remove')
      await sendCard(ctx.sock, ctx.jid, { lines: [`Removed @${target.split('@')[0]}`], mentions: [target] })
    },
  },

  promote: {
    description: 'Promote a user to admin',
    permission: 'admin',
    async run(ctx) {
      if (!(await requireGroupAdmin(ctx))) return
      const target = targetParticipant(ctx)
      if (!target) return sendCard(ctx.sock, ctx.jid, { lines: ['Mention or reply to the user.'] })
      await ctx.sock.groupParticipantsUpdate(ctx.jid, [target], 'promote')
      await sendCard(ctx.sock, ctx.jid, { lines: [`Promoted @${target.split('@')[0]}`], mentions: [target] })
    },
  },

  demote: {
    description: 'Demote an admin to member',
    permission: 'admin',
    async run(ctx) {
      if (!(await requireGroupAdmin(ctx))) return
      const target = targetParticipant(ctx)
      if (!target) return sendCard(ctx.sock, ctx.jid, { lines: ['Mention or reply to the user.'] })
      await ctx.sock.groupParticipantsUpdate(ctx.jid, [target], 'demote')
      await sendCard(ctx.sock, ctx.jid, { lines: [`Demoted @${target.split('@')[0]}`], mentions: [target] })
    },
  },

  warn: {
    description: 'Warn a mentioned/replied user',
    permission: 'admin',
    async run(ctx) {
      if (!(await requireGroupAdmin(ctx))) return
      const target = targetParticipant(ctx)
      if (!target) return sendCard(ctx.sock, ctx.jid, { lines: ['Mention or reply to the user.'] })
      const count = addWarning(ctx.jid, target)
      await sendCard(ctx.sock, ctx.jid, {
        title: 'WARNING',
        lines: [`@${target.split('@')[0]} has been warned (${count}/3)`],
        mentions: [target],
      })
      if (count >= 3) {
        await ctx.sock.groupParticipantsUpdate(ctx.jid, [target], 'remove')
        resetWarnings(ctx.jid, target)
        await sendCard(ctx.sock, ctx.jid, {
          lines: [`@${target.split('@')[0]} reached 3 warnings and was removed.`],
          mentions: [target],
        })
      }
    },
  },

  unwarn: {
    description: 'Clear warnings for a user',
    permission: 'admin',
    async run(ctx) {
      if (!(await requireGroupAdmin(ctx))) return
      const target = targetParticipant(ctx)
      if (!target) return sendCard(ctx.sock, ctx.jid, { lines: ['Mention or reply to the user.'] })
      resetWarnings(ctx.jid, target)
      await sendCard(ctx.sock, ctx.jid, { lines: [`Warnings cleared for @${target.split('@')[0]}`], mentions: [target] })
    },
  },

  listwarn: {
    description: 'List all warnings in this group',
    permission: 'admin',
    async run(ctx) {
      if (!ctx.isGroup) return
      const warnings = listWarnings(ctx.jid)
      const entries = Object.entries(warnings)
      if (!entries.length) return sendCard(ctx.sock, ctx.jid, { lines: ['No warnings recorded.'] })
      await sendCard(ctx.sock, ctx.jid, {
        title: 'WARN LIST',
        lines: entries.map(([id, c]) => `${id.split('@')[0]}: ${c}/3`),
      })
    },
  },

  antilink: {
    description: 'Toggle anti-link protection. Usage: .antilink on|off',
    permission: 'admin',
    async run(ctx) {
      if (!(await requireGroupAdmin(ctx))) return
      const on = ctx.args[0]?.toLowerCase() === 'on'
      updateGroupSettings(ctx.jid, { antilink: on })
      await sendCard(ctx.sock, ctx.jid, { lines: [`Anti-link is now ${on ? 'ON' : 'OFF'}`] })
    },
  },

  antispam: {
    description: 'Toggle anti-spam protection. Usage: .antispam on|off',
    permission: 'admin',
    async run(ctx) {
      if (!(await requireGroupAdmin(ctx))) return
      const on = ctx.args[0]?.toLowerCase() === 'on'
      updateGroupSettings(ctx.jid, { antispam: on })
      await sendCard(ctx.sock, ctx.jid, { lines: [`Anti-spam is now ${on ? 'ON' : 'OFF'}`] })
    },
  },

  welcome: {
    description: 'Toggle welcome messages. Usage: .welcome on|off',
    permission: 'admin',
    async run(ctx) {
      if (!(await requireGroupAdmin(ctx))) return
      const on = ctx.args[0]?.toLowerCase() !== 'off'
      updateGroupSettings(ctx.jid, { welcome: on })
      await sendCard(ctx.sock, ctx.jid, { lines: [`Welcome messages are now ${on ? 'ON' : 'OFF'}`] })
    },
  },

  goodbye: {
    description: 'Toggle goodbye messages. Usage: .goodbye on|off',
    permission: 'admin',
    async run(ctx) {
      if (!(await requireGroupAdmin(ctx))) return
      const on = ctx.args[0]?.toLowerCase() !== 'off'
      updateGroupSettings(ctx.jid, { goodbye: on })
      await sendCard(ctx.sock, ctx.jid, { lines: [`Goodbye messages are now ${on ? 'ON' : 'OFF'}`] })
    },
  },

  groupinfo: {
    description: 'Show info about the current group',
    permission: 'public',
    async run(ctx) {
      if (!ctx.isGroup) return sendCard(ctx.sock, ctx.jid, { lines: ['Group only.'] })
      const meta = await ctx.sock.groupMetadata(ctx.jid)
      const settings = getGroupSettings(ctx.jid)
      await sendCard(ctx.sock, ctx.jid, {
        title: 'GROUP INFO',
        lines: [
          `NAME: ${meta.subject}`,
          `MEMBERS: ${meta.participants.length}`,
          `ANTILINK: ${settings.antilink ? 'ON' : 'OFF'}`,
          `ANTISPAM: ${settings.antispam ? 'ON' : 'OFF'}`,
          `WELCOME: ${settings.welcome ? 'ON' : 'OFF'}`,
          `GOODBYE: ${settings.goodbye ? 'ON' : 'OFF'}`,
        ],
      })
    },
  },

  tagall: {
    description: 'Mention every member in the group',
    permission: 'admin',
    async run(ctx) {
      if (!(await requireGroupAdmin(ctx))) return
      const meta = await ctx.sock.groupMetadata(ctx.jid)
      const mentions = meta.participants.map((p) => p.id)
      const text = mentions.map((m) => `@${m.split('@')[0]}`).join(' ')
      await sendCard(ctx.sock, ctx.jid, { title: 'TAG ALL', lines: [text], mentions })
    },
  },

  hidetag: {
    description: 'Send a message that silently mentions everyone',
    permission: 'admin',
    async run(ctx) {
      if (!(await requireGroupAdmin(ctx))) return
      const meta = await ctx.sock.groupMetadata(ctx.jid)
      const mentions = meta.participants.map((p) => p.id)
      const text = ctx.args.join(' ') || '.'
      await sendCard(ctx.sock, ctx.jid, { lines: [text], mentions })
    },
  },
}
