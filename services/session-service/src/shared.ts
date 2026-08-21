import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'

const JWT_SECRET = process.env.JWT_SECRET ?? 'emerald-charge-secret-2026'

// RFC 7807 Problem Details error helper
export function problem(res: Response, status: number, type: string, title: string, detail: string) {
  return res.status(status).json({ type: `/errors/${type}`, title, status, detail })
}

// Standard response envelope
export function envelope(res: Response, data: unknown, status = 200) {
  return res.status(status).json({
    data,
    meta: { requestId: uuid(), timestamp: new Date().toISOString() },
    error: null,
  })
}

// JWT auth middleware — verifies Bearer token
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return problem(res, 401, 'unauthorized', 'Unauthorized', 'Bearer token required')
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as any
    ;(req as any).user = payload
    next()
  } catch {
    return problem(res, 401, 'unauthorized', 'Unauthorized', 'Invalid or expired token')
  }
}

// Generate a demo token (POST /auth/token)
export function generateToken(userId: string, role: 'user' | 'admin' = 'user') {
  return jwt.sign({ userId, role, iat: Math.floor(Date.now()/1000) }, JWT_SECRET, { expiresIn: '24h' })
}

// In-memory Redis mock with TTL — replaces Redis SETNX for slot locking
export class RedisMock {
  private store = new Map<string, { value: string; expiresAt: number }>()

  setnx(key: string, value: string, ttlSeconds: number): boolean {
    const existing = this.store.get(key)
    if (existing && Date.now() < existing.expiresAt) return false
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
    return true
  }

  get(key: string): string | null {
    const e = this.store.get(key)
    if (!e || Date.now() > e.expiresAt) { this.store.delete(key); return null }
    return e.value
  }

  del(key: string, requestId: string): boolean {
    const e = this.store.get(key)
    if (!e || e.value !== requestId) return false
    this.store.delete(key); return true
  }

  // Auto-cleanup expired keys
  gc() { for (const [k,v] of this.store) if (Date.now() > v.expiresAt) this.store.delete(k) }
}
