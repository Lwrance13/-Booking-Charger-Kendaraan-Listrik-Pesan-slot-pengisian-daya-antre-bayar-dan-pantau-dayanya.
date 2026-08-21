import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { v4 as uuid } from 'uuid'
import { envelope, problem, authMiddleware } from './shared'
import invoicesRaw from './invoices.json'

const app    = express()
const PORT   = process.env.PORT   ?? 8004
const BS_URL = process.env.BS_URL ?? 'http://localhost:8002' // booking-service

app.use(cors())
app.use(express.json())

const invoices:     any[] = [...(invoicesRaw as any[])]
const transactions: any[] = []

const TAX_RATE = 0.11 // PPN 11%
const PAYMENT_METHODS = ['QRIS', 'Virtual Account', 'E-Wallet', 'Debit']

// ── POST /api/v1/invoices ────────────────────────────────────────────────
app.post('/api/v1/invoices', authMiddleware, (req, res) => {
  const { sessionId, userId, kwhUsed, tariffPerKwh } = req.body
  if (!sessionId || !userId || kwhUsed === undefined || tariffPerKwh === undefined)
    return problem(res, 400, 'missing-fields', 'Missing Fields', 'sessionId, userId, kwhUsed, tariffPerKwh are required')

  const subtotal   = Math.round(kwhUsed * tariffPerKwh)
  const tax        = Math.round(subtotal * TAX_RATE)
  const total      = subtotal + tax
  const invoiceId  = `INV${String(invoices.length + 1).padStart(3, '0')}`

  const newInvoice = {
    invoice_id: invoiceId,
    session_id: sessionId,
    user_id: userId,
    invoice_date: new Date().toISOString(),
    energy_kwh: kwhUsed,
    tariff_per_kwh: tariffPerKwh,
    subtotal, tax, total_amount: total,
    payment_status: 'pending',
  }
  invoices.push(newInvoice)

  return envelope(res, { invoiceId, totalAmount: total, status: 'pending' }, 201)
})

// ── GET /api/v1/invoices/:id ─────────────────────────────────────────────
app.get('/api/v1/invoices/:id', authMiddleware, (req, res) => {
  const inv = invoices.find(i => i.invoice_id === req.params.id)
  if (!inv) return problem(res, 404, 'not-found', 'Not Found', `Invoice ${req.params.id} not found`)
  return envelope(res, inv)
})

// ── POST /api/v1/payments ────────────────────────────────────────────────
app.post('/api/v1/payments', authMiddleware, async (req, res) => {
  const { invoiceId, paymentMethod } = req.body
  if (!invoiceId || !paymentMethod)
    return problem(res, 400, 'missing-fields', 'Missing Fields', 'invoiceId and paymentMethod are required')

  if (!PAYMENT_METHODS.includes(paymentMethod))
    return problem(res, 400, 'invalid-method', 'Invalid Payment Method', `Allowed: ${PAYMENT_METHODS.join(', ')}`)

  const invIdx = invoices.findIndex(i => i.invoice_id === invoiceId)
  if (invIdx === -1) return problem(res, 404, 'not-found', 'Not Found', `Invoice ${invoiceId} not found`)
  if (invoices[invIdx].payment_status === 'paid')
    return problem(res, 409, 'already-paid', 'Already Paid', 'This invoice has already been paid')

  // Simulate payment gateway (90% success rate)
  const success   = Math.random() > 0.1
  const paymentId = `PAY-${uuid().slice(0,8).toUpperCase()}`
  const paidAt    = new Date().toISOString()

  if (!success) {
    invoices[invIdx].payment_status = 'failed'
    return problem(res, 402, 'payment-failed', 'Payment Failed', 'Gateway declined the transaction. Please retry.')
  }

  invoices[invIdx].payment_status = 'paid'
  invoices[invIdx].paid_at = paidAt

  const tx = { id: uuid(), invoice_id: invoiceId, payment_method: paymentMethod,
    gateway: 'mock-gateway', gateway_ref: paymentId, amount: invoices[invIdx].total_amount, paid_at: paidAt }
  transactions.push(tx)

  // Notify booking-service: update booking status to COMPLETED (Saga step)
  try {
    const token = req.headers.authorization!
    const bookingId = (req.body as any).bookingId
    if (bookingId) {
      await axios.patch(`${BS_URL}/api/v1/bookings/${bookingId}/status`,
        { status: 'completed' }, { headers: { Authorization: token } })
    }
  } catch {}

  return envelope(res, {
    paymentId, invoiceId, status: 'paid', amount: invoices[invIdx].total_amount,
    method: paymentMethod, paidAt,
    receipt: `RCPT-${paymentId}`,
  })
})

// ── GET /api/v1/payments/history/:userId ─────────────────────────────────
app.get('/api/v1/payments/history/:userId', authMiddleware, (req, res) => {
  const userInvoices = invoices.filter(i => i.user_id === req.params.userId)
  const history = userInvoices.map(inv => ({
    invoiceId:     inv.invoice_id,
    sessionId:     inv.session_id,
    amount:        inv.total_amount,
    status:        inv.payment_status,
    paymentMethod: inv.payment_method ?? null,
    date:          inv.invoice_date,
  }))
  return envelope(res, history)
})

app.listen(PORT, () => console.log(`💳 billing-service running on :${PORT}`))
