# Sistema de Gestión de Condominios - Asesorías Integrales CyJ

Sistema integral de administración de condominios construido con Next.js 16, React 19, Prisma 6 y PostgreSQL (Neon).

## Requisitos

- Node.js 18+ (recomendado 20+)
- npm 10+
- Cuenta en [Neon](https://neon.tech) (PostgreSQL)
- Cuenta en [Vercel](https://vercel.com) (deploy)

## Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/asesoriasintegralescyj-stack/condominios-cyj.git
cd condominios-cyj

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores reales

# 4. Generar Prisma Client
npx prisma generate

# 5. Sincronizar schema con la BD
npx prisma db push

# 6. (Opcional) Cargar datos iniciales
npm run db:seed-catalogos

# 7. Ejecutar en desarrollo
npm run dev
```

Abrir http://localhost:3000

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | Sí | URL de conexión a PostgreSQL (Neon) |
| `NEXTAUTH_URL` | Sí | URL de la app (`http://localhost:3000` en dev) |
| `NEXTAUTH_SECRET` | Sí | Secreto JWT. Generar con `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | **Sí en producción** | Clave AES-256-GCM para encriptar datos sensibles |
| `INITIAL_ADMIN_EMAIL` | No | Email del admin inicial (solo dev) |
| `INITIAL_ADMIN_PASSWORD` | No | Password del admin inicial (solo dev, mínimo 8 chars) |

## Scripts disponibles

```bash
npm run dev          # Desarrollo (puerto 3000)
npm run build        # Build de producción
npm run start        # Ejecutar build de producción
npm run lint         # ESLint
npm run db:push      # Sincronizar schema con BD
npm run db:generate  # Generar Prisma Client
npm run db:studio    # Abrir Prisma Studio (GUI de BD)
```

## Deploy en Vercel

1. Sube el repo a GitHub (ya hecho)
2. Conéctalo a Vercel
3. Configura las variables de entorno en Vercel:
   - `DATABASE_URL` (de Neon)
   - `NEXTAUTH_URL` (URL de Vercel, ej: `https://condominios-cyj.vercel.app`)
   - `NEXTAUTH_SECRET` (generar con `openssl rand -base64 32`)
   - `ENCRYPTION_KEY` (generar con `openssl rand -base64 32`)

4. Vercel desplegará automáticamente en cada push a `main`

## Estructura del proyecto

```
src/
├── app/                   # App Router de Next.js 16
│   ├── api/              # ~70 endpoints API REST
│   ├── login/            # Página de login
│   ├── sistema/          # Panel administrativo
│   └── portal/           # Portal de residentes
├── components/           # 32 módulos de UI
│   ├── ui/              # Componentes shadcn/ui
│   └── [modulo]/        # Un componente por módulo funcional
├── lib/                  # Utilidades
│   ├── auth.ts          # Autenticación y encriptación
│   ├── db.ts            # Cliente Prisma
│   ├── with-auth.ts     # HOC para proteger endpoints
│   └── api-helpers.ts   # Helpers de respuestas API
└── hooks/               # React hooks
    └── use-api.ts       # Hooks de TanStack Query
```

## Seguridad

- ✅ Todos los endpoints API requieren autenticación (cookie `condominio_session`)
- ✅ Permisos basados en roles (admin, supervisor, usuario, personal, auditor)
- ✅ Datos sensibles (teléfono, dirección) encriptados con AES-256-GCM
- ✅ Contraseñas hasheadas con bcrypt (12 rounds)
- ✅ Rate limiting en endpoints de autenticación
- ✅ Bloqueo de cuenta tras 5 intentos fallidos (15 min)
- ✅ Endpoints de setup/seed bloqueados en producción
- ✅ Sistema de backups con auth admin

## Licencia

Propietario - Asesorías Integrales CyJ SpA
