import { PrismaClient } from '@prisma/client'

// Force reload after database reset - v2
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Always create new client in development to avoid stale connections
export const db = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
