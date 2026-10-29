import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from './config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_IMAGE_PATH = join(__dirname, 'assets', 'bot.png')

let customImagePath = null

export function setBotImage(path) {
  customImagePath = path
}

function getImageBuffer() {
  try {
    return readFileSync(customImagePath || DEFAULT_IMAGE_PATH)
  } catch {
    return null
  }
}

function fmtDate(d = new Date()) {
  return d.toLocaleDateString('en-GB') // DD/MM/YYYY
}

function fmtDay(d = new Date()) {
  return d.toLocaleDateString('en-US', { weekday: 'long' })
}

function fmtUptime() {
  const s = Math.floor(process.uptime())
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`
}

// Renders a single boxed card in the "╭┈〔 TITLE 〕" style.
// lines: array of plain strings (already label-formatted), rendered one per row.
export function renderCard(title, lines) {
  const top = `╭┈〔 *${title}* 〕`
  const headOpen = '┆𖤍╭────↯'
  const body = lines.map((l) => `┃𖤍│➣ ${l}`).join('\n')
  const headClose = '┆𖤍╰────↯'
  const bottom = '╰┄┄┄┄┄┄┄┄┄┄┄┄┄〩'
  return [top, headOpen, body, headClose, bottom].join('\n')
}

export function renderInfoCard() {
  return renderCard('INFO BOT', [
    `OWNER: ${config.ownerName}`,
    `VERSION: ${config.botVersion}`,
    `PREFIX: ${config.prefix}`,
    `TODAY: ${fmtDay()}`,
    `DATE: ${fmtDate()}`,
    `UPTIME: ${fmtUptime()}`,
    `RUNTIME: ${process.version}`,
    `MODE: ${config.botMode === 'public' ? '🌍 Public' : '🔒 Self'}`,
    `REPO: ${config.githubRepo}`,
  ])
}

function footer() {
  return (
    `\nFollow the ${config.botName} channel on WhatsApp:\n${config.channelLink}` +
    `\nGitHub: ${config.githubRepo}`
  )
}

// Sends a branded card: image + caption, falling back to text-only if no image.
export async function sendCard(sock, jid, { title, lines, extra = '', quoted, mentions } = {}) {
  const card = title ? renderCard(title, lines) : lines.join('\n')
  const caption = `${card}${extra}${footer()}`
  const image = getImageBuffer()

  if (image) {
    return sock.sendMessage(jid, { image, caption, mentions }, { quoted })
  }
  return sock.sendMessage(jid, { text: caption, mentions }, { quoted })
}

export async function sendText(sock, jid, text, quoted) {
  // Still branded with the footer, but without a boxed card — used for
  // short replies (ping, errors) where a full card would be noisy.
  return sendCard(sock, jid, { lines: [text], quoted })
}
