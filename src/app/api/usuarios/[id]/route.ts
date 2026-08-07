/**
 * API de Usuario Individual
 * Condominio Laguna Norte - Sistema de Gestión v2
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  getCurrentSession, 
  updateUser, 
  deleteUser,
  getUserById,
  hasPermission,
  verifyPassword,
  hashPassword,
  encrypt,
  decrypt,
} from '@/lib/auth';

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - Obtener usuario por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    const { id } = await params;
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    
    // Solo admin puede ver otros usuarios, o el mismo usuario
    if (session.userId !== id && !hasPermission(session.user.rol, 'usuarios.ver', session.userPermisos)) {
      return NextResponse.json(
        { error: 'No tiene permisos para ver este usuario' },
        { status: 403 }
      );
    }
    
    const user = await getUserById(id);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    // Si es admin, devolver también info de contraseña
    if (hasPermission(session.user.rol, 'usuarios.ver', session.userPermisos)) {
      const userExtra = await db.user.findUnique({
        where: { id },
        select: {
          cambiarPasswordProximoLogin: true,
          lastPasswordChange: true,
          lastPasswordChangeMotivo: true,
          passwordTemp: true,
        },
      });
      return NextResponse.json({
        ...user,
        cambiarPasswordProximoLogin: userExtra?.cambiarPasswordProximoLogin || false,
        lastPasswordChange: userExtra?.lastPasswordChange || null,
        lastPasswordChangeMotivo: userExtra?.lastPasswordChangeMotivo || null,
        // Solo admin puede ver el password temporal
        passwordTemp: userExtra?.passwordTemp ? decrypt(userExtra.passwordTemp) : null,
      });
    }
    
    return NextResponse.json(user);
    
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuario' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar usuario
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    const { id } = await params;
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    
    // Solo admin puede editar otros usuarios, o el mismo usuario
    const isOwnProfile = session.userId === id;
    const isAdmin = hasPermission(session.user.rol, 'usuarios.editar', session.userPermisos);
    
    if (!isOwnProfile && !isAdmin) {
      return NextResponse.json(
        { error: 'No tiene permisos para editar este usuario' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { nombre, apellido, rut, telefono, direccion, rol, activo, password, currentPassword, permisos, forcePasswordReset } = body;
    
    // Si es el propio perfil y quiere cambiar contraseña, debe proporcionar la actual
    if (isOwnProfile && password) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Debe proporcionar su contraseña actual para cambiarla' },
          { status: 400 }
        );
      }
      
      const user = await db.user.findUnique({ where: { id } });
      if (!user || !await verifyPassword(currentPassword, user.password)) {
        return NextResponse.json(
          { error: 'Contraseña actual incorrecta' },
          { status: 400 }
        );
      }
    }
    
    // Solo admin puede cambiar rol, estado activo y permisos
    const updateData: any = {};
    if (nombre) updateData.nombre = nombre;
    if (apellido !== undefined) updateData.apellido = apellido;
    if (rut !== undefined) updateData.rut = rut;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (direccion !== undefined) updateData.direccion = direccion;
    if (password) {
      updateData.password = password;
      // Si el admin está reseteando la contraseña de otro usuario, forzar cambio en el próximo login
      if (!isOwnProfile && isAdmin) {
        updateData.passwordChangeMotivo = 'cambio_forzado';
        updateData.cambiarPasswordProximoLogin = true;
        // Volver a encriptar el password temporal para mostrarlo al admin
        if (password) {
          const { encrypt } = await import('@/lib/auth');
          updateData.passwordTemp = encrypt(password);
        }
      } else {
          updateData.passwordChangeMotivo = 'cambio_voluntario';
        // Incluso cambio voluntario: guardar passwordTemp para admin
        const { encrypt } = await import('@/lib/auth');
        updateData.passwordTemp = encrypt(password);
      }
    }
    
    if (isAdmin) {
      if (rol) updateData.rol = rol;
      if (activo !== undefined) updateData.activo = activo;
      if (permisos !== undefined) updateData.permisos = permisos;
    }

    // Forzar reseteo de contraseña en próximo login (sin cambiar la contraseña actual)
    if (forcePasswordReset && isAdmin && !isOwnProfile) {
      updateData.cambiarPasswordProximoLogin = true;
    }
    
    const user = await updateUser(id, updateData, session.userId);

    // Crear notificación a administradores si se reseteó la contraseña de otro usuario
    if (!isOwnProfile && isAdmin && password) {
      try {
        const targetUser = await db.user.findUnique({ where: { id }, select: { nombre: true, apellido: true, email: true } });
        const admins = await db.user.findMany({
          where: { rol: 'admin', activo: true },
          select: { id: true },
        });
        if (admins.length > 0 && targetUser) {
          await db.notificacion.createMany({
            data: admins.map((a) => ({
              titulo: 'Contraseña restablecida por administrador',
              mensaje: `El administrador ${session.user.nombre} ${session.user.apellido || ''} restableció la contraseña de ${targetUser.nombre} ${targetUser.apellido || ''} (${targetUser.email}). El usuario deberá cambiarla en su próximo inicio de sesión.`,
              tipo: 'Alerta',
              categoria: 'Seguridad',
              destino: 'Usuario específico',
              destinoId: a.id,
              leido: false,
            })),
          });
        }
      } catch (e) {
        console.error('Error creando notificaciones a admins (reset password):', e);
      }
    }
    
    return NextResponse.json({
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      rol: user.rol,
      activo: user.activo,
    });
    
  } catch (error: any) {
    console.error('Error actualizando usuario:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar usuario (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    const { id } = await params;
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    
    // Solo admin puede eliminar usuarios
    if (!hasPermission(session.user.rol, 'usuarios.eliminar', session.userPermisos)) {
      return NextResponse.json(
        { error: 'No tiene permisos para eliminar usuarios' },
        { status: 403 }
      );
    }
    
    // No puede eliminarse a sí mismo
    if (session.userId === id) {
      return NextResponse.json(
        { error: 'No puede eliminar su propia cuenta' },
        { status: 400 }
      );
    }
    
    await deleteUser(id, session.userId);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    return NextResponse.json(
      { error: 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
}
