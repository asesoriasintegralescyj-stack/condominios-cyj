'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '16px',
          padding: '32px',
          fontFamily: 'system-ui, sans-serif',
          backgroundColor: '#f8fafc',
          color: '#1e293b'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>
            Error del sistema
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '400px', textAlign: 'center' }}>
            {error.message || 'Ocurrió un error crítico. Por favor recarga la página.'}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '8px',
              padding: '8px 16px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Recargar página
          </button>
        </div>
      </body>
    </html>
  )
}
