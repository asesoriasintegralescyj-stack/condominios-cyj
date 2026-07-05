/**
 * API de Gestión de Usuarios
 * Condominio Laguna Norte - Sistema de Gestión v2
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
import { 
  getCurrentSession, 
  updateUser, 
  deleteUser,
  getUserById,
  hasPermission,
  hashPassword,
  encrypt,
  decrypt,
  createUser,
} from '@/lib/auth';

// GET - Listar usuarios
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    
    // Verificar permiso
    if (!hasPermission(session.user.rol, 'usuarios.ver')) {
      return NextResponse.json(
        { error: 'No tiene permisos para ver usuarios' },
        { status: 403 }
      );
    }
    
    const users = await withRetry(() => db.user.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rut: true,
        rol: true,
        activo: true,
        permisos: true,
        emailVerificado: true,
        ultimoAcceso: true,
        createdAt: true,
        // Campos nuevos para gestión de contraseña
        cambiarPasswordProximoLogin: true,
        lastPasswordChange: true,
        lastPasswordChangeMotivo: true,
        passwordTemp: true,
      },
      orderBy: { createdAt: 'desc' },
    }));

    // Desencriptar passwordTemp para que el admin pueda verla
    const usersWithDecrypted = users.map((u) => ({
      ...u,
      passwordTemp: u.passwordTemp ? decrypt(u.passwordTemp) : null,
    }));
    
    return NextResponse.json(usersWithDecrypted);
    
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// POST - Crear usuario
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    
    // Verificar permiso
    if (!hasPermission(session.user.rol, 'usuarios.crear')) {
      return NextResponse.json(
        { error: 'No tiene permisos para crear usuarios' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { email, nombre, apellido, password, rut, telefono, direccion, rol, permisos } = body;
    
    if (!email || !nombre || !password) {
      return NextResponse.json(
        { error: 'Email, nombre y contraseña son requeridos' },
        { status: 400 }
      );
    }
    
    // Validar contraseña
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }
    
    // Verificar si el email ya existe
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      );
    }
    
    // Hashear contraseña y crear usuario con flag de cambio de contraseña
    const newUser = await createUser({
      email: email.toLowerCase(),
      nombre,
      apellido,
      password,
      rut,
      telefono,
      direccion,
      rol: rol || 'usuario',
      creadoPor: session.userId,
    });

    // Crear notificación a administradores sobre la creación del usuario
    try {
      const admins = await db.user.findMany({
        where: { rol: 'admin', activo: true },
        select: { id: true },
      });
      if (admins.length > 0) {
        await db.notificacion.createMany({
          data: admins.map((a) => ({
            titulo: 'Nuevo usuario creado',
            mensaje: `Se creó el usuario ${nombre} ${apellido || ''} (${email}) con rol "${rol || 'usuario'}". Deberá cambiar su contraseña en el primer inicio de sesión.`,
            tipo: 'Info',
            categoria: 'Seguridad',
            destino: 'Usuario específico',
            destinoId: a.id,
            leido: false,
          })),
        });
      }
    } catch (e) {
      console.error('Error creando notificaciones a admins (crear usuario):', e);
    }

    return NextResponse.json({
      id: newUser.id,
      email: newUser.email,
      nombre: newUser.nombre,
      apellido: newUser.apellido,
      rol: newUser.rol,
      // Devolver la contraseña temporal (en texto plano) para que el admin
      // pueda compartirla con el usuario. Se limpiará después del primer login.
      passwordTemp: password,
      cambiarPasswordProximoLogin: true,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creando usuario:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear usuario' },
      { status: 500 }
    );
  }
}
