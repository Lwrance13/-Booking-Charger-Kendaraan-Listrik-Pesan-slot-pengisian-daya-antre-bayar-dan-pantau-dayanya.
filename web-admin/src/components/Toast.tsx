
import { useEffect } from 'react'

interface ToastProps { message: string; type?: 'success' | 'error'; onClose: () => void }

export default function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      padding: '12px 20px', borderRadius: 12, fontWeight: 600, fontSize: 14,
      background: type === 'success' ? 'var(--c-chip-green-text)' : 'var(--c-secondary)',
      color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      animation: 'slideUp 0.2s ease',
    }}>
      {type === 'success' ? '✅' : '❌'} {message}
    </div>
  )
}
