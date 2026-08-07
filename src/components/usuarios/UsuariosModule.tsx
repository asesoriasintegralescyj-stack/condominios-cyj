/**
 * Módulo de Gestión de Usuarios
 * Condominio Laguna Norte - Sistema de Gestión v2
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSession } from '@/hooks/use-session';
import {
  Users,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Key,
  Shield,
  UserCog,
  User as UserIcon,
  Search,
  Loader2,
  Lock,
  Eye,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { TableroIndicadores } from '@/components/ui/tablero-indicadores';
import { apiFetch } from '@/lib/api-client';

// Definición de categorías de permisos
const CATEGORIAS_PERMISOS = {
  usuarios: {
    label: 'Usuarios',
    permisos: [
      { id: 'usuarios.ver', label: 'Ver' },
      { id: 'usuarios.crear', label: 'Crear' },
      { id: 'usuarios.editar', label: 'Editar' },
      { id: 'usuarios.eliminar', label: 'Eliminar' },
    ],
  },
  residentes: {
    label: 'Residentes',
    permisos: [
      { id: 'residentes.ver', label: 'Ver' },
      { id: 'residentes.crear', label: 'Crear' },
      { id: 'residentes.editar', label: 'Editar' },
      { id: 'residentes.eliminar', label: 'Eliminar' },
    ],
  },
  propiedades: {
    label: 'Propiedades',
    permisos: [
      { id: 'propiedades.ver', label: 'Ver' },
      { id: 'propiedades.crear', label: 'Crear' },
      { id: 'propiedades.editar', label: 'Editar' },
      { id: 'propiedades.eliminar', label: 'Eliminar' },
    ],
  },
  personal: {
    label: 'Personal',
    permisos: [
      { id: 'personal.ver', label: 'Ver' },
      { id: 'personal.crear', label: 'Crear' },
      { id: 'personal.editar', label: 'Editar' },
      { id: 'personal.eliminar', label: 'Eliminar' },
    ],
  },
  proveedores: {
    label: 'Proveedores',
    permisos: [
      { id: 'proveedores.ver', label: 'Ver' },
      { id: 'proveedores.crear', label: 'Crear' },
      { id: 'proveedores.editar', label: 'Editar' },
      { id: 'proveedores.eliminar', label: 'Eliminar' },
    ],
  },
  ordenes_trabajo: {
    label: 'Órdenes de Trabajo',
    permisos: [
      { id: 'ots.ver', label: 'Ver' },
      { id: 'ots.crear', label: 'Crear' },
      { id: 'ots.editar', label: 'Editar' },
      { id: 'ots.eliminar', label: 'Eliminar' },
      { id: 'ots.aprobar', label: 'Aprobar' },
    ],
  },
  proyectos: {
    label: 'Proyectos',
    permisos: [
      { id: 'proyectos.ver', label: 'Ver' },
      { id: 'proyectos.crear', label: 'Crear' },
      { id: 'proyectos.editar', label: 'Editar' },
      { id: 'proyectos.eliminar', label: 'Eliminar' },
    ],
  },
  gastos: {
    label: 'Gastos',
    permisos: [
      { id: 'gastos.ver', label: 'Ver' },
      { id: 'gastos.crear', label: 'Crear' },
      { id: 'gastos.editar', label: 'Editar' },
      { id: 'gastos.eliminar', label: 'Eliminar' },
      { id: 'gastos.aprobar', label: 'Aprobar' },
    ],
  },
  inspecciones: {
    label: 'Inspecciones',
    permisos: [
      { id: 'inspecciones.ver', label: 'Ver' },
      { id: 'inspecciones.crear', label: 'Crear' },
      { id: 'inspecciones.editar', label: 'Editar' },
      { id: 'inspecciones.eliminar', label: 'Eliminar' },
    ],
  },
  activos: {
    label: 'Activos',
    permisos: [
      { id: 'activos.ver', label: 'Ver' },
      { id: 'activos.crear', label: 'Crear' },
      { id: 'activos.editar', label: 'Editar' },
      { id: 'activos.eliminar', label: 'Eliminar' },
    ],
  },
  catalogos: {
    label: 'Catálogos',
    permisos: [
      { id: 'catalogos.ver', label: 'Ver' },
      { id: 'catalogos.crear', label: 'Crear' },
      { id: 'catalogos.editar', label: 'Editar' },
      { id: 'catalogos.eliminar', label: 'Eliminar' },
    ],
  },
  centros_costo: {
    label: 'Centros de Costo',
    permisos: [
      { id: 'centros-costo.ver', label: 'Ver' },
      { id: 'centros-costo.crear', label: 'Crear' },
      { id: 'centros-costo.editar', label: 'Editar' },
      { id: 'centros-costo.eliminar', label: 'Eliminar' },
    ],
  },
  reportes: {
    label: 'Reportes',
    permisos: [
      { id: 'reportes.ver', label: 'Ver' },
      { id: 'reportes.exportar', label: 'Exportar' },
    ],
  },
  configuracion: {
    label: 'Configuración',
    permisos: [
      { id: 'configuracion.ver', label: 'Ver' },
      { id: 'configuracion.editar', label: 'Editar' },
    ],
  },
  logs: {
    label: 'Logs',
    permisos: [
      { id: 'logs.ver', label: 'Ver' },
    ],
  },
  inventario: {
    label: 'Inventario',
    permisos: [
      { id: 'inventario.ver', label: 'Ver' },
      { id: 'inventario.editar', label: 'Editar' },
    ],
  },
  rondas: {
    label: 'Rondas',
    permisos: [
      { id: 'rondas.ver', label: 'Ver' },
      { id: 'rondas.registrar', label: 'Registrar' },
      { id: 'rondas.crear', label: 'Crear' },
      { id: 'rondas.editar', label: 'Editar' },
      { id: 'rondas.eliminar', label: 'Eliminar' },
    ],
  },
  solicitudescompra: {
    label: 'Solicitudes de Compra',
    permisos: [
      { id: 'solicitudescompra.ver', label: 'Ver' },
      { id: 'solicitudescompra.crear', label: 'Crear' },
      { id: 'solicitudescompra.aprobar_supervisor', label: 'Aprobar (Sup.)' },
      { id: 'solicitudescompra.aprobar_admin', label: 'Aprobar (Admin)' },
      { id: 'solicitudescompra.gestionar', label: 'Gestionar' },
    ],
  },
  asistencia: {
    label: 'Asistencia',
    permisos: [
      { id: 'asistencia.ver', label: 'Ver' },
    ],
  },
};

// Tipo para los permisos
type PermisosType = Record<string, boolean>;

// Función para obtener permisos por defecto
const getDefaultPermisos = (): PermisosType => {
  const permisos: PermisosType = {};
  Object.values(CATEGORIAS_PERMISOS).forEach(categoria => {
    categoria.permisos.forEach(permiso => {
      permisos[permiso.id] = false;
    });
  });
  return permisos;
};

// Permisos por defecto según rol
const PERMISOS_DEFAULT_ROL: Record<string, string[]> = {
  admin: Object.values(CATEGORIAS_PERMISOS).flatMap(c => c.permisos.map(p => p.id)),
  supervisor: [
    'usuarios.ver',
    'residentes.ver', 'residentes.crear', 'residentes.editar',
    'propiedades.ver', 'propiedades.editar',
    'personal.ver', 'personal.editar',
    'proveedores.ver',
    'ots.ver', 'ots.crear', 'ots.editar', 'ots.aprobar',
    'proyectos.ver', 'proyectos.editar',
    'gastos.ver', 'gastos.crear', 'gastos.editar',
    'inspecciones.ver', 'inspecciones.crear', 'inspecciones.editar',
    'activos.ver', 'activos.editar',
    'catalogos.ver',
    'centros-costo.ver',
    'reportes.ver', 'reportes.exportar',
    'inventario.ver', 'inventario.editar',
    'solicitudescompra.ver', 'solicitudescompra.crear', 'solicitudescompra.aprobar_supervisor',
  ],
  usuario: [
    'residentes.ver',
    'propiedades.ver',
    'ots.ver', 'ots.crear',
    'inspecciones.ver',
    'activos.ver',
    'catalogos.ver',
    'reportes.ver',
    'inventario.ver',
  ],
  personal: [
    'ots.ver', 'ots.progreso',
  ],
  guardia: [
    // Guardia — Solo módulo de Rondas
    'rondas.ver', 'rondas.registrar',
  ],
  conserje: [
    // Conserje — Solo ver lecturas de QR y exportar PDF
    'rondas.ver',
  ],
  auditor: [
    // Auditor — Solo lectura de todo
    'usuarios.ver',
    'residentes.ver',
    'propiedades.ver',
    'personal.ver',
    'proveedores.ver',
    'ots.ver',
    'proyectos.ver',
    'gastos.ver',
    'inspecciones.ver',
    'activos.ver',
    'catalogos.ver',
    'centros-costo.ver',
    'reportes.ver', 'reportes.exportar',
    'inventario.ver',
    'rondas.ver',
    'solicitudescompra.ver',
    'asistencia.ver',
    'logs.ver',
  ],
};

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido?: string | null;
  rut?: string | null;
  rol: string;
  activo: boolean;
  permisos?: string | null;
  ultimoAcceso?: string | null;
  createdAt: string;
  // Campos nuevos de gestión de contraseña
  cambiarPasswordProximoLogin?: boolean;
  passwordTemp?: string | null;
  lastPasswordChange?: string | null;
  lastPasswordChangeMotivo?: string | null;
}

export function UsuariosModule() {
  const { user: currentUser, isAdmin, hasPermission } = useSession();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'password'>('create');
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [saving, setSaving] = useState(false);
  // Diálogo para mostrar credenciales después de crear usuario
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ nombre: string; email: string; password: string } | null>(null);
  // Diálogo para mostrar el password temporal de un usuario existente
  const [viewPasswordDialogOpen, setViewPasswordDialogOpen] = useState(false);
  const [viewPasswordUser, setViewPasswordUser] = useState<Usuario | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    rut: '',
    rol: 'usuario',
    activo: true,
    password: '',
    confirmPassword: '',
    permisos: getDefaultPermisos(),
  });

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const isSupervisor = () => currentUser?.rol === 'supervisor';

  const fetchUsuarios = async () => {
    try {
      const data = await apiFetch<Usuario[]>('/api/usuarios', []);
      // Supervisor cannot see admin users
      if (isSupervisor()) {
        setUsuarios(data.filter((u: Usuario) => u.rol !== 'admin'));
      } else {
        setUsuarios(data);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Parsear permisos desde JSON string
  const parsePermisos = (permisosStr: string | null | undefined): PermisosType => {
    const defaultPermisos = getDefaultPermisos();
    if (!permisosStr) return defaultPermisos;
    
    try {
      const parsed = JSON.parse(permisosStr);
      if (Array.isArray(parsed)) {
        // Si es un array, convertir a objeto
        const permisosObj: PermisosType = { ...defaultPermisos };
        parsed.forEach(p => {
          if (permisosObj.hasOwnProperty(p)) {
            permisosObj[p] = true;
          }
        });
        return permisosObj;
      } else if (typeof parsed === 'object') {
        // Si es un objeto, combinar con defaults
        return { ...defaultPermisos, ...parsed };
      }
    } catch {
      console.error('Error parsing permisos');
    }
    return defaultPermisos;
  };

  // Obtener permisos para el rol seleccionado
  const getPermisosForRol = (rol: string): PermisosType => {
    const permisos = getDefaultPermisos();
    const rolPermisos = PERMISOS_DEFAULT_ROL[rol] || [];
    rolPermisos.forEach(p => {
      if (permisos.hasOwnProperty(p)) {
        permisos[p] = true;
      }
    });
    return permisos;
  };

  const handleOpenCreate = () => {
    const permisosIniciales = getPermisosForRol('usuario');
    setFormData({
      nombre: '',
      apellido: '',
      email: '',
      rut: '',
      rol: 'usuario',
      activo: true,
      password: '',
      confirmPassword: '',
      permisos: permisosIniciales,
    });
    setSelectedUser(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleOpenEdit = (usuario: Usuario) => {
    if (isSupervisor() && usuario.rol === 'admin') {
      toast.error('No tiene permisos para editar cuentas de Administrador');
      return;
    }
    const permisosUsuario = parsePermisos(usuario.permisos);
    setFormData({
      nombre: usuario.nombre,
      apellido: usuario.apellido || '',
      email: usuario.email,
      rut: usuario.rut || '',
      rol: usuario.rol,
      activo: usuario.activo,
      password: '',
      confirmPassword: '',
      permisos: permisosUsuario,
    });
    setSelectedUser(usuario);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleOpenPassword = (usuario: Usuario) => {
    if (isSupervisor() && usuario.rol === 'admin') {
      toast.error('No tiene permisos para gestionar cuentas de Administrador');
      return;
    }
    setFormData({
      ...formData,
      password: '',
      confirmPassword: '',
    });
    setSelectedUser(usuario);
    setDialogMode('password');
    setDialogOpen(true);
  };

  // Manejar cambio de rol
  const handleRolChange = (rol: string) => {
    const nuevosPermisos = getPermisosForRol(rol);
    setFormData({ ...formData, rol, permisos: nuevosPermisos });
  };

  // Manejar cambio de permiso individual
  const handlePermisoChange = (permisoId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permisos: {
        ...prev.permisos,
        [permisoId]: checked,
      },
    }));
  };

  // Seleccionar/deseleccionar todos los permisos de una categoría
  const handleCategoriaChange = (categoriaKey: string, checked: boolean) => {
    const categoria = CATEGORIAS_PERMISOS[categoriaKey as keyof typeof CATEGORIAS_PERMISOS];
    if (!categoria) return;

    const nuevosPermisos = { ...formData.permisos };
    categoria.permisos.forEach(p => {
      nuevosPermisos[p.id] = checked;
    });

    setFormData(prev => ({
      ...prev,
      permisos: nuevosPermisos,
    }));
  };

  // Verificar si todos los permisos de una categoría están seleccionados
  const isCategoriaCompleta = (categoriaKey: string): boolean => {
    const categoria = CATEGORIAS_PERMISOS[categoriaKey as keyof typeof CATEGORIAS_PERMISOS];
    if (!categoria) return false;
    return categoria.permisos.every(p => formData.permisos[p.id]);
  };

  // Verificar si algunos permisos de una categoría están seleccionados
  const isCategoriaParcial = (categoriaKey: string): boolean => {
    const categoria = CATEGORIAS_PERMISOS[categoriaKey as keyof typeof CATEGORIAS_PERMISOS];
    if (!categoria) return false;
    const seleccionados = categoria.permisos.filter(p => formData.permisos[p.id]).length;
    return seleccionados > 0 && seleccionados < categoria.permisos.length;
  };

  const handleSave = async () => {
    // Validaciones
    if (!formData.nombre || !formData.email) {
      toast.error('Nombre y email son requeridos');
      return;
    }

    if (dialogMode === 'create') {
      if (!formData.password) {
        toast.error('La contraseña es requerida');
        return;
      }
      if (formData.password.length < 8) {
        toast.error('La contraseña debe tener al menos 8 caracteres');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Las contraseñas no coinciden');
        return;
      }
    }

    if (dialogMode === 'password') {
      if (!formData.password) {
        toast.error('La nueva contraseña es requerida');
        return;
      }
      if (formData.password.length < 8) {
        toast.error('La contraseña debe tener al menos 8 caracteres');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Las contraseñas no coinciden');
        return;
      }
    }

    setSaving(true);

    try {
      if (dialogMode === 'create') {
        // Convertir permisos a array de permisos activos
        const permisosActivos = Object.entries(formData.permisos)
          .filter(([, activo]) => activo)
          .map(([id]) => id);

        const response = await fetch('/api/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formData.nombre,
            apellido: formData.apellido,
            email: formData.email,
            rut: formData.rut,
            rol: formData.rol,
            password: formData.password,
            permisos: JSON.stringify(permisosActivos),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          toast.success('Usuario creado correctamente');
          fetchUsuarios();
          setDialogOpen(false);
          // Mostrar diálogo con las credenciales para que el admin las comparta con el usuario
          setCreatedCredentials({
            nombre: `${formData.nombre} ${formData.apellido || ''}`.trim(),
            email: formData.email,
            password: data.passwordTemp || formData.password,
          });
          setCredentialsDialogOpen(true);
        } else {
          const data = await response.json();
          toast.error(data.error || 'Error al crear usuario');
        }
      } else if (dialogMode === 'edit' && selectedUser) {
        // Convertir permisos a array de permisos activos
        const permisosActivos = Object.entries(formData.permisos)
          .filter(([, activo]) => activo)
          .map(([id]) => id);

        const response = await fetch(`/api/usuarios/${selectedUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formData.nombre,
            apellido: formData.apellido,
            rut: formData.rut,
            rol: formData.rol,
            activo: formData.activo,
            permisos: JSON.stringify(permisosActivos),
          }),
        });

        if (response.ok) {
          toast.success('Usuario actualizado correctamente');
          fetchUsuarios();
          setDialogOpen(false);
        } else {
          const data = await response.json();
          toast.error(data.error || 'Error al actualizar usuario');
        }
      } else if (dialogMode === 'password' && selectedUser) {
        const response = await fetch(`/api/usuarios/${selectedUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: formData.password,
          }),
        });

        if (response.ok) {
          toast.success('Contraseña restablecida correctamente');
          setDialogOpen(false);
          // Si es admin restableciendo la contraseña de otro usuario, mostrar el diálogo con las nuevas credenciales
          if (currentUser?.id !== selectedUser.id) {
            setCreatedCredentials({
              nombre: `${selectedUser.nombre} ${selectedUser.apellido || ''}`.trim(),
              email: selectedUser.email,
              password: formData.password,
            });
            setCredentialsDialogOpen(true);
          }
          fetchUsuarios();
        } else {
          const data = await response.json();
          toast.error(data.error || 'Error al actualizar contraseña');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (usuario: Usuario) => {
    if (isSupervisor() && usuario.rol === 'admin') {
      toast.error('No tiene permisos para desactivar cuentas de Administrador');
      return;
    }
    try {
      const response = await fetch(`/api/usuarios/${usuario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !usuario.activo }),
      });

      if (response.ok) {
        toast.success(usuario.activo ? 'Usuario desactivado' : 'Usuario activado');
        fetchUsuarios();
      } else {
        toast.error('Error al actualizar estado');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    }
  };

  const getRoleIcon = (rol: string) => {
    switch (rol) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'supervisor':
        return <UserCog className="w-4 h-4" />;
      case 'personal':
        return <Lock className="w-4 h-4" />;
      case 'guardia':
        return <Shield className="w-4 h-4" />;
      case 'conserje':
        return <Eye className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const getRoleBadge = (rol: string) => {
    switch (rol) {
      case 'admin':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Administrador</Badge>;
      case 'supervisor':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Supervisor</Badge>;
      case 'personal':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Personal</Badge>;
      case 'guardia':
        return <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">Guardia</Badge>;
      case 'conserje':
        return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Conserje</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Usuario</Badge>;
    }
  };

  const getInitials = (usuario: Usuario) => {
    return (usuario.nombre.charAt(0) + (usuario.apellido?.charAt(0) || '')).toUpperCase();
  };

  const filteredUsuarios = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.rut?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Acceso Restringido</h2>
          <p className="text-muted-foreground mt-2">
            No tiene permisos para gestionar usuarios
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TableroIndicadores
        cards={[
          { titulo: 'Total Usuarios', numero: usuarios.length, icon: <Users className="w-5 h-5" />, color: 'primary' },
          { titulo: 'Activos', numero: usuarios.filter(u => u.activo).length, icon: <CheckCircle className="w-5 h-5" />, color: 'verde' },
          { titulo: 'Inactivos', numero: usuarios.filter(u => !u.activo).length, icon: <XCircle className="w-5 h-5" />, color: 'rojo' },
          { titulo: 'Administradores', numero: usuarios.filter(u => u.rol === 'admin' || u.rol === 'Administrador').length, icon: <Shield className="w-5 h-5" />, color: 'azul' },
        ]}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground">
            Administre los usuarios del sistema
          </p>
          {isSupervisor() && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Nota: No puede ver ni gestionar cuentas de Administrador
            </p>
          )}
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email o RUT..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>RUT</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último Acceso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 bg-primary/20 text-primary">
                          <AvatarFallback className="text-xs font-bold">
                            {getInitials(usuario)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {usuario.nombre} {usuario.apellido}
                          </div>
                          {usuario.id === currentUser?.id && (
                            <div className="text-[10px] text-muted-foreground">
                              (Tu cuenta)
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>{usuario.rut || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(usuario.rol)}
                        {getRoleBadge(usuario.rol)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={usuario.activo ? 'default' : 'secondary'}
                        className={usuario.activo 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }
                      >
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {usuario.ultimoAcceso
                        ? new Date(usuario.ultimoAcceso).toLocaleDateString('es-CL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Nunca'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(usuario)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenPassword(usuario)}>
                            <Key className="w-4 h-4 mr-2" />
                            Restablecer Contraseña
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setViewPasswordUser(usuario);
                              setViewPasswordDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver contraseña
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleToggleActive(usuario)}
                            disabled={usuario.id === currentUser?.id}
                          >
                            {usuario.activo ? (
                              <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <UserIcon className="w-4 h-4 mr-2" />
                                Activar
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={dialogMode !== 'password' ? 'max-w-3xl max-h-[90vh]' : ''}>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' && 'Nuevo Usuario'}
              {dialogMode === 'edit' && 'Editar Usuario'}
              {dialogMode === 'password' && 'Cambiar Contraseña'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create' && 'Complete los datos para crear un nuevo usuario'}
              {dialogMode === 'edit' && 'Modifique los datos del usuario'}
              {dialogMode === 'password' && 'Ingrese la nueva contraseña'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {dialogMode === 'password' ? (
              <>
                <div className="space-y-2">
                  <Label>Nueva Contraseña</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Contraseña</Label>
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Repita la contraseña"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Nombre"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido</Label>
                    <Input
                      value={formData.apellido}
                      onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                      placeholder="Apellido"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    disabled={dialogMode === 'edit'}
                  />
                </div>

                <div className="space-y-2">
                  <Label>RUT</Label>
                  <Input
                    value={formData.rut}
                    onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                    placeholder="12.345.678-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select
                    value={formData.rol}
                    onValueChange={handleRolChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usuario">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4" />
                          Usuario
                        </div>
                      </SelectItem>
                      <SelectItem value="personal">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          Personal
                        </div>
                      </SelectItem>
                      <SelectItem value="guardia">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Guardia
                        </div>
                      </SelectItem>
                      <SelectItem value="conserje">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Conserje
                        </div>
                      </SelectItem>
                      <SelectItem value="supervisor">
                        <div className="flex items-center gap-2">
                          <UserCog className="w-4 h-4" />
                          Supervisor
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Administrador
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {dialogMode === 'create' && (
                  <>
                    <div className="space-y-2">
                      <Label>Contraseña *</Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Mínimo 8 caracteres"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirmar Contraseña</Label>
                      <Input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="Repita la contraseña"
                      />
                    </div>
                  </>
                )}

                {dialogMode === 'edit' && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="activo"
                      checked={formData.activo}
                      onCheckedChange={(checked) => setFormData({ ...formData, activo: !!checked })}
                    />
                    <Label htmlFor="activo">Usuario activo</Label>
                  </div>
                )}

                {/* Sección de Permisos */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Permisos del Sistema
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {Object.values(formData.permisos).filter(Boolean).length} permisos seleccionados
                    </span>
                  </div>
                  
                  <ScrollArea className="h-64 w-full rounded-md border p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(CATEGORIAS_PERMISOS).map(([key, categoria]) => (
                        <div key={key} className="space-y-2 p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Checkbox
                              id={`categoria-${key}`}
                              checked={isCategoriaCompleta(key)}
                              ref={(el) => {
                                if (el) {
                                  (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = isCategoriaParcial(key);
                                }
                              }}
                              onCheckedChange={(checked) => handleCategoriaChange(key, !!checked)}
                            />
                            <Label 
                              htmlFor={`categoria-${key}`} 
                              className="font-medium text-sm cursor-pointer"
                            >
                              {categoria.label}
                            </Label>
                          </div>
                          <div className="grid grid-cols-2 gap-1 pl-6">
                            {categoria.permisos.map((permiso) => (
                              <div key={permiso.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={permiso.id}
                                  checked={formData.permisos[permiso.id] || false}
                                  onCheckedChange={(checked) => handlePermisoChange(permiso.id, !!checked)}
                                  className="h-3.5 w-3.5"
                                />
                                <Label 
                                  htmlFor={permiso.id} 
                                  className="text-xs cursor-pointer"
                                >
                                  {permiso.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {dialogMode === 'create' && 'Crear Usuario'}
              {dialogMode === 'edit' && 'Guardar Cambios'}
              {dialogMode === 'password' && 'Restablecer Contraseña'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: Credenciales creadas / restablecidas */}
      <Dialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-[#0A1172]" />
              Credenciales del usuario
            </DialogTitle>
            <DialogDescription>
              Comparte estas credenciales con el usuario. Al primer inicio de sesión se le pedirá que cambie su contraseña.
            </DialogDescription>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                ⚠️ <strong>Importante:</strong> Esta contraseña es temporal. El usuario deberá cambiarla al iniciar sesión por primera vez. No se volverá a mostrar.
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-500">Nombre</Label>
                  <div className="font-semibold">{createdCredentials.nombre}</div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  <div className="font-mono text-sm">{createdCredentials.email}</div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Contraseña temporal</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-100 px-3 py-2 rounded font-mono text-sm border">
                      {createdCredentials.password}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(createdCredentials.password);
                        toast.success('Contraseña copiada al portapapeles');
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                💡 Recomendación: Envía estas credenciales por un canal seguro (no por email público). El usuario deberá cambiarla en su primer inicio de sesión.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredentialsDialogOpen(false)}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                if (createdCredentials) {
                  const text = `Credenciales de acceso - Asesorías Integrales CyJ\n\nNombre: ${createdCredentials.nombre}\nEmail: ${createdCredentials.email}\nContraseña temporal: ${createdCredentials.password}\nURL: https://condominios-cyj.vercel.app/login\n\nImportante: Debes cambiar tu contraseña al iniciar sesión por primera vez.`;
                  navigator.clipboard.writeText(text);
                  toast.success('Todas las credenciales copiadas al portapapeles');
                }
              }}
            >
              Copiar todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: Ver contraseña de un usuario */}
      <Dialog open={viewPasswordDialogOpen} onOpenChange={setViewPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#0A1172]" />
              Contraseña del usuario
            </DialogTitle>
            <DialogDescription>
              Contraseña actual registrada en el sistema para este usuario.
            </DialogDescription>
          </DialogHeader>
          {viewPasswordUser && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-500">Usuario</Label>
                  <div className="font-semibold">
                    {viewPasswordUser.nombre} {viewPasswordUser.apellido || ''}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  <div className="font-mono text-sm">{viewPasswordUser.email}</div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Contraseña actual</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-100 px-3 py-2 rounded font-mono text-sm border">
                      {viewPasswordUser.passwordTemp || 'No disponible'}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (viewPasswordUser.passwordTemp) {
                          navigator.clipboard.writeText(viewPasswordUser.passwordTemp);
                          toast.success('Contraseña copiada');
                        }
                      }}
                      disabled={!viewPasswordUser.passwordTemp}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
                {viewPasswordUser.lastPasswordChange && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                    Último cambio: {new Date(viewPasswordUser.lastPasswordChange).toLocaleString('es-CL')}
                    {viewPasswordUser.lastPasswordChangeMotivo && (
                      <span> — Motivo: <strong>{viewPasswordUser.lastPasswordChangeMotivo.replace(/_/g, ' ')}</strong></span>
                    )}
                  </div>
                )}
                {viewPasswordUser.cambiarPasswordProximoLogin && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                    ⚠️ Este usuario debe cambiar su contraseña en el próximo inicio de sesión.
                  </div>
                )}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
                  <strong>Copiar todo:</strong> Nombre, email, contraseña y URL de acceso
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const text = `Credenciales de acceso - Laguna Norte\n\nNombre: ${viewPasswordUser.nombre} ${viewPasswordUser.apellido || ''}\nEmail: ${viewPasswordUser.email}\nContraseña: ${viewPasswordUser.passwordTemp || 'No disponible'}\nURL: https://condominios-cyj.vercel.app/login`;
                    navigator.clipboard.writeText(text);
                    toast.success('Credenciales copiadas al portapapeles');
                  }}
                  disabled={!viewPasswordUser.passwordTemp}
                >
                  Copiar credenciales completas
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewPasswordDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
