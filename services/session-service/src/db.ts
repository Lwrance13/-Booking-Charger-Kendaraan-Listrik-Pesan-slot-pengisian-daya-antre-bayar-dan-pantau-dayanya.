import { Pool } from 'pg'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 2_000,
})

let dbAvailable = true

pool.on('error', () => {
  if (dbAvailable) {
    console.warn('[db] PostgreSQL not available — running with in-memory fallback')
    dbAvailable = false
  }
})

// Resilient query: returns empty result when DB is down instead of throwing
export async function query(text: string, params?: any[]) {
  if (!dbAvailable) return { rows: [], rowCount: 0 }
  try {
    const start = Date.now()
    const res = await pool.query(text, params)
    if (!dbAvailable) { dbAvailable = true; console.log('[db] PostgreSQL reconnected') }
    console.log(`[db] ${text.slice(0, 50)}… — ${Date.now() - start}ms`)
    return res
  } catch (e: any) {
    if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND' || e.message?.includes('connect')) {
      dbAvailable = false
      console.warn('[db] PostgreSQL unavailable — returning empty result for:', text.slice(0, 50))
      return { rows: [], rowCount: 0 }
    }
    throw e  // re-throw non-connection errors (e.g., syntax errors)
  }
}

export function isDbAvailable() { return dbAvailable }
