import 'dotenv/config'

export const config = {
  prefix: process.env.BOT_PREFIX || '.',

  botName: process.env.BOT_NAME || 'WANNA-CRY THANXIEE',
  botVersion: process.env.BOT_VERSION || '30.1.0',
  ownerName: process.env.OWNER_NAME || 'THANXIEE DEV',
  channelLink:
    process.env.CHANNEL_LINK ||
    'https://whatsapp.com/channel/0029VbE9KJvJkK73C7RNvP2z',
  githubRepo:
    process.env.GITHUB_REPO ||
    'https://github.com/mrzeroexploitzw/wana-crythanxiev30',

  owners: (process.env.OWNERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  pairingNumber: process.env.PAIRING_NUMBER || '',
  authDir: process.env.AUTH_DIR || 'auth_info',

  // 'public' = anyone can use commands, 'self' = owners only
  botMode: process.env.BOT_MODE || 'public',

  geminiApiKey: process.env.GEMINI_API_KEY || '',
  moderationAction: process.env.MODERATION_ACTION || 'kick', // 'warn' | 'kick'

  statsIntervalDays: Number(process.env.STATS_INTERVAL_DAYS || 2),

  // Rate limiting
  rateLimit: {
    windowMs: 10_000, // 10s window
    maxPerWindow: 6, // max commands per user per window
  },

  // Antisec hard caps
  antisec: {
    maxTextLength: 4000,
    maxMentions: 30,
    maxContacts: 5,
    violationsBeforeKick: 3, // malformed/abnormal messages before auto-kick
    violationWindowMs: 60_000,
  },
}
