/**
 * Utilidades de Autenticación y Encriptación
 * Condominio Laguna Norte - Sistema de Gestión v2
 */

import { db } from '@/lib/db';
import { randomBytes, randomInt, createCipheriv, createDecipheriv, createHash, scryptSync } from 'crypto';
import { cookies } from 'next/headers';
import * as bcrypt from 'bcrypt';

// ============================================
// CONFIGURACIÓN
// ============================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Clave de encriptación (debe estar en variables de entorno)
const getEncryptionKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  const salt = process.env.ENCRYPTION_SALT || 'condominio-cyj-prod-salt';

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY (o NEXTAUTH_SECRET) es obligatoria en producción. Configúrala en Vercel.');
    }
    // Solo en desarrollo: usar valor por defecto para no romper el entorno local
    return scryptSync('dev-only-encryption-key-not-for-prod', salt, 32);
  }

  return scryptSync(secret, salt, 32);
};

// Tipo seguro de usuario (sin password hash)
export type SafeUser = {
  id: string;
  email: string;
  nombre: string;
  apellido: string | null;
  rut: string | null;
  telefono: string | null;
  direccion: string | null;
  rol: string;
  permisos: string | null;
  activo: boolean;
  emailVerificado: Date | null;
  ultimoAcceso: Date | null;
  intentosLogin: number;
  bloqueadoHasta: Date | null;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================
// ENCRIPTACIÓN DE DATOS SENSIBLES
// ============================================

/**
 * Encripta un texto usando AES-256-GCM
 */
export function encrypt(text: string): string {
  if (!text) return '';
  
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Formato: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Error encrypting data:', error);
    return '';
  }
}

/**
 * Desencripta un texto encriptado con AES-256-GCM
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';
  
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      // Datos no encriptados o formato incorrecto
      return encryptedData;
    }
    
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error decrypting data:', error);
    return '';
  }
}

/**
 * Hash de un texto (unidireccional)
 */
export function hash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

// ============================================
// GESTIÓN DE CONTRASEÑAS
// ============================================

const SALT_ROUNDS = 12;

/**
 * Hashea una contraseña usando bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifica una contraseña contra su hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * Genera una contraseña segura aleatoria usando crypto.randomInt (criptográficamente seguro)
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  const securePick = (charset: string): string => charset[randomInt(0, charset.length)];
  
  // Asegurar al menos un carácter de cada tipo
  const required = [
    securePick(uppercase),
    securePick(lowercase),
    securePick(numbers),
    securePick(symbols),
  ];
  
  // Completar el resto
  const remaining: string[] = [];
  for (let i = required.length; i < length; i++) {
    remaining.push(securePick(allChars));
  }
  
  // Mezclar usando Fisher-Yates con crypto.randomInt
  const all = [...required, ...remaining];
  for (let i = all.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [all[i], all[j]] = [all[j], all[i]];
  }
  
  return all.join('');
}

// ============================================
// GESTIÓN DE SESIONES
// ============================================

const SESSION_COOKIE_NAME = 'condominio_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Genera un token de sesión seguro
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Crea una nueva sesión para un usuario
 */
export async function createSession(userId: string, userAgent?: string, ip?: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  
  await db.session.create({
    data: {
      userId,
      token,
      userAgent,
      ip,
      expiresAt,
    },
  });
  
  return token;
}

/**
 * Verifica un token de sesión. NO incluye el hash del password en el objeto retornado.
 */
export async function verifySession(token: string): Promise<{ userId: string; user: SafeUser } | null> {
  if (!token) return null;
  
  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          nombre: true,
          apellido: true,
          rut: true,
          telefono: true,
          direccion: true,
          rol: true,
          permisos: true,
          activo: true,
          emailVerificado: true,
          ultimoAcceso: true,
          intentosLogin: true,
          bloqueadoHasta: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
  
  if (!session) return null;
  
  // Verificar expiración
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { token } });
    return null;
  }
  
  // Verificar si el usuario está activo
  if (!session.user.activo) {
    await db.session.delete({ where: { token } });
    return null;
  }
  
  // Actualizar último acceso (sin bloquear el flujo)
  db.user.update({
    where: { id: session.userId },
    data: { ultimoAcceso: new Date() },
  }).catch((err) => console.error('Error actualizando ultimoAcceso:', err));
  
  return {
    userId: session.userId,
    user: session.user as SafeUser,
  };
}

/**
 * Elimina una sesión (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  if (token) {
    await db.session.deleteMany({ where: { token } });
  }
}

/**
 * Obtiene la sesión actual desde las cookies
 */
export async function getCurrentSession(): Promise<{ userId: string; user: SafeUser } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!token) return null;
  
  return verifySession(token);
}

/**
 * Obtiene el usuario actual de la sesión (sin password hash)
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const session = await getCurrentSession();
  return session?.user || null;
}

/**
 * Establece la cookie de sesión
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000,
    path: '/',
  });
}

/**
 * Elimina la cookie de sesión
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// ============================================
// AUTENTICACIÓN DE USUARIOS
// ============================================

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos

/**
 * Autentica un usuario con email y contraseña
 */
export async function authenticateUser(
  email: string, 
  password: string,
  userAgent?: string,
  ip?: string
): Promise<{ success: boolean; error?: string; token?: string }> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  
  // Usuario no encontrado
  if (!user) {
    return { success: false, error: 'Credenciales inválidas' };
  }
  
  // Verificar si está bloqueado
  if (user.bloqueadoHasta && user.bloqueadoHasta > new Date()) {
    const minutosRestantes = Math.ceil((user.bloqueadoHasta.getTime() - Date.now()) / 60000);
    return { 
      success: false, 
      error: `Cuenta bloqueada. Intente nuevamente en ${minutosRestantes} minutos.` 
    };
  }
  
  // Verificar si está activo
  if (!user.activo) {
    return { success: false, error: 'Cuenta desactivada. Contacte al administrador.' };
  }
  
  // Verificar contraseña
  const validPassword = await verifyPassword(password, user.password);
  
  if (!validPassword) {
    // Incrementar intentos fallidos
    const intentos = user.intentosLogin + 1;
    
    if (intentos >= MAX_LOGIN_ATTEMPTS) {
      // Bloquear cuenta
      await db.user.update({
        where: { id: user.id },
        data: {
          intentosLogin: intentos,
          bloqueadoHasta: new Date(Date.now() + LOCKOUT_DURATION_MS),
        },
      });
      
      // Registrar en logs
      await logAction(user.id, 'login_blocked', 'User', user.id, null, null, ip, userAgent);
      
      return { 
        success: false, 
        error: 'Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.' 
      };
    }
    
    await db.user.update({
      where: { id: user.id },
      data: { intentosLogin: intentos },
    });
    
    const intentosRestantes = MAX_LOGIN_ATTEMPTS - intentos;
    return { 
      success: false, 
      error: `Credenciales inválidas. ${intentosRestantes} intentos restantes.` 
    };
  }
  
  // Login exitoso - resetear intentos
  await db.user.update({
    where: { id: user.id },
    data: {
      intentosLogin: 0,
      bloqueadoHasta: null,
      ultimoAcceso: new Date(),
    },
  });
  
  // Crear sesión
  const token = await createSession(user.id, userAgent, ip);
  
  // Registrar en logs
  await logAction(user.id, 'login', 'User', user.id, null, null, ip, userAgent);
  
  return { success: true, token };
}

// ============================================
// LOGS DE AUDITORÍA
// ============================================

/**
 * Registra una acción en el log de auditoría
 */
export async function logAction(
  userId: string | null,
  accion: string,
  entidad: string,
  entidadId?: string | null,
  datosAntes?: any,
  datosDespues?: any,
  ip?: string,
  userAgent?: string
): Promise<void> {
  try {
    await db.logAuditoria.create({
      data: {
        userId,
        accion,
        entidad,
        entidadId,
        datosAntes: datosAntes ? JSON.stringify(datosAntes) : null,
        datosDespues: datosDespues ? JSON.stringify(datosDespues) : null,
        ip,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Error logging action:', error);
  }
}

// ============================================
// GESTIÓN DE USUARIOS
// ============================================

/**
 * Obtiene un usuario por ID (con datos desencriptados)
 */
export async function getUserById(id: string) {
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      nombre: true,
      apellido: true,
      rut: true,
      telefono: true,
      direccion: true,
      rol: true,
      permisos: true,
      activo: true,
      emailVerificado: true,
      ultimoAcceso: true,
      twoFactorEnabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  
  if (!user) return null;
  
  // Desencriptar datos sensibles
  return {
    ...user,
    telefono: user.telefono ? decrypt(user.telefono) : null,
    direccion: user.direccion ? decrypt(user.direccion) : null,
  };
}

/**
 * Crea un nuevo usuario
 */
export async function createUser(data: {
  email: string;
  nombre: string;
  apellido?: string;
  password: string;
  rut?: string;
  telefono?: string;
  direccion?: string;
  rol?: string;
  creadoPor?: string;
}) {
  // Verificar si el email ya existe
  const existing = await db.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });
  
  if (existing) {
    throw new Error('El email ya está registrado');
  }
  
  // Hashear contraseña
  const hashedPassword = await hashPassword(data.password);
  
  // Encriptar datos sensibles
  const encryptedTelefono = data.telefono ? encrypt(data.telefono) : null;
  const encryptedDireccion = data.direccion ? encrypt(data.direccion) : null;
  
  const user = await db.user.create({
    data: {
      email: data.email.toLowerCase(),
      nombre: data.nombre,
      apellido: data.apellido,
      password: hashedPassword,
      rut: data.rut,
      telefono: encryptedTelefono,
      direccion: encryptedDireccion,
      rol: data.rol || 'usuario',
      creadoPor: data.creadoPor,
    },
  });
  
  // Registrar en logs
  await logAction(data.creadoPor || null, 'create', 'User', user.id, null, { 
    email: user.email, 
    nombre: user.nombre, 
    rol: user.rol 
  });
  
  return user;
}

/**
 * Actualiza un usuario
 */
export async function updateUser(
  id: string, 
  data: Partial<{
    nombre: string;
    apellido: string;
    rut: string;
    telefono: string;
    direccion: string;
    rol: string;
    activo: boolean;
    password: string;
  }>,
  updatedBy?: string
) {
  const userBefore = await db.user.findUnique({ where: { id } });
  
  const updateData: any = { ...data };
  
  // Encriptar datos sensibles si vienen en la actualización
  if (data.telefono !== undefined) {
    updateData.telefono = data.telefono ? encrypt(data.telefono) : null;
  }
  if (data.direccion !== undefined) {
    updateData.direccion = data.direccion ? encrypt(data.direccion) : null;
  }
  
  // Hashear contraseña si viene
  if (data.password) {
    updateData.password = await hashPassword(data.password);
  }
  
  const user = await db.user.update({
    where: { id },
    data: updateData,
  });
  
  // Registrar en logs
  await logAction(updatedBy || null, 'update', 'User', id, userBefore, updateData);
  
  return user;
}

/**
 * Elimina un usuario (soft delete)
 */
export async function deleteUser(id: string, deletedBy?: string) {
  const user = await db.user.update({
    where: { id },
    data: { activo: false },
  });
  
  // Registrar en logs
  await logAction(deletedBy || null, 'delete', 'User', id, user, null);
  
  return user;
}

// ============================================
// VERIFICACIÓN DE PERMISOS
// ============================================

export type Rol = 'admin' | 'supervisor' | 'usuario' | 'personal' | 'auditor' | 'guardia';

export const PERMISOS_POR_ROL: Record<Rol, string[]> = {
  admin: [
    // Acceso total
    'usuarios.ver', 'usuarios.crear', 'usuarios.editar', 'usuarios.eliminar',
    'residentes.ver', 'residentes.crear', 'residentes.editar', 'residentes.eliminar',
    'propiedades.ver', 'propiedades.crear', 'propiedades.editar', 'propiedades.eliminar',
    'personal.ver', 'personal.crear', 'personal.editar', 'personal.eliminar',
    'proveedores.ver', 'proveedores.crear', 'proveedores.editar', 'proveedores.eliminar',
    'ots.ver', 'ots.crear', 'ots.editar', 'ots.eliminar', 'ots.aprobar',
    'proyectos.ver', 'proyectos.crear', 'proyectos.editar', 'proyectos.eliminar',
    'gastos.ver', 'gastos.crear', 'gastos.editar', 'gastos.eliminar', 'gastos.aprobar',
    'inspecciones.ver', 'inspecciones.crear', 'inspecciones.editar', 'inspecciones.eliminar',
    'activos.ver', 'activos.crear', 'activos.editar', 'activos.eliminar',
    'catalogos.ver', 'catalogos.crear', 'catalogos.editar', 'catalogos.eliminar',
    'centros-costo.ver', 'centros-costo.crear', 'centros-costo.editar', 'centros-costo.eliminar',
    'reportes.ver', 'reportes.exportar',
    'configuracion.ver', 'configuracion.editar',
    'logs.ver',
    'inventario.ver', 'inventario.editar',
    // Rondas (Control de Rondas)
    'rondas.ver', 'rondas.registrar', 'rondas.crear', 'rondas.editar', 'rondas.eliminar',
  ],
  supervisor: [
    // Acceso de supervisión
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
    // Rondas (Control de Rondas)
    'rondas.ver', 'rondas.registrar',
  ],
  usuario: [
    // Acceso básico
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
    // Solo puede ver OT y modificar progreso
    'ots.ver', 'ots.progreso',
  ],
  auditor: [
    // Solo lectura para auditoría
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
    'reportes.ver',
    'logs.ver',
    'inventario.ver',
    // Rondas: solo lectura
    'rondas.ver',
  ],
  guardia: [
    // GUARDIA — Solo puede ver el módulo de Rondas y registrar ronda escaneando QR
    'rondas.ver',
    'rondas.registrar',
  ],
};

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function hasPermission(rol: string, permiso: string): boolean {
  const permisos = PERMISOS_POR_ROL[rol as Rol] || [];
  return permisos.includes(permiso);
}

/**
 * Obtiene todos los permisos de un rol
 */
export function getPermissions(rol: string): string[] {
  return PERMISOS_POR_ROL[rol as Rol] || [];
}
