import { renderInfoCard, sendCard } from '../branding.js'
import { config } from '../config.js'

const restartCooldowns = new Map()

function fmtUptime() {
  const s = Math.floor(process.uptime())
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`
}


async function requestReconnect(ctx) {
  const { sock, jid, quoted, isGroup, restartSession, sessionId } = ctx
  if (isGroup) {
    await sendCard(sock, jid, { lines: ['For safety, use this command in a private chat with the bot.'], quoted })
    return
  }
  if (typeof restartSession !== 'function' || !sessionId) {
    await sendCard(sock, jid, { lines: ['Reconnect control is available only for dashboard-managed sessions.'], quoted })
    return
  }
  const now = Date.now()
  const last = restartCooldowns.get(sessionId) || 0
  if (now - last < 90_000) {
    const wait = Math.ceil((90_000 - (now - last)) / 1000)
    await sendCard(sock, jid, { lines: [`A reconnect was requested recently. Try again in ${wait} seconds.`], quoted })
    return
  }
  restartCooldowns.set(sessionId, now)
  await sendCard(sock, jid, {
    title: 'RECONNECTING',
    lines: ['The bot is reconnecting this WhatsApp session. Your pairing credentials will be kept.'],
    quoted,
  })
  setTimeout(() => {
    Promise.resolve(restartSession()).catch((err) => {
      console.error('[chat-restart] failed:', err?.message || err)
    })
  }, 1200)
}

export const coreCommands = {
  menu: {
    description: 'Show the main menu',
    permission: 'public',
    async run({ sock, jid, quoted }) {
      await sendCard(sock, jid, {
        lines: [renderInfoCard()],
        extra:
          `\n\n` +
          `*${config.botName} BOT*\n` +
          `→ *${config.prefix}allmenu* — full command list\n` +
          `→ *${config.prefix}botmenu* — bot & owner tools\n` +
          `→ *${config.prefix}antisecmenu* — protection status`,
        quoted,
      })
    },
  },

  restart: {
    description: 'Reconnect this bot session without unlinking WhatsApp',
    permission: 'public',
    async run(ctx) { await requestReconnect(ctx) },
  },

  reconnect: {
    description: 'Reconnect this bot session without unlinking WhatsApp',
    permission: 'public',
    async run(ctx) { await requestReconnect(ctx) },
  },

  reset: {
    description: 'Safely reconnect this bot session (does not erase pairing)',
    permission: 'public',
    async run(ctx) { await requestReconnect(ctx) },
  },

  ping: {
    description: 'Check latency',
    permission: 'public',
    async run({ sock, jid, quoted }) {
      const start = Date.now()
      await sendCard(sock, jid, { lines: [`🏓 Pong! ${Date.now() - start}ms`], quoted })
    },
  },

  alive: {
    description: 'Check if the bot is running',
    permission: 'public',
    async run({ sock, jid, quoted }) {
      await sendCard(sock, jid, {
        title: 'ALIVE',
        lines: [`${config.botName} is online.`, `Uptime: ${fmtUptime()}`],
        quoted,
      })
    },
  },

  uptime: {
    description: 'Show bot uptime',
    permission: 'public',
    async run({ sock, jid, quoted }) {
      await sendCard(sock, jid, { lines: [`Uptime: ${fmtUptime()}`], quoted })
    },
  },

  runtime: {
    description: 'Show Node.js runtime version',
    permission: 'public',
    async run({ sock, jid, quoted }) {
      await sendCard(sock, jid, { lines: [`Runtime: ${process.version}`], quoted })
    },
  },

  owner: {
    description: 'Show bot owner & repo info',
    permission: 'public',
    async run({ sock, jid, quoted }) {
      await sendCard(sock, jid, {
        title: 'OWNER',
        lines: [
          `OWNER: ${config.ownerName}`,
          `GITHUB: ${config.githubRepo}`,
          `CHANNEL: ${config.channelLink}`,
        ],
        quoted,
      })
    },
  },

  channel: {
    description: 'Show the official channel link',
    permission: 'public',
    async run({ sock, jid, quoted }) {
      await sendCard(sock, jid, { lines: [config.channelLink], quoted })
    },
  },

  jid: {
    description: 'Show the current chat JID',
    permission: 'public',
    async run({ sock, jid, quoted }) {
      await sendCard(sock, jid, { lines: [jid], quoted })
    },
  },

  allmenu: {
    description: 'List every available command',
    permission: 'public',
    async run({ sock, jid, quoted, allCommands }) {
      const lines = Object.entries(allCommands)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, cmd]) => `${config.prefix}${name} — ${cmd.description}`)
      await sendCard(sock, jid, { title: 'ALL COMMANDS', lines, quoted })
    },
  },

  botmenu: {
    description: 'Show bot & owner control commands',
    permission: 'public',
    async run({ sock, jid, quoted, allCommands }) {
      const ownerOnly = Object.entries(allCommands)
        .filter(([, cmd]) => cmd.permission === 'owner')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, cmd]) => `${config.prefix}${name} — ${cmd.description}`)
      await sendCard(sock, jid, {
        title: 'BOT / OWNER MENU',
        lines: ownerOnly.length ? ownerOnly : ['No owner-only commands registered.'],
        quoted,
      })
    },
  },
}
