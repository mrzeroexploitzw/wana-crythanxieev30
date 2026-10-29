import { config } from '../config.js'
import { coreCommands } from '../commands/core.js'
import { moderationCommands } from '../commands/moderation.js'
import { aiCommands } from '../commands/ai.js'
import { antisecCommands } from '../commands/antisecCmd.js'
import { sendCard } from '../branding.js'

export const allCommands = {
  ...coreCommands,
  ...moderationCommands,
  ...aiCommands,
  ...antisecCommands,
}

function numberFromJid(jid = '') {
  return jid.split('@')[0].split(':')[0]
}

function isOwnerNumber(senderJid) {
  const num = numberFromJid(senderJid)
  return config.owners.includes(num)
}

function hasPermission(cmd, ctx) {
  if (cmd.permission === 'public') return true
  if (cmd.permission === 'owner') return ctx.isOwner
  if (cmd.permission === 'admin') return ctx.isOwner || ctx.isSenderAdmin
  return false
}

// ctx is built by messageHandler.js and passed straight through to the
// matched command's run().
export async function routeCommand(text, ctx) {
  if (!text.startsWith(config.prefix)) return false

  const body = text.slice(config.prefix.length).trim()
  if (!body) return false

  const [cmdName, ...args] = body.split(/\s+/)
  const name = cmdName.toLowerCase()
  const cmd = allCommands[name]
  if (!cmd) return false

  ctx.isOwner = ctx.isOwner ?? isOwnerNumber(ctx.sender)
  ctx.args = args
  ctx.allCommands = allCommands

  if (config.botMode === 'self' && !ctx.isOwner) {
    return true // silently ignore — bot is in self mode
  }

  if (!hasPermission(cmd, ctx)) {
    await sendCard(ctx.sock, ctx.jid, { lines: ['You are not allowed to use this command.'] })
    return true
  }

  try {
    await cmd.run(ctx)
  } catch (err) {
    console.error(`[command:${name}] failed:`, err?.message || err)
    await sendCard(ctx.sock, ctx.jid, { lines: ['Something went wrong running that command.'] })
  }
  return true
}
