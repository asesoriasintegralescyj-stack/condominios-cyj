/**
 * API de Autenticación del Portal de Residentes
 * Permite login con RUT + Unidad o Email + Unidad
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

const PORTAL_SESSION_DURATION_DAYS = 30;

// Generar token seguro
function generatePortalToken(): string {
  return randomBytes(32).toString('hex');
}

// POST - Login al portal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rut, email, unidad } = body;

    // Validar que venga al menos RUT o Email, y la unidad
    if ((!rut && !email) || !unidad) {
      return NextResponse.json(
        { error: 'Debe proporcionar RUT o Email, y el número de unidad' },
        { status: 400 }
      );
    }

    // Buscar residente por RUT o Email y Unidad
    const residente = await db.residente.findFirst({
      where: {
        OR: [
          rut ? { rut: rut.replace(/\./g, '').replace(/-/g, '') } : {},
          email ? { email: email.toLowerCase() } : {},
        ],
        unidad: unidad.toUpperCase(),
        estado: 'Activo',
      },
    });

    if (!residente) {
      return NextResponse.json(
        { error: 'Credenciales inválidas. Verifique sus datos.' },
        { status: 401 }
      );
    }

    // Generar token de acceso
    const token = generatePortalToken();
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + PORTAL_SESSION_DURATION_DAYS);

    // Desactivar tokens anteriores del residente
    await db.accesoPortal.updateMany({
      where: { residenteId: residente.id, activo: true },
      data: { activo: false },
    });

    // Crear nuevo acceso del portal
    await db.accesoPortal.create({
      data: {
        residenteId: residente.id,
        token,
        fechaExpiracion,
        ultimoAcceso: new Date(),
        activo: true,
      },
    });

    // Establecer cookie del portal
    const cookieStore = await cookies();
    cookieStore.set('portal_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: PORTAL_SESSION_DURATION_DAYS * 24 * 60 * 60,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      residente: {
        id: residente.id,
        nombre: residente.nombre,
        apellido: residente.apellido,
        unidad: residente.unidad,
        email: residente.email,
        telefono: residente.telefono,
      },
    });
  } catch (error) {
    console.error('Error en login portal:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET - Verificar sesión del portal
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('portal_token')?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false, error: 'No hay sesión activa' },
        { status: 401 }
      );
    }

    // Buscar acceso por token
    const acceso = await db.accesoPortal.findUnique({
      where: { token, activo: true },
      include: {
        residente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            rut: true,
            unidad: true,
            email: true,
            telefono: true,
            etapa: true,
          },
        },
      },
    });

    if (!acceso) {
      return NextResponse.json(
        { authenticated: false, error: 'Sesión inválida' },
        { status: 401 }
      );
    }

    // Verificar expiración
    if (acceso.fechaExpiracion && acceso.fechaExpiracion < new Date()) {
      await db.accesoPortal.update({
        where: { id: acceso.id },
        data: { activo: false },
      });
      return NextResponse.json(
        { authenticated: false, error: 'Sesión expirada' },
        { status: 401 }
      );
    }

    // Actualizar último acceso
    await db.accesoPortal.update({
      where: { id: acceso.id },
      data: { ultimoAcceso: new Date() },
    });

    return NextResponse.json({
      authenticated: true,
      residente: acceso.residente,
    });
  } catch (error) {
    console.error('Error verificando sesión portal:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Error interno' },
      { status: 500 }
    );
  }
}

// DELETE - Logout del portal
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('portal_token')?.value;

    if (token) {
      // Desactivar el token en la base de datos
      await db.accesoPortal.updateMany({
        where: { token },
        data: { activo: false },
      });
    }

    // Eliminar cookie
    cookieStore.delete('portal_token');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en logout portal:', error);
    return NextResponse.json(
      { error: 'Error al cerrar sesión' },
      { status: 500 }
    );
  }
}
