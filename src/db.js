// Lightweight JSON-file storage for the single-bot deployment phase.
// Swap this module for a Postgres-backed one when the multi-tenant web
// dashboard is built — the function signatures below are the contract
// the rest of the app relies on, so a drop-in replacement keeps
// everything else working unchanged.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STORE_DIR = join(__dirname, 'storage')
const STORE_FILE = join(STORE_DIR, 'data.json')

function load() {
  if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true })
  if (!existsSync(STORE_FILE)) {
    const initial = { groups: {}, warnings: {}, stats: {} }
    writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2))
    return initial
  }
  try {
    return JSON.parse(readFileSync(STORE_FILE, 'utf-8'))
  } catch {
    return { groups: {}, warnings: {}, stats: {} }
  }
}

let state = load()

function persist() {
  writeFileSync(STORE_FILE, JSON.stringify(state, null, 2))
}

export function getGroupSettings(jid) {
  if (!state.groups[jid]) {
    state.groups[jid] = {
      antilink: false,
      antispam: false,
      welcome: true,
      goodbye: true,
      autoModeration: true,
      lastStatsPost: 0,
    }
    persist()
  }
  return state.groups[jid]
}

export function updateGroupSettings(jid, patch) {
  const current = getGroupSettings(jid)
  state.groups[jid] = { ...current, ...patch }
  persist()
  return state.groups[jid]
}

export function addWarning(jid, userId) {
  state.warnings[jid] ||= {}
  state.warnings[jid][userId] = (state.warnings[jid][userId] || 0) + 1
  persist()
  return state.warnings[jid][userId]
}

export function resetWarnings(jid, userId) {
  if (state.warnings[jid]) delete state.warnings[jid][userId]
  persist()
}

export function getWarnings(jid, userId) {
  return state.warnings[jid]?.[userId] || 0
}

export function listWarnings(jid) {
  return state.warnings[jid] || {}
}

export function bumpMessageCount(jid, userId) {
  state.stats[jid] ||= { messageCount: 0, perUser: {}, joins: 0, leaves: 0, since: Date.now() }
  state.stats[jid].messageCount += 1
  state.stats[jid].perUser[userId] = (state.stats[jid].perUser[userId] || 0) + 1
  persist()
}

export function bumpJoin(jid) {
  state.stats[jid] ||= { messageCount: 0, perUser: {}, joins: 0, leaves: 0, since: Date.now() }
  state.stats[jid].joins += 1
  persist()
}

export function bumpLeave(jid) {
  state.stats[jid] ||= { messageCount: 0, perUser: {}, joins: 0, leaves: 0, since: Date.now() }
  state.stats[jid].leaves += 1
  persist()
}

export function getStats(jid) {
  return (
    state.stats[jid] || { messageCount: 0, perUser: {}, joins: 0, leaves: 0, since: Date.now() }
  )
}

export function resetStats(jid) {
  state.stats[jid] = { messageCount: 0, perUser: {}, joins: 0, leaves: 0, since: Date.now() }
  persist()
}
