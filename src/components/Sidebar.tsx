'use client'

import {
  LayoutDashboard,
  Users,
  Wrench,
  DraftingCompass,
  Search,
  User,
  Package,
  Building2,
  PiggyBank,
  FileText,
  LogOut,
  ChevronUp,
  Shield,
  UserCog,
  Calendar,
  Bell,
  Database,
  FileCheck,
  Eye,
  CheckCircle,
  QrCode,
  ShoppingCart,
  Menu,
  X,
  BookOpen,
  ClipboardCheck,
} from 'lucide-react'
import { useAppStore, type Module } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useSession } from '@/hooks/use-session'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

// Definir permisos necesarios para cada módulo
const modulePermissions: Partial<Record<Module, string>> = {
  ot: 'ots.ver',
  proyectos: 'proyectos.ver',
  inspecciones: 'inspecciones.ver',
  personal: 'personal.ver',
  activos: 'activos.ver',
  proveedores: 'proveedores.ver',
  centrocostos: 'centros-costo.ver',
  materiales: 'catalogos.ver',
  tareas: 'catalogos.ver',
  herramientas: 'catalogos.ver',
  reportes: 'reportes.ver',
  inventario: 'inventario.ver',
  catalogos: 'catalogos.ver',
  notificaciones: 'usuarios.ver',
  auditoria: 'logs.ver',
  backups: 'configuracion.editar',
  cumplimiento: 'configuracion.ver',
  rondas: 'rondas.ver',
  qrrondas: 'rondas.ver',
  solicitudescompra: 'solicitudescompra.ver',
  // 'usuarios' y 'permisos' se manejan con lógica especial (solo admin)
}

const menuItems: { section: string; items: { id: Module; label: string; icon: React.ReactNode }[] }[] = [
  {
    section: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'pmi', label: 'PMI', icon: <ClipboardCheck className="w-4 h-4" /> },
      { id: 'notificaciones', label: 'Notificaciones', icon: <Bell className="w-4 h-4" /> },
    ]
  },
  {
    section: 'Gestión',
    items: [
      { id: 'cumplimiento', label: 'Cumplimiento', icon: <FileCheck className="w-4 h-4" /> },
      { id: 'ot', label: 'Órdenes de Trabajo', icon: <Wrench className="w-4 h-4" /> },
      { id: 'aprobacionesot', label: 'Aprobaciones OT', icon: <CheckCircle className="w-4 h-4" /> },
      { id: 'proyectos', label: 'Proyectos', icon: <DraftingCompass className="w-4 h-4" /> },
      { id: 'inspecciones', label: 'Inspecciones', icon: <Search className="w-4 h-4" /> },
      { id: 'rondas', label: 'Rondas', icon: <QrCode className="w-4 h-4" /> },
      { id: 'qrrondas', label: 'Rondas QR Guardias', icon: <QrCode className="w-4 h-4" /> },
      { id: 'personal', label: 'Personal', icon: <User className="w-4 h-4" /> },
      { id: 'asistencia', label: 'Control Asistencia', icon: <Calendar className="w-4 h-4" /> },
      { id: 'activos', label: 'Activos', icon: <Package className="w-4 h-4" /> },
      { id: 'inventario', label: 'Inventario', icon: <Package className="w-4 h-4" /> },
      { id: 'solicitudescompra', label: 'Solicitud de Compras', icon: <ShoppingCart className="w-4 h-4" /> },
    ]
  },
  {
    section: 'Finanzas',
    items: [
      { id: 'proveedores', label: 'Proveedores', icon: <Building2 className="w-4 h-4" /> },
      { id: 'centrocostos', label: 'Centro de Costos', icon: <PiggyBank className="w-4 h-4" /> },
    ]
  },
  {
    section: 'Catálogos',
    items: [
      { id: 'materiales', label: 'Materiales', icon: <Package className="w-4 h-4" /> },
      { id: 'tareas', label: 'Tareas', icon: <Wrench className="w-4 h-4" /> },
      { id: 'herramientas', label: 'Herramientas', icon: <Wrench className="w-4 h-4" /> },
    ]
  },
  {
    section: 'Sistema',
    items: [
      { id: 'auditoria', label: 'Auditoría', icon: <Shield className="w-4 h-4" /> },
      { id: 'backups', label: 'Respaldos', icon: <Database className="w-4 h-4" /> },
      { id: 'reportes', label: 'Reportes', icon: <FileText className="w-4 h-4" /> },
      { id: 'usuarios', label: 'Usuarios', icon: <Users className="w-4 h-4" /> },
      { id: 'permisos', label: 'Permisos del Sistema', icon: <Shield className="w-4 h-4" /> },
      { id: 'manuales', label: 'Manuales y Capacitaciones', icon: <BookOpen className="w-4 h-4" /> },
    ]
  },
]

export function Sidebar() {
  const { currentModule, setCurrentModule, currentCondominio } = useAppStore()
  const { user, loading, authenticated, logout, hasPermission, isAdmin } = useSession()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Filtrar menú según permisos
  // El rol 'guardia' SOLO ve: Rondas (su página dedicada) + Manuales
  const isGuardia = user?.rol === 'guardia'
  const isPersonal = user?.rol === 'personal'
  const filteredMenuItems = menuItems.map(section => ({
    ...section,
    items: section.items.filter(item => {
      // Guardia: solo Rondas + Rondas QR + Manuales
      if (isGuardia) {
        return item.id === 'rondas' || item.id === 'qrrondas' || item.id === 'manuales'
      }

      // 'manuales' es visible para TODOS los roles (sin excepción)
      if (item.id === 'manuales') return true

      // Módulos exclusivos del admin: 'usuarios' y 'permisos'
      if ((item.id === 'usuarios' || item.id === 'permisos') && !isAdmin()) {
        return false
      }

      // Personal: NO ve 'aprobacionesot' (solo ve sus OT, no aprueba nada)
      if (isPersonal && item.id === 'aprobacionesot') {
        return false
      }

      // Dashboard siempre visible para los demás roles
      if (item.id === 'dashboard') return true

      const permission = modulePermissions[item.id]
      if (!permission) return true
      return hasPermission(permission)
    })
  })).filter(section => section.items.length > 0)

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const getInitials = () => {
    if (!user) return '?'
    const initials = user.nombre.charAt(0) + (user.apellido?.charAt(0) || '')
    return initials.toUpperCase()
  }

  const getRoleLabel = () => {
    switch (user?.rol) {
      case 'admin':
        return 'Administrador'
      case 'supervisor':
        return 'Supervisor'
      case 'personal':
        return 'Personal'
      case 'auditor':
        return 'Auditor'
      case 'guardia':
        return 'Guardia'
      default:
        return 'Usuario'
    }
  }

  const getRoleIcon = () => {
    switch (user?.rol) {
      case 'admin':
        return <Shield className="w-3 h-3" />
      case 'supervisor':
        return <UserCog className="w-3 h-3" />
      case 'personal':
        return <Wrench className="w-3 h-3" />
      case 'auditor':
        return <Eye className="w-3 h-3" />
      case 'guardia':
        return <QrCode className="w-3 h-3" />
      default:
        return <User className="w-3 h-3" />
    }
  }

  if (loading && !authenticated) {
    return null
  }

  const handleNavigate = (moduleId: Module) => {
    setCurrentModule(moduleId)
    setMobileOpen(false)
  }

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0f2044] flex items-center px-4 z-50 shrink-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-white p-1 -ml-1"
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="text-white text-sm font-bold ml-3 truncate">LAGUNA NORTE</span>
      </div>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed md:relative z-50 md:z-auto',
          'w-56 bg-[#0f2044] flex flex-col h-full shrink-0',
          'transform transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
      {/* Mobile close button (visible only when open on mobile) */}
      <button
        onClick={() => setMobileOpen(false)}
        className="md:hidden absolute top-3 right-3 text-white/70 hover:text-white z-10"
        aria-label="Cerrar menú"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Logo */}
      <div className="p-4 border-b border-white/10 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src="/logo.jpg"
            alt="Asesorías Integrales CyJ"
            className="w-10 h-10 rounded-lg object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="text-white text-xs font-bold leading-tight truncate">Asesorías Integrales CyJ</div>
            <div className="text-blue-300 text-[9px] font-medium truncate">Administración de Condominios</div>
            {currentCondominio?.nombre && (
              <div className="text-amber-400 text-[10px] font-bold mt-0.5 truncate">
                {currentCondominio.nombre}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 min-w-0">
        {filteredMenuItems.map((section) => (
          <div key={section.section} className="mb-2">
            <div className="px-3 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">
              {section.section}
            </div>
            {section.items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all min-w-0',
                  currentModule === item.id
                    ? 'bg-amber-500/20 text-amber-500'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                )}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* User Menu */}
      {user && (
        <div className="p-2 border-t border-white/10 min-w-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 px-2 py-2 h-auto text-white/70 hover:text-white hover:bg-white/10 min-w-0"
              >
                <Avatar className="h-8 w-8 bg-amber-500/20 text-amber-500 shrink-0">
                  <AvatarFallback className="bg-amber-500/20 text-amber-500 text-xs font-bold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-xs font-medium truncate">
                    {user.nombre} {user.apellido}
                  </div>
                  <div className="text-[10px] text-white/50 flex items-center gap-1 truncate">
                    {getRoleIcon()}
                    <span className="truncate">{getRoleLabel()}</span>
                  </div>
                </div>
                <ChevronUp className="h-4 w-4 text-white/50 ml-auto shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-[#1a3155] border-white/10 text-white"
            >
              <div className="px-2 py-1.5 text-xs text-white/50 truncate">
                {user.email}
              </div>
              <DropdownMenuSeparator className="bg-white/10" />

              {isAdmin() && (
                <>
                  <DropdownMenuItem
                    className="text-white/70 focus:text-white focus:bg-white/10 cursor-pointer"
                    onClick={() => handleNavigate('usuarios')}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Gestionar Usuarios
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                </>
              )}

              <DropdownMenuItem
                className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Footer */}
      <div className="p-3 border-t border-white/10 shrink-0">
        <div className="text-white/25 text-[9px] text-center leading-relaxed">
          Asesorías Integrales CyJ<br/>
          Administración de Condominios<br/>
          +56 964 650 643 | +56 974 408 794
        </div>
      </div>
    </aside>
    </>
  )
}
