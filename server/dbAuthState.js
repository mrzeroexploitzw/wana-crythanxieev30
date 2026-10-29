// Postgres-backed replacement for Baileys' useMultiFileAuthState, so
// sessions survive Render redeploys (Render's local disk does not).
import { initAuthCreds, BufferJSON, proto } from '@whiskeysockets/baileys'
import { pool } from './db.js'

async function readValue(sessionId, keyType, keyId) {
  const { rows } = await pool.query(
    'SELECT value FROM auth_state WHERE session_id = $1 AND key_type = $2 AND key_id = $3',
    [sessionId, keyType, keyId]
  )
  if (!rows.length) return null
  return JSON.parse(JSON.stringify(rows[0].value), BufferJSON.reviver)
}

async function writeValue(sessionId, keyType, keyId, value) {
  const json = JSON.parse(JSON.stringify(value, BufferJSON.replacer))
  await pool.query(
    `INSERT INTO auth_state (session_id, key_type, key_id, value)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (session_id, key_type, key_id)
     DO UPDATE SET value = EXCLUDED.value`,
    [sessionId, keyType, keyId, json]
  )
}

async function deleteValue(sessionId, keyType, keyId) {
  await pool.query('DELETE FROM auth_state WHERE session_id = $1 AND key_type = $2 AND key_id = $3', [
    sessionId,
    keyType,
    keyId,
  ])
}

export async function useDbAuthState(sessionId) {
  const storedCreds = await readValue(sessionId, 'creds', 'main')
  const creds = storedCreds || initAuthCreds()

  const saveCreds = async () => {
    await writeValue(sessionId, 'creds', 'main', creds)
  }

  const keys = {
    get: async (type, ids) => {
      const result = {}
      for (const id of ids) {
        let value = await readValue(sessionId, type, id)
        if (type === 'app-state-sync-key' && value) {
          value = proto.Message.AppStateSyncKeyData.fromObject(value)
        }
        if (value) result[id] = value
      }
      return result
    },
    set: async (data) => {
      const tasks = []
      for (const category in data) {
        for (const id in data[category]) {
          const value = data[category][id]
          tasks.push(value ? writeValue(sessionId, category, id, value) : deleteValue(sessionId, category, id))
        }
      }
      await Promise.all(tasks)
    },
  }

  return { state: { creds, keys }, saveCreds }
}

export async function wipeAuthState(sessionId) {
  await pool.query('DELETE FROM auth_state WHERE session_id = $1', [sessionId])
}
