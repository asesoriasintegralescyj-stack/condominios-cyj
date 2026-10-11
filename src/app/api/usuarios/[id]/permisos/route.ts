/**
 * API para gestionar permisos personalizados de un usuario.
 * Solo el administrador puede modificar permisos.
 * 
 * Formato del campo `permisos` en DB:
 *   { "agregar": ["modulo.ver", ...], "quitar": ["modulo.editar", ...] }
 *
 * - agregar: permisos extra que el usuario tiene além de su rol
 * - quitar: permisos del rol base que se le revocan
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentSession, PERMISOS_POR_ROL, getPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// GET - Obtener permisos efectivos de un usuario (base del rol + overrides)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.user.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo administrador' }, { status: 403 });
    }

    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        permisos: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Parsear overrides
    let overrides = { agregar: [] as string[], quitar: [] as string[] };
    try {
      if (user.permisos) {
        overrides = JSON.parse(user.permisos);
      }
    } catch { /* keep defaults */ }

    // Permiso efectivo = rol base + agregar - quitar
    const rolBase = PERMISOS_POR_ROL[user.rol as keyof typeof PERMISOS_POR_ROL] || [];
    const efectivos = getPermissions(user.rol, user.permisos);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol,
      },
      permisosBase: rolBase,
      overrides,
      permisosEfectivos: efectivos,
    });
  } catch (error) {
    console.error('Error obteniendo permisos:', error);
    return NextResponse.json({ error: 'Error al obtener permisos' }, { status: 500 });
  }
}

// PUT - Guardar permisos personalizados de un usuario
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.user.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo administrador' }, { status: 403 });
    }

    // No puede modificarse a sí mismo
    const { id } = await params;
    if (session.userId === id) {
      return NextResponse.json({ error: 'No puedes modificar tus propios permisos' }, { status: 400 });
    }

    const body = await request.json();
    const { agregar, quitar } = body;

    const agregarArr = Array.isArray(agregar) ? agregar.filter(Boolean) : [];
    const quitarArr = Array.isArray(quitar) ? quitar.filter(Boolean) : [];

    // Validar que los permisos sean strings válidos
    const allPerms = [...agregarArr, ...quitarArr];
    for (const p of allPerms) {
      if (typeof p !== 'string' || !p.includes('.')) {
        return NextResponse.json(
          { error: `Formato de permiso inválido: ${p}. Debe ser "modulo.accion"` },
          { status: 400 }
        );
      }
    }

    // No permitir quitar permisos de admin a otro admin
    const targetUser = await db.user.findUnique({
      where: { id },
      select: { rol: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Guardar en DB como JSON
    const permisosJson = JSON.stringify({ agregar: agregarArr, quitar: quitarArr });

    await db.user.update({
      where: { id },
      data: { permisos: permisosJson },
    });

    // Auditoría
    try {
      await db.logAuditoria.create({
        data: {
          accion: 'update_permisos',
          entidad: 'User',
          entidadId: id,
          datosDespues: permisosJson,
          userId: session.userId,
        },
      });
    } catch (e) {
      console.error('Error auditoría permisos:', e);
    }

    // Calcular permisos efectivos nuevos para devolver
    const efectivos = getPermissions(targetUser.rol, permisosJson);

    return NextResponse.json({
      success: true,
      overrides: { agregar: agregarArr, quitar: quitarArr },
      permisosEfectivos: efectivos,
    });
  } catch (error) {
    console.error('Error guardando permisos:', error);
    return NextResponse.json({ error: 'Error al guardar permisos' }, { status: 500 });
  }
}
