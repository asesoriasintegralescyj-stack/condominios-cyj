/**
 * Helpers estandarizados para respuestas API y manejo de errores.
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

/**
 * Respuesta de éxito estándar.
 */
export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Respuesta de error estándar (no expone detalles internos al cliente).
 */
export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Maneja errores de Prisma devolviendo el código HTTP adecuado.
 * Loggea el detalle en servidor, expone un mensaje genérico al cliente.
 */
export function handlePrismaError(error: unknown): NextResponse {
  // Log full para debug en servidor
  console.error('[Prisma Error]', error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const target = (error.meta?.target as string[] | undefined)?.join(', ') || 'campo';
        return apiError(`Ya existe un registro con ese ${target}`, 409);
      case 'P2025':
        // Record not found
        return apiError('Registro no encontrado', 404);
      case 'P2003':
        // Foreign key violation
        return apiError('No se puede completar la operación: el registro está referenciado por otros datos', 409);
      case 'P2014':
        // Required relation violation
        return apiError('Falta una relación requerida', 400);
      default:
        return apiError('Error de base de datos', 400);
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return apiError('Datos inválidos', 400);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return apiError('Error de conexión a la base de datos', 503);
  }

  // Errores de negocio (lanzados manualmente con `throw new Error('mensaje')`)
  if (error instanceof Error) {
    // Si el mensaje parece de negocio (corto, sin stack trace interno), lo mostramos
    const msg = error.message;
    if (msg && msg.length < 200 && !msg.includes('\n')) {
      return apiError(msg, 400);
    }
  }

  return apiError('Error interno del servidor', 500);
}

/**
 * Wrapper para handlers que envuelve en try/catch estandarizado.
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handlePrismaError(error);
    }
  }) as T;
}
