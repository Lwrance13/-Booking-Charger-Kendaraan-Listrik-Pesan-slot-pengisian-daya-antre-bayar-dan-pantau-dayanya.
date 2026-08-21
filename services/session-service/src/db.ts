import { Pool } from 'pg'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 3_000,
})

pool.on('error', (err) => console.error('[db] Unexpected pool error', err))

export async function query(text: string, params?: any[]) {
  const start = Date.now()
  const res = await pool.query(text, params)
  console.log(`[db] ${text.slice(0, 60)}… — ${Date.now() - start}ms, ${res.rowCount} rows`)
  return res
}
