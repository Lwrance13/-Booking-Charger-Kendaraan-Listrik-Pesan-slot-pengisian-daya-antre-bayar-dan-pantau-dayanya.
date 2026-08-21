import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { v4 as uuid } from 'uuid'
import { envelope, problem, authMiddleware } from './shared'
import { query } from './db'

const app = express()
const PORT = Number(process.env.PORT ?? 8004)
const BS_URL = process.env.BS_URL ?? 'http://localhost:8002'

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'billing-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

const TAX_RATE = 0.11
const PAYMENT_METHODS = ['QRIS', 'Virtual Account', 'E-Wallet', 'Debit']

const mapInvoiceRow = (row: any) => ({
  ...row,
  invoice_id: row.invoice_id ?? row.id,
  session_id: row.session_id,
  user_id: row.user_id,
  invoice_date: row.invoice_date,
  energy_kwh: row.energy_kwh,
  tariff_per_kwh: row.tariff_per_kwh,
  subtotal: row.subtotal,
  tax: row.tax,
  total_amount: row.total_amount,
  payment_status: row.payment_status,
  payment_method: row.payment_method,
  paid_at: row.paid_at,
})

async function nextInvoiceId() {
  const result = await query("SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)), 0) + 1 AS next_id FROM invoices", [])
  return `INV${String(result.rows[0].next_id).padStart(3, '0')}`
}

app.post('/api/v1/invoices', authMiddleware, async (req, res) => {
  const { sessionId, userId, kwhUsed, tariffPerKwh } = req.body
  if (!sessionId || !userId || kwhUsed === undefined || tariffPerKwh === undefined) {
    return problem(res, 400, 'missing-fields', 'Missing Fields', 'sessionId, userId, kwhUsed, tariffPerKwh are required')
  }

  const subtotal = Math.round(kwhUsed * tariffPerKwh)
  const tax = Math.round(subtotal * TAX_RATE)
  const total = subtotal + tax
  const invoiceId = await nextInvoiceId()

  await query(
    'INSERT INTO invoices (id, session_id, user_id, invoice_date, energy_kwh, tariff_per_kwh, subtotal, tax, total_amount, payment_status, payment_method, paid_at) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, NULL, NULL)',
    [invoiceId, sessionId, userId, kwhUsed, tariffPerKwh, subtotal, tax, total, 'pending'],
  )

  return envelope(res, { invoiceId, totalAmount: total, status: 'pending' }, 201)
})

app.get('/api/v1/invoices/:id', authMiddleware, async (req, res) => {
  const result = await query('SELECT * FROM invoices WHERE id = $1', [req.params.id])
  if (!result.rowCount) {
    return problem(res, 404, 'not-found', 'Not Found', `Invoice ${req.params.id} not found`)
  }
  return envelope(res, mapInvoiceRow(result.rows[0]))
})

app.post('/api/v1/payments', authMiddleware, async (req, res) => {
  const { invoiceId, paymentMethod } = req.body
  if (!invoiceId || !paymentMethod) {
    return problem(res, 400, 'missing-fields', 'Missing Fields', 'invoiceId and paymentMethod are required')
  }

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return problem(res, 400, 'invalid-method', 'Invalid Payment Method', `Allowed: ${PAYMENT_METHODS.join(', ')}`)
  }

  const invoiceResult = await query('SELECT * FROM invoices WHERE id = $1', [invoiceId])
  if (!invoiceResult.rowCount) {
    return problem(res, 404, 'not-found', 'Not Found', `Invoice ${invoiceId} not found`)
  }

  const invoice = mapInvoiceRow(invoiceResult.rows[0])
  if (invoice.payment_status === 'paid') {
    return problem(res, 409, 'already-paid', 'Already Paid', 'This invoice has already been paid')
  }

  const success = Math.random() > 0.1
  const paymentId = `PAY-${uuid().slice(0, 8).toUpperCase()}`
  const paidAt = new Date().toISOString()

  if (!success) {
    await query('UPDATE invoices SET payment_status = $1, payment_method = $2, updated_at = NOW() WHERE id = $3', ['failed', paymentMethod, invoiceId])
    return problem(res, 402, 'payment-failed', 'Payment Failed', 'Gateway declined the transaction. Please retry.')
  }

  await query(
    'UPDATE invoices SET payment_status = $1, payment_method = $2, paid_at = $3, updated_at = NOW() WHERE id = $4',
    ['paid', paymentMethod, paidAt, invoiceId],
  )

  await query(
    'INSERT INTO transactions (invoice_id, payment_method, gateway, gateway_ref, amount, status, paid_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [invoiceId, paymentMethod, 'mock-gateway', paymentId, invoice.total_amount, 'success', paidAt],
  )

  try {
    const token = req.headers.authorization!
    const bookingId = (req.body as any).bookingId
    if (bookingId) {
      await axios.patch(`${BS_URL}/api/v1/bookings/${bookingId}/status`, { status: 'completed' }, { headers: { Authorization: token } })
    }
  } catch {}

  return envelope(res, {
    paymentId,
    invoiceId,
    status: 'paid',
    amount: invoice.total_amount,
    method: paymentMethod,
    paidAt,
    receipt: `RCPT-${paymentId}`,
  })
})

app.get('/api/v1/payments/history/:userId', authMiddleware, async (req, res) => {
  const result = await query('SELECT * FROM invoices WHERE user_id = $1 ORDER BY invoice_date DESC', [req.params.userId])
  const history = result.rows.map((inv: any) => ({
    invoiceId: inv.id,
    sessionId: inv.session_id,
    amount: inv.total_amount,
    status: inv.payment_status,
    paymentMethod: inv.payment_method ?? null,
    date: inv.invoice_date,
  }))
  return envelope(res, history)
})


// ── Admin: GET /api/v1/admin/invoices (all invoices) ──────────────────────
app.get('/api/v1/admin/invoices', authMiddleware, async (req, res) => {
  const { status } = req.query as Record<string, string>
  try {
    const params: any[] = []
    let sql = 'SELECT * FROM invoices WHERE 1=1'
    if (status) { params.push(status); sql += ` AND payment_status = $1` }
    sql += ' ORDER BY invoice_date DESC LIMIT 100'
    const result = await query(sql, params)
    return envelope(res, result.rows)
  } catch (e: any) {
    console.error('[admin/invoices] DB error:', e.message)
    return envelope(res, [])
  }
})

// ── Admin: PATCH /api/v1/invoices/:id/status ───────────────────────────────
app.patch('/api/v1/invoices/:id/status', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'UPDATE invoices SET payment_status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [req.body.status, req.params.id]
    )
    if (result.rowCount === 0) return problem(res, 404, 'not-found', 'Not Found', `Invoice ${req.params.id} not found`)
    return envelope(res, result.rows[0])
  } catch {
    return problem(res, 503, 'db-error', 'Database Error', 'Database not connected')
  }
})

app.listen(PORT, () => console.log(`💳 billing-service running on :${PORT}`))
