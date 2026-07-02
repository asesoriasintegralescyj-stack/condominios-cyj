'use client'

import { useState, useEffect } from 'react'

const ETAPAS: Record<string, string> = {
  ALBATROS: 'Albatros',
  BANDURRIAS: 'Bandurrias',
  BECACINAS: 'Becacinas',
  CANQUEN: 'Canquén',
  FAISANES: 'Faisanes',
  FLAMENCOS: 'Flamencos',
  GARZAS: 'Garzas',
  GAVIOTAS: 'Gaviotas',
}

export default function RondaRegistroPage({ params }: { params: Promise<{ etapa: string; post: string }> }) {
  const [etapa, setEtapa] = useState('')
  const [post, setPost] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    params.then(({ etapa: e, post: p }) => {
      setEtapa(e.toUpperCase())
      setPost(p)
    })
  }, [params])

  const nombreEtapa = ETAPAS[etapa] || etapa

  const registrarRonda = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/rondas/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etapa, post,
          fecha: new Date().toISOString().split('T')[0],
          hora: new Date().toTimeString().split(' ')[0],
        }),
      })
      if (!res.ok) throw new Error('Error al registrar')
      setSuccess(true)
    } catch {
      setError('No se pudo registrar la ronda. Intente nuevamente.')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Ronda Registrada</h1>
          <p className="text-slate-600 text-sm mb-4">
            Etapa: <strong>{nombreEtapa}</strong><br/>
            Posto: <strong>#{post}</strong><br/>
            Fecha: <strong>{new Date().toLocaleDateString('es-CL')}</strong><br/>
            Hora: <strong>{new Date().toLocaleTimeString('es-CL')}</strong>
          </p>
          <button onClick={() => { setSuccess(false); window.location.reload() }}
            className="bg-[#0f2040] text-white px-4 py-2 rounded-lg text-sm font-medium">
            Registrar otra
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <div className="bg-[#0f2040] text-white rounded-lg p-4 mb-6 text-center">
          <h1 className="text-lg font-bold">CONDOMINIO LAGUNA NORTE</h1>
          <p className="text-blue-200 text-xs mt-1">Control de Rondas</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Etapa</p>
          <p className="text-2xl font-bold text-[#0f2040] mb-3">{nombreEtapa}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Posto de Control</p>
          <p className="text-xl font-bold text-blue-600">#{post}</p>
        </div>
        <button onClick={registrarRonda} disabled={loading}
          className="w-full bg-[#0f2040] text-white py-3 rounded-lg font-semibold text-sm hover:bg-[#1a3155] disabled:opacity-50 transition-colors">
          {loading ? 'Registrando...' : '✅ Registrar Ronda'}
        </button>
        {error && <p className="text-red-600 text-xs text-center mt-3">{error}</p>}
        <p className="text-center text-xs text-slate-400 mt-6">
          Al presionar registrar, se guarda la fecha y hora actual del escaneo.
        </p>
      </div>
    </div>
  )
}
