import cron from 'node-cron'
import { config } from '../config.js'
import { getGroupSettings, updateGroupSettings, getStats, resetStats } from '../db.js'
import { sendCard } from '../branding.js'
import { enqueueSend } from './rateLimiter.js'
import { guarded } from './antisec.js'

const DAY_MS = 24 * 60 * 60 * 1000

function topMembers(perUser, n = 3) {
  return Object.entries(perUser)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id, count]) => `${id.split('@')[0]} — ${count} msgs`)
}

async function postStatsCard(sock, groupJid, groupName) {
  const stats = getStats(groupJid)
  const days = Math.max(1, Math.round((Date.now() - stats.since) / DAY_MS))
  const top = topMembers(stats.perUser)

  await enqueueSend(() =>
    sendCard(sock, groupJid, {
      title: 'GROUP STATISTICS',
      lines: [
        `GROUP: ${groupName}`,
        `PERIOD: last ${days} day(s)`,
        `MESSAGES: ${stats.messageCount}`,
        `JOINS: ${stats.joins}`,
        `LEAVES: ${stats.leaves}`,
        ...(top.length ? [`TOP ACTIVE:`, ...top] : []),
      ],
    })
  )

  resetStats(groupJid)
  updateGroupSettings(groupJid, { lastStatsPost: Date.now() })
}

// Checks every hour; posts a stats card for any group whose last post is
// older than STATS_INTERVAL_DAYS. Using a periodic check (rather than one
// cron job per group) keeps this simple and safe across restarts.
export function startStatsScheduler(sock) {
  const intervalMs = config.statsIntervalDays * DAY_MS

  cron.schedule(
    '0 * * * *', // every hour
    guarded('stats-scheduler', async () => {
      let groups
      try {
        groups = await sock.groupFetchAllParticipating()
      } catch {
        return
      }

      for (const [jid, meta] of Object.entries(groups)) {
        const settings = getGroupSettings(jid)
        const due = Date.now() - (settings.lastStatsPost || 0) >= intervalMs
        if (due) {
          await postStatsCard(sock, jid, meta.subject).catch(() => {})
        }
      }
    })
  )
}
