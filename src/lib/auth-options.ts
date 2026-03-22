/**
 * Configuración de NextAuth.js
 * Condominio Laguna Norte - Sistema de Gestión v2
 */

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { 
  authenticateUser, 
  verifySession, 
  deleteSession,
  getUserById 
} from '@/lib/auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      nombre: string;
      apellido?: string | null;
      rol: string;
      permisos: string[];
    };
  }
  
  interface User {
    id: string;
    email: string;
    nombre: string;
    apellido?: string | null;
    rol: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    nombre: string;
    apellido?: string | null;
    rol: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credenciales',
      credentials: {
        email: { 
          label: 'Email', 
          type: 'email', 
          placeholder: 'correo@ejemplo.com' 
        },
        password: { 
          label: 'Contraseña', 
          type: 'password' 
        },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña son requeridos');
        }
        
        const ip = req.headers?.['x-forwarded-for'] || 
                   req.headers?.['x-real-ip'] || 
                   'unknown';
        const userAgent = req.headers?.['user-agent'] || 'unknown';
        
        const result = await authenticateUser(
          credentials.email,
          credentials.password,
          userAgent,
          Array.isArray(ip) ? ip[0] : ip
        );
        
        if (!result.success || !result.token) {
          throw new Error(result.error || 'Error de autenticación');
        }
        
        const userData = await getUserById(
          (await verifySession(result.token))!.userId
        );
        
        if (!userData) {
          throw new Error('Usuario no encontrado');
        }
        
        return {
          id: userData.id,
          email: userData.email,
          nombre: userData.nombre,
          apellido: userData.apellido,
          rol: userData.rol,
          token: result.token,
        };
      },
    }),
  ],
  
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 horas
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.nombre = user.nombre;
        token.apellido = user.apellido;
        token.rol = user.rol;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id,
          email: token.email,
          nombre: token.nombre,
          apellido: token.apellido,
          rol: token.rol,
          permisos: [], // Se cargarán dinámicamente si es necesario
        };
      }
      return session;
    },
  },
  
  events: {
    async signOut({ token }) {
      // Limpiar sesión de la base de datos
      if (token?.id) {
        // La sesión se limpia automáticamente con JWT
      }
    },
  },
  
  debug: process.env.NODE_ENV === 'development',
};
