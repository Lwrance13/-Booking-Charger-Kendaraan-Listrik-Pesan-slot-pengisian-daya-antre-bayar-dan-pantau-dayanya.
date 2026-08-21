import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxy routes API calls to individual services (no Nginx needed in development)
const SERVICES = {
  SS: 'http://localhost:8001',
  BS: 'http://localhost:8002',
  SE: 'http://localhost:8003',
  BL: 'http://localhost:8004',
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/auth':                    { target: SERVICES.SS, changeOrigin: true },
      '/health':                  { target: SERVICES.SS, changeOrigin: true },
      '/api/v1/stations':         { target: SERVICES.SS, changeOrigin: true },
      '/api/v1/slots':            { target: SERVICES.SS, changeOrigin: true },
      '/api/v1/tariffs':          { target: SERVICES.SS, changeOrigin: true },
      '/api/v1/admin/slots':      { target: SERVICES.SS, changeOrigin: true },
      '/api/v1/admin/stations':   { target: SERVICES.SS, changeOrigin: true },
      '/api/v1/bookings':         { target: SERVICES.BS, changeOrigin: true },
      '/api/v1/admin/bookings':   { target: SERVICES.BS, changeOrigin: true },
      '/api/v1/sessions':         { target: SERVICES.SE, changeOrigin: true },
      '/api/v1/admin/sessions':   { target: SERVICES.SE, changeOrigin: true },
      '/ws':                      { target: SERVICES.SE, changeOrigin: true, ws: true },
      '/api/v1/invoices':         { target: SERVICES.BL, changeOrigin: true },
      '/api/v1/payments':         { target: SERVICES.BL, changeOrigin: true },
      '/api/v1/admin/invoices':   { target: SERVICES.BL, changeOrigin: true },
    },
  },
})
