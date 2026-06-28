import { PrismaClient } from '@prisma/client'

// Force reload after database reset - v2
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Singleton correcto: reutilizar la instancia en desarrollo para evitar
// quedarse sin conexiones durante hot-reload de Next.js.
export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
