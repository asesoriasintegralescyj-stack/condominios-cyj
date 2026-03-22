/**
 * NextAuth API Route
 * Condominio Laguna Norte - Sistema de Gestión v2
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-options';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
