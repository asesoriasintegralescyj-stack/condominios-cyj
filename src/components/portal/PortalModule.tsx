'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Home,
  FileText,
  Calendar,
  Wrench,
  CreditCard,
  LogOut,
  Bell,
  User,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageCircle,
  Download,
  ChevronRight,
  Wallet,
  CalendarDays,
  Loader2,
} from 'lucide-react'
import Image from 'next/image'

// ============================================
// INTERFACES
// ============================================
interface Residente {
  id: string
  nombre: string
  apellido?: string | null
  unidad: string | null
  email?: string | null
  telefono?: string | null
  etapa?: string | null
}

interface EstadoCuenta {
  id: string
  periodo: string
  saldoAnterior: number
  cargosMes: number
  pagosMes: number
  saldoActual: number
  interesesMora: number
  totalPagar: number
  fechaVencimiento?: string | null
  estado: string
}

interface Deuda {
  id: string
  periodo: string
  concepto: string
  montoOriginal: number
  montoInteres: number
  montoTotal: number
  diasMora: number
  estado: string
}

interface Reserva {
  id: string
  titulo: string
  espacio: string
  fecha: string
  horaInicio: string
  horaFin: string
  estado: string
  pagado: boolean
  monto: number
  notas?: string | null
}

interface Solicitud {
  id: string
  titulo: string
  descripcion?: string | null
  tipo: string
  prioridad: string
  estado: string
  ubicacion?: string | null
  fechaSolicitud: string
  respuesta?: string | null
  fechaRespuesta?: string | null
  conversacion?: string | null
}

// ============================================
// PORTAL MODULE COMPONENT
// ============================================
export function PortalModule() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [residente, setResidente] = useState<Residente | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Login form
  const [loginForm, setLoginForm] = useState({
    rut: '',
    email: '',
    unidad: '',
  })

  // Active tab
  const [activeTab, setActiveTab] = useState('dashboard')

  // Data states
  const [estadosCuenta, setEstadosCuenta] = useState<EstadoCuenta[]>([])
  const [deudas, setDeudas] = useState<Deuda[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(false)

  // Resumen
  const [resumen, setResumen] = useState({
    totalDeuda: 0,
    totalIntereses: 0,
    cantidadDeudas: 0,
    deudasVencidas: 0,
  })

  // Dialogs
  const [reservaDialogOpen, setReservaDialogOpen] = useState(false)
  const [solicitudDialogOpen, setSolicitudDialogOpen] = useState(false)
  const [detalleSolicitudOpen, setDetalleSolicitudOpen] = useState(false)
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<Solicitud | null>(null)

  // Form states
  const [nuevaReserva, setNuevaReserva] = useState({
    espacio: 'Quincho',
    fecha: '',
    horaInicio: '10:00',
    horaFin: '14:00',
    titulo: '',
    numPersonas: 1,
    notas: '',
  })

  const [nuevaSolicitud, setNuevaSolicitud] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'Mantenimiento',
    prioridad: 'Normal',
    ubicacion: '',
  })

  const [nuevoMensaje, setNuevoMensaje] = useState('')

  // Espacios comunes
  const espaciosComunes = [
    'Quincho',
    'Sala de Eventos',
    'Piscina',
    'Estacionamiento Visita',
    'Cancha Deportiva',
    'Gimnasio',
    'Sala de Reuniones',
    'Parrilla',
    'Juegos Infantiles',
  ]

  // ============================================
  // AUTH FUNCTIONS
  // ============================================
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/auth')
      if (res.ok) {
        const data = await res.json()
        if (data.authenticated) {
          setIsAuthenticated(true)
          setResidente(data.residente)
          setLoginForm(prev => ({ ...prev, ubicacion: data.residente.unidad || '' }))
        }
      }
    } catch {
      console.error('Error checking session')
    } finally {
      setAuthLoading(false)
    }
  }, [])

  useEffect(() => {
    void checkSession()
  }, [checkSession])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')

    try {
      const res = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })

      const data = await res.json()

      if (res.ok) {
        setIsAuthenticated(true)
        setResidente(data.residente)
      } else {
        setLoginError(data.error || 'Error al iniciar sesión')
      }
    } catch {
      setLoginError('Error de conexión')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/portal/auth', { method: 'DELETE' })
      setIsAuthenticated(false)
      setResidente(null)
    } catch {
      console.error('Error al cerrar sesión')
    }
  }

  // ============================================
  // DATA FETCHING
  // ============================================
  const fetchEstadoCuenta = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/portal/estado-cuenta')
      if (res.ok) {
        const data = await res.json()
        setEstadosCuenta(data.estadosCuenta || [])
        setDeudas(data.deudas || [])
        setResumen(data.resumen || resumen)
      }
    } catch {
      console.error('Error fetching estado cuenta')
    } finally {
      setLoading(false)
    }
  }

  const fetchReservas = async () => {
    try {
      const res = await fetch('/api/portal/reservas')
      if (res.ok) {
        const data = await res.json()
        setReservas(data.reservas || [])
      }
    } catch {
      console.error('Error fetching reservas')
    }
  }

  const fetchSolicitudes = async () => {
    try {
      const res = await fetch('/api/portal/solicitudes')
      if (res.ok) {
        const data = await res.json()
        setSolicitudes(data.solicitudes || [])
      }
    } catch {
      console.error('Error fetching solicitudes')
    }
  }

  // Cargar datos cuando se autentica
  useEffect(() => {
    if (isAuthenticated) {
      void fetchEstadoCuenta()
      void fetchReservas()
      void fetchSolicitudes()
    }
  }, [isAuthenticated])

  // ============================================
  // HANDLERS
  // ============================================
  const handleCrearReserva = async () => {
    try {
      const res = await fetch('/api/portal/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaReserva),
      })

      if (res.ok) {
        setReservaDialogOpen(false)
        setNuevaReserva({
          espacio: 'Quincho',
          fecha: '',
          horaInicio: '10:00',
          horaFin: '14:00',
          titulo: '',
          numPersonas: 1,
          notas: '',
        })
        void fetchReservas()
      }
    } catch {
      console.error('Error creando reserva')
    }
  }

  const handleCancelarReserva = async (id: string) => {
    if (!confirm('¿Desea cancelar esta reserva?')) return

    try {
      const res = await fetch('/api/portal/reservas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, accion: 'cancelar' }),
      })

      if (res.ok) {
        void fetchReservas()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al cancelar')
      }
    } catch {
      console.error('Error cancelando reserva')
    }
  }

  const handleCrearSolicitud = async () => {
    if (!nuevaSolicitud.titulo.trim()) return

    try {
      const res = await fetch('/api/portal/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevaSolicitud,
          ubicacion: nuevaSolicitud.ubicacion || residente?.unidad || '',
        }),
      })

      if (res.ok) {
        setSolicitudDialogOpen(false)
        setNuevaSolicitud({
          titulo: '',
          descripcion: '',
          tipo: 'Mantenimiento',
          prioridad: 'Normal',
          ubicacion: '',
        })
        void fetchSolicitudes()
      }
    } catch {
      console.error('Error creando solicitud')
    }
  }

  const handleEnviarMensaje = async () => {
    if (!nuevoMensaje.trim() || !solicitudSeleccionada) return

    try {
      const res = await fetch('/api/portal/solicitudes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: solicitudSeleccionada.id,
          mensaje: nuevoMensaje,
          accion: 'agregar_mensaje',
        }),
      })

      if (res.ok) {
        const updated = await res.json()
        setSolicitudes(prev => prev.map(s => s.id === updated.id ? updated : s))
        setSolicitudSeleccionada(updated)
        setNuevoMensaje('')
      }
    } catch {
      console.error('Error enviando mensaje')
    }
  }

  // ============================================
  // FORMAT HELPERS
  // ============================================
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // ============================================
  // RENDER HELPERS
  // ============================================
  const estadoColors: Record<string, string> = {
    'Pendiente': 'bg-yellow-100 text-yellow-700',
    'En Revisión': 'bg-blue-100 text-blue-700',
    'En Proceso': 'bg-purple-100 text-purple-700',
    'Resuelto': 'bg-green-100 text-green-700',
    'Cerrado': 'bg-slate-100 text-slate-700',
  }

  const reservaEstadoColors: Record<string, string> = {
    'Pendiente': 'bg-yellow-100 text-yellow-700',
    'Confirmada': 'bg-green-100 text-green-700',
    'Cancelada': 'bg-red-100 text-red-700',
    'Completada': 'bg-slate-100 text-slate-700',
  }

  const prioridadColors: Record<string, string> = {
    'Baja': 'bg-slate-100 text-slate-700',
    'Normal': 'bg-blue-100 text-blue-700',
    'Alta': 'bg-orange-100 text-orange-700',
    'Urgente': 'bg-red-100 text-red-700',
  }

  // ============================================
  // LOADING STATE
  // ============================================
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
          <p className="mt-4 text-slate-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // ============================================
  // LOGIN SCREEN
  // ============================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-200 shadow-lg">
                <Image src="/logo.png" alt="Logo" fill className="object-contain bg-white" />
              </div>
            </div>
            <CardTitle className="text-xl text-emerald-800">Portal de Residentes</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Asesorías Integrales CyJ</p>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rut">RUT</Label>
                <Input
                  id="rut"
                  placeholder="12.345.678-9"
                  value={loginForm.rut}
                  onChange={(e) => setLoginForm({ ...loginForm, rut: e.target.value })}
                />
                <p className="text-xs text-slate-400 text-center">o use su email</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidad">Unidad</Label>
                <Input
                  id="unidad"
                  placeholder="Ej: A-101"
                  value={loginForm.unidad}
                  onChange={(e) => setLoginForm({ ...loginForm, unidad: e.target.value })}
                  required
                />
              </div>

              {loginError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {loginError}
                </div>
              )}

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loginLoading}>
                {loginLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  'Ingresar'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t text-center text-xs text-slate-400">
              <p>¿Problemas para ingresar?</p>
              <p className="mt-1">Contacte a la administración</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================
  // MAIN PORTAL
  // ============================================
  const proximasReservas = reservas.filter(r => {
    const hoy = new Date().toISOString().split('T')[0]
    return r.fecha >= hoy && r.estado !== 'Cancelada'
  }).slice(0, 3)

  const solicitudesPendientes = solicitudes.filter(s => 
    s.estado !== 'Resuelto' && s.estado !== 'Cerrado'
  ).slice(0, 3)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white">
                <Image src="/logo.png" alt="Logo" fill className="object-contain p-1" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Portal de Residentes</h1>
                <p className="text-xs text-emerald-100">Asesorías Integrales CyJ</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="font-medium">{residente?.nombre} {residente?.apellido}</p>
                <p className="text-xs text-emerald-100">Unidad {residente?.unidad}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-white hover:bg-emerald-700"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Mobile Tab Navigation */}
          <div className="sm:hidden">
            <div className="flex justify-center gap-2 flex-wrap">
              {[
                { id: 'dashboard', icon: Home, label: 'Inicio' },
                { id: 'cuenta', icon: FileText, label: 'Cuenta' },
                { id: 'reservas', icon: Calendar, label: 'Reservas' },
                { id: 'solicitudes', icon: Wrench, label: 'Solicitudes' },
                { id: 'pagos', icon: CreditCard, label: 'Pagos' },
              ].map(tab => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className={activeTab === tab.id ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  <tab.icon className="w-4 h-4 mr-1" />
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Desktop Tab List */}
          <TabsList className="hidden sm:flex w-full justify-start bg-white shadow rounded-lg p-1">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Home className="w-4 h-4" /> Inicio
            </TabsTrigger>
            <TabsTrigger value="cuenta" className="flex items-center gap-2">
              <FileText className="w-4 h-4" /> Estado de Cuenta
            </TabsTrigger>
            <TabsTrigger value="reservas" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Reservas
            </TabsTrigger>
            <TabsTrigger value="solicitudes" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" /> Solicitudes
            </TabsTrigger>
            <TabsTrigger value="pagos" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Pagos
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Welcome Card */}
            <Card className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">¡Hola, {residente?.nombre}!</h2>
                    <p className="text-emerald-100 mt-1">Bienvenido a su portal de residentes</p>
                    <p className="text-sm text-emerald-100 mt-2">Unidad: {residente?.unidad} {residente?.etapa && `• Etapa ${residente.etapa}`}</p>
                  </div>
                  <div className="hidden sm:block">
                    <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                      <User className="w-10 h-10 text-white" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Saldo Actual</p>
                      <p className="font-bold text-lg text-red-600">{formatCurrency(resumen.totalDeuda)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Deudas</p>
                      <p className="font-bold text-lg">{resumen.cantidadDeudas}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <CalendarDays className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Próx. Reservas</p>
                      <p className="font-bold text-lg">{proximasReservas.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Wrench className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Solicitudes</p>
                      <p className="font-bold text-lg">{solicitudesPendientes.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={() => setActiveTab('reservas')}
                  >
                    <Calendar className="w-6 h-6 text-emerald-600" />
                    <span className="text-sm">Reservar</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={() => setActiveTab('solicitudes')}
                  >
                    <Wrench className="w-6 h-6 text-blue-600" />
                    <span className="text-sm">Solicitar</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={() => setActiveTab('cuenta')}
                  >
                    <FileText className="w-6 h-6 text-purple-600" />
                    <span className="text-sm">Ver Cuenta</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={() => setActiveTab('pagos')}
                  >
                    <CreditCard className="w-6 h-6 text-orange-600" />
                    <span className="text-sm">Pagar</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Próximas Reservas */}
            {proximasReservas.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Próximas Reservas</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('reservas')}>
                    Ver todas <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {proximasReservas.map(r => (
                      <div key={r.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium">{r.espacio}</p>
                            <p className="text-sm text-slate-500">{formatDate(r.fecha)} • {r.horaInicio} - {r.horaFin}</p>
                          </div>
                        </div>
                        <Badge className={reservaEstadoColors[r.estado] || 'bg-slate-100'}>{r.estado}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Solicitudes Recientes */}
            {solicitudesPendientes.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Solicitudes Activas</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('solicitudes')}>
                    Ver todas <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {solicitudesPendientes.map(s => (
                      <div key={s.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Wrench className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{s.titulo}</p>
                            <p className="text-sm text-slate-500">{s.tipo} • {formatDate(s.fechaSolicitud)}</p>
                          </div>
                        </div>
                        <Badge className={estadoColors[s.estado] || 'bg-slate-100'}>{s.estado}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Estado de Cuenta Tab */}
          <TabsContent value="cuenta" className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : (
              <>
                {/* Resumen */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="pt-4">
                      <p className="text-sm text-red-600">Total a Pagar</p>
                      <p className="text-2xl font-bold text-red-700">{formatCurrency(resumen.totalDeuda)}</p>
                      {resumen.deudasVencidas > 0 && (
                        <p className="text-xs text-red-500 mt-1">{resumen.deudasVencidas} deudas vencidas</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="pt-4">
                      <p className="text-sm text-orange-600">Intereses por Mora</p>
                      <p className="text-2xl font-bold text-orange-700">{formatCurrency(resumen.totalIntereses)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="pt-4">
                      <p className="text-sm text-slate-600">Cantidad de Deudas</p>
                      <p className="text-2xl font-bold">{resumen.cantidadDeudas}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Deudas Pendientes */}
                {deudas.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Deudas Pendientes</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="max-h-96">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="text-left p-3">Período</th>
                              <th className="text-left p-3">Concepto</th>
                              <th className="text-right p-3">Monto</th>
                              <th className="text-right p-3">Interés</th>
                              <th className="text-right p-3">Total</th>
                              <th className="text-center p-3">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deudas.map(d => (
                              <tr key={d.id} className="border-t hover:bg-slate-50">
                                <td className="p-3 font-medium">{d.periodo}</td>
                                <td className="p-3">{d.concepto}</td>
                                <td className="p-3 text-right">{formatCurrency(d.montoOriginal)}</td>
                                <td className="p-3 text-right text-orange-600">{formatCurrency(d.montoInteres)}</td>
                                <td className="p-3 text-right font-bold">{formatCurrency(d.montoTotal)}</td>
                                <td className="p-3 text-center">
                                  <Badge className={d.diasMora > 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                                    {d.diasMora > 0 ? `${d.diasMora} días mora` : d.estado}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Historial Estados de Cuenta */}
                {estadosCuenta.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Historial de Estados de Cuenta</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="max-h-96">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="text-left p-3">Período</th>
                              <th className="text-right p-3">Saldo Ant.</th>
                              <th className="text-right p-3">Cargos</th>
                              <th className="text-right p-3">Pagos</th>
                              <th className="text-right p-3">Total</th>
                              <th className="text-center p-3">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {estadosCuenta.map(e => (
                              <tr key={e.id} className="border-t hover:bg-slate-50">
                                <td className="p-3 font-medium">{e.periodo}</td>
                                <td className="p-3 text-right">{formatCurrency(e.saldoAnterior)}</td>
                                <td className="p-3 text-right text-red-600">{formatCurrency(e.cargosMes)}</td>
                                <td className="p-3 text-right text-green-600">-{formatCurrency(e.pagosMes)}</td>
                                <td className="p-3 text-right font-bold">{formatCurrency(e.totalPagar)}</td>
                                <td className="p-3 text-center">
                                  <Badge variant="outline">{e.estado}</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {deudas.length === 0 && estadosCuenta.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center text-slate-500">
                      <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                      <p className="font-medium">¡Todo al día!</p>
                      <p className="text-sm">No tiene deudas pendientes</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Reservas Tab */}
          <TabsContent value="reservas" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Mis Reservas</h3>
              <Button onClick={() => setReservaDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" /> Nueva Reserva
              </Button>
            </div>

            {reservas.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="font-medium">Sin reservas</p>
                  <p className="text-sm">Cree su primera reserva</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {reservas.map(r => {
                  const esProxima = new Date(r.fecha) >= new Date()
                  return (
                    <Card key={r.id} className={r.estado === 'Cancelada' ? 'opacity-60' : ''}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">{r.espacio}</p>
                            <p className="text-sm text-slate-500">{r.titulo}</p>
                          </div>
                          <Badge className={reservaEstadoColors[r.estado] || 'bg-slate-100'}>
                            {r.estado}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-slate-400" />
                            {formatDate(r.fecha)}
                          </p>
                          <p className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            {r.horaInicio} - {r.horaFin}
                          </p>
                          {r.monto > 0 && (
                            <p className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-slate-400" />
                              {formatCurrency(r.monto)} {r.pagado ? '(Pagado)' : '(Pendiente)'}
                            </p>
                          )}
                        </div>
                        {esProxima && r.estado !== 'Cancelada' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 w-full text-red-600 hover:text-red-700"
                            onClick={() => handleCancelarReserva(r.id)}
                          >
                            Cancelar Reserva
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Dialog Nueva Reserva */}
            <Dialog open={reservaDialogOpen} onOpenChange={setReservaDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva Reserva</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Espacio</Label>
                    <Select value={nuevaReserva.espacio} onValueChange={(v) => setNuevaReserva({ ...nuevaReserva, espacio: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {espaciosComunes.map(e => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha</Label>
                      <Input type="date" value={nuevaReserva.fecha} onChange={(e) => setNuevaReserva({ ...nuevaReserva, fecha: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>N° Personas</Label>
                      <Input type="number" min="1" value={nuevaReserva.numPersonas} onChange={(e) => setNuevaReserva({ ...nuevaReserva, numPersonas: parseInt(e.target.value) || 1 })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Hora Inicio</Label>
                      <Input type="time" value={nuevaReserva.horaInicio} onChange={(e) => setNuevaReserva({ ...nuevaReserva, horaInicio: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora Fin</Label>
                      <Input type="time" value={nuevaReserva.horaFin} onChange={(e) => setNuevaReserva({ ...nuevaReserva, horaFin: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Título / Motivo</Label>
                    <Input value={nuevaReserva.titulo} onChange={(e) => setNuevaReserva({ ...nuevaReserva, titulo: e.target.value })} placeholder="Ej: Cumpleaños de Juan" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notas</Label>
                    <Textarea value={nuevaReserva.notas} onChange={(e) => setNuevaReserva({ ...nuevaReserva, notas: e.target.value })} placeholder="Información adicional..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setReservaDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCrearReserva} disabled={!nuevaReserva.fecha} className="bg-emerald-600 hover:bg-emerald-700">Crear Reserva</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Solicitudes Tab */}
          <TabsContent value="solicitudes" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Mis Solicitudes</h3>
              <Button onClick={() => setSolicitudDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" /> Nueva Solicitud
              </Button>
            </div>

            {solicitudes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <Wrench className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="font-medium">Sin solicitudes</p>
                  <p className="text-sm">Cree su primera solicitud de mantenimiento</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {solicitudes.map(s => (
                  <Card 
                    key={s.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSolicitudSeleccionada(s)
                      setDetalleSolicitudOpen(true)
                    }}
                  >
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">{s.titulo}</p>
                            <Badge className={prioridadColors[s.prioridad] || 'bg-slate-100'}>{s.prioridad}</Badge>
                          </div>
                          <p className="text-sm text-slate-500">{s.descripcion?.substring(0, 100)}{s.descripcion && s.descripcion.length > 100 ? '...' : ''}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                            <span>{s.tipo}</span>
                            <span>{formatDate(s.fechaSolicitud)}</span>
                            {s.ubicacion && <span>Ubicación: {s.ubicacion}</span>}
                          </div>
                        </div>
                        <Badge className={estadoColors[s.estado] || 'bg-slate-100'}>{s.estado}</Badge>
                      </div>
                      {s.respuesta && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <p className="text-xs text-green-600 font-medium mb-1">Respuesta de la administración:</p>
                          <p className="text-sm text-green-800">{s.respuesta}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Dialog Nueva Solicitud */}
            <Dialog open={solicitudDialogOpen} onOpenChange={setSolicitudDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva Solicitud</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input value={nuevaSolicitud.titulo} onChange={(e) => setNuevaSolicitud({ ...nuevaSolicitud, titulo: e.target.value })} placeholder="Describa brevemente el problema" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={nuevaSolicitud.tipo} onValueChange={(v) => setNuevaSolicitud({ ...nuevaSolicitud, tipo: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                          <SelectItem value="Reparación">Reparación</SelectItem>
                          <SelectItem value="Sugerencia">Sugerencia</SelectItem>
                          <SelectItem value="Queja">Queja</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Prioridad</Label>
                      <Select value={nuevaSolicitud.prioridad} onValueChange={(v) => setNuevaSolicitud({ ...nuevaSolicitud, prioridad: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Baja">Baja</SelectItem>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="Alta">Alta</SelectItem>
                          <SelectItem value="Urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Ubicación</Label>
                    <Input value={nuevaSolicitud.ubicacion || residente?.unidad || ''} onChange={(e) => setNuevaSolicitud({ ...nuevaSolicitud, ubicacion: e.target.value })} placeholder="Ej: Estacionamiento, Hall, etc." />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Textarea value={nuevaSolicitud.descripcion} onChange={(e) => setNuevaSolicitud({ ...nuevaSolicitud, descripcion: e.target.value })} placeholder="Describa el problema con detalle..." rows={4} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSolicitudDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCrearSolicitud} disabled={!nuevaSolicitud.titulo.trim()} className="bg-emerald-600 hover:bg-emerald-700">Enviar Solicitud</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog Detalle Solicitud con Chat */}
            <Dialog open={detalleSolicitudOpen} onOpenChange={setDetalleSolicitudOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{solicitudSeleccionada?.titulo}</DialogTitle>
                </DialogHeader>
                {solicitudSeleccionada && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Badge className={estadoColors[solicitudSeleccionada.estado] || 'bg-slate-100'}>{solicitudSeleccionada.estado}</Badge>
                      <Badge className={prioridadColors[solicitudSeleccionada.prioridad] || 'bg-slate-100'}>{solicitudSeleccionada.prioridad}</Badge>
                    </div>
                    <div className="text-sm text-slate-600">
                      <p><strong>Tipo:</strong> {solicitudSeleccionada.tipo}</p>
                      <p><strong>Ubicación:</strong> {solicitudSeleccionada.ubicacion || residente?.unidad}</p>
                      <p><strong>Fecha:</strong> {formatDate(solicitudSeleccionada.fechaSolicitud)}</p>
                    </div>
                    {solicitudSeleccionada.descripcion && (
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-sm">{solicitudSeleccionada.descripcion}</p>
                      </div>
                    )}

                    {/* Conversación */}
                    {solicitudSeleccionada.conversacion && (
                      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                        {(() => {
                          try {
                            const msgs = JSON.parse(solicitudSeleccionada.conversacion)
                            return msgs.map((m: { id: string; fecha: string; autor: string; esAdmin: boolean; mensaje: string }) => (
                              <div key={m.id} className={`mb-2 ${m.esAdmin ? 'text-right' : ''}`}>
                                <div className={`inline-block p-2 rounded-lg max-w-[80%] ${m.esAdmin ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100'}`}>
                                  <p className="text-xs font-medium">{m.autor}</p>
                                  <p className="text-sm">{m.mensaje}</p>
                                  <p className="text-xs text-slate-400 mt-1">{formatDate(m.fecha)}</p>
                                </div>
                              </div>
                            ))
                          } catch {
                            return null
                          }
                        })()}
                      </div>
                    )}

                    {/* Input para mensaje */}
                    <div className="flex gap-2">
                      <Input
                        value={nuevoMensaje}
                        onChange={(e) => setNuevoMensaje(e.target.value)}
                        placeholder="Escribir mensaje..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            void handleEnviarMensaje()
                          }
                        }}
                      />
                      <Button onClick={handleEnviarMensaje} disabled={!nuevoMensaje.trim()} className="bg-emerald-600 hover:bg-emerald-700">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Pagos Tab */}
          <TabsContent value="pagos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pendientes de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                {resumen.totalDeuda > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800 font-medium">Total a Pagar</p>
                      <p className="text-3xl font-bold text-red-600">{formatCurrency(resumen.totalDeuda)}</p>
                    </div>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="lg">
                      <CreditCard className="w-4 h-4 mr-2" /> Pagar en Línea
                    </Button>
                    <p className="text-xs text-center text-slate-400">
                      Integración con pasarela de pago próximamente
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                    <p className="font-medium text-green-700">¡Sin deudas pendientes!</p>
                    <p className="text-sm text-slate-500">Su cuenta está al día</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Historial de Pagos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Historial de Pagos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 text-center py-8">
                  Los pagos realizados aparecerán aquí
                </p>
              </CardContent>
            </Card>

            {/* Datos de Transferencia */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Datos para Transferencia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Banco:</strong> Banco de Chile</p>
                <p><strong>Tipo de cuenta:</strong> Cuenta Corriente</p>
                <p><strong>N° Cuenta:</strong> 1234567890</p>
                <p><strong>RUT:</strong> 76.123.456-7</p>
                <p><strong>Nombre:</strong> Asesorías Integrales CyJ SpA</p>
                <p><strong>Email:</strong> contacto@cyjcondominios.cl</p>
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-yellow-800 text-xs">
                  <strong>Importante:</strong> Al realizar una transferencia, envíe el comprobante por email indicando su unidad.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="flex justify-around py-2">
          {[
            { id: 'dashboard', icon: Home, label: 'Inicio' },
            { id: 'cuenta', icon: FileText, label: 'Cuenta' },
            { id: 'reservas', icon: Calendar, label: 'Reservas' },
            { id: 'solicitudes', icon: Wrench, label: 'Solicitudes' },
            { id: 'pagos', icon: CreditCard, label: 'Pagos' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-2 px-3 ${activeTab === tab.id ? 'text-emerald-600' : 'text-slate-400'}`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="sm:hidden h-16" />
    </div>
  )
}
