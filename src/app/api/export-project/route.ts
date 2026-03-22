import { NextRequest, NextResponse } from 'next/server'
import archiver from 'archiver'
import { Readable } from 'stream'

// Archivos a excluir
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  '.env',
  '*.db',
  '*.db-journal',
  'backups'
]

export async function GET(request: NextRequest) {
  try {
    const fs = await import('fs')
    const path = await import('path')
    
    const projectRoot = process.cwd()
    
    // Crear un archivo ZIP en memoria
    const chunks: Buffer[] = []
    
    const archive = archiver('zip', { zlib: { level: 9 } })
    
    archive.on('data', (chunk) => {
      chunks.push(chunk)
    })

    const archivePromise = new Promise<Buffer>((resolve, reject) => {
      archive.on('end', () => {
        resolve(Buffer.concat(chunks))
      })
      archive.on('error', reject)
    })

    // Función para verificar si un archivo debe ser excluido
    const shouldExclude = (filePath: string): boolean => {
      return EXCLUDE_PATTERNS.some(pattern => {
        if (pattern.startsWith('*')) {
          return filePath.endsWith(pattern.slice(1))
        }
        return filePath.includes(pattern)
      })
    }

    // Función recursiva para agregar archivos
    const addDirectory = (dirPath: string, zipPath: string) => {
      const items = fs.readdirSync(dirPath)
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item)
        const itemZipPath = path.join(zipPath, item)
        
        if (shouldExclude(fullPath)) continue
        
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory()) {
          if (!shouldExclude(fullPath + '/')) {
            addDirectory(fullPath, itemZipPath)
          }
        } else if (stat.isFile()) {
          // Incluir archivos importantes
          if (
            fullPath.includes('src/') ||
            fullPath.includes('prisma/') ||
            fullPath.includes('public/') ||
            fullPath.includes('lib/') ||
            item === 'package.json' ||
            item === 'tsconfig.json' ||
            item === 'next.config.ts' ||
            item === 'tailwind.config.ts' ||
            item === 'postcss.config.mjs' ||
            item === 'components.json' ||
            item === '.env.example' ||
            item === 'README.md'
          ) {
            archive.file(fullPath, { name: itemZipPath })
          }
        }
      }
    }

    addDirectory(projectRoot, 'cyj-condominios')
    
    // Agregar instrucciones de despliegue
    const instrucciones = `# INSTRUCCIONES DE DESPLIEGUE - ASESORÍAS INTEGRALES CyJ

## 📋 RESUMEN RÁPIDO

Tu sistema está listo para subir a internet GRATIS.
Sigue estos pasos en orden:

1. Crear cuenta en GitHub
2. Subir este código a GitHub
3. Crear base de datos en Neon
4. Conectar Vercel con GitHub y Neon

---

## PASO 1: CREAR CUENTA EN GITHUB

1. Ve a: https://github.com
2. Haz clic en "Sign up" (Registrarse)
3. Ingresa tu email, crea una contraseña y nombre de usuario
4. Verifica tu email
5. ¡Listo! Ya tienes cuenta de GitHub

---

## PASO 2: CREAR UN NUEVO REPOSITORIO

1. En GitHub, haz clic en el botón verde "New" o "+" 
2. Escribe el nombre: "cyj-condominios"
3. Selecciona "Public"
4. Haz clic en "Create repository"

---

## PASO 3: SUBIR LOS ARCHIVOS

OPCIÓN A - Si usas Windows/Mac:
1. Descarga GitHub Desktop desde: https://desktop.github.com
2. Instálalo y abre sesión con tu cuenta
3. Haz clic en "Clone a repository"
4. Pega la URL de tu repositorio (la que termina en .git)
5. Copia TODOS los archivos de este ZIP en la carpeta que se creó
6. En GitHub Desktop escribe un mensaje en "Summary" como "Primer commit"
7. Haz clic en "Commit to main"
8. Haz clic en "Push origin"

OPCIÓN B - Directo en GitHub:
1. En tu repositorio vacío, haz clic en "uploading an existing file"
2. Arrastra TODOS los archivos y carpetas de este ZIP
3. Haz clic en "Commit changes"

---

## PASO 4: CREAR BASE DE DATOS (NEON)

1. Ve a: https://neon.tech
2. Haz clic en "Sign up" y usa tu cuenta de GitHub
3. Después de crear cuenta, haz clic en "Create a project"
4. Nombre: "cyj-condominios"
5. Región: selecciona la más cercana a Chile (AWS US East)
6. Haz clic en "Create project"
7. COPIA la "Connection string" que te muestran
   (Es algo como: postgresql://usuario:contraseña@ep-xxx.neon.tech/neondb?sslmode=require)

---

## PASO 5: CREAR CUENTA EN VERCEL

1. Ve a: https://vercel.com
2. Haz clic en "Sign up"
3. Elige "Continue with GitHub"
4. Autoriza a Vercel a acceder a tu GitHub

---

## PASO 6: DESPLEGAR EN VERCEL

1. En Vercel, haz clic en "Add New" -> "Project"
2. Verás tu repositorio "cyj-condominios"
3. Haz clic en "Import"
4. En "Environment Variables" agrega estas 3 variables:

   VARIABLE 1:
   - Name: DATABASE_URL
   - Value: (pega aquí la conexión de Neon que copiaste)
   
   VARIABLE 2:
   - Name: NEXTAUTH_SECRET
   - Value: cyj-condominios-secreto-2024-produccion
   
   VARIABLE 3:
   - Name: NEXTAUTH_URL
   - Value: https://tudominio.vercel.app
   (Vercel te dará el dominio real después)

5. Haz clic en "Deploy"
6. Espera 2-3 minutos mientras se instala

---

## PASO 7: CONFIGURAR URL FINAL

Después del despliegue:
1. En Vercel ve a "Settings" -> "Environment Variables"
2. Edita NEXTAUTH_URL
3. Cambia el valor por la URL real que te asignó Vercel
4. Haz clic en "Save"
5. Ve a "Deployments" y haz clic en los 3 puntos "..." del último
6. Selecciona "Redeploy"

---

## ¡LISTO!

Tu sistema estará disponible en una URL como:
https://cyj-condominios-xxxx.vercel.app

El usuario por defecto es:
- Email: admin@cyj.cl
- Contraseña: admin123

⚠️ IMPORTANTE: Cambia la contraseña después del primer ingreso

---

## ¿NECESITAS AYUDA?

Si tienes problemas:
1. Revisa que todas las variables de entorno estén bien escritas
2. Verifica que la URL de Neon incluya "?sslmode=require"
3. Asegúrate de haber subido TODOS los archivos

---

Archivos incluidos en este paquete:
- src/ (código fuente de la aplicación)
- prisma/ (esquema de base de datos)
- public/ (imágenes y archivos estáticos)
- lib/ (utilidades)
- package.json (dependencias)
- next.config.ts (configuración)
- Y otros archivos de configuración necesarios
`

    archive.append(instrucciones, { name: 'INSTRUCCIONES.txt' })
    
    archive.finalize()
    
    const buffer = await archivePromise
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="cyj-condominios-completo.zip"',
        'Content-Length': buffer.length.toString()
      }
    })
    
  } catch (error) {
    console.error('Error creating export:', error)
    return NextResponse.json(
      { error: 'Error al crear el archivo de exportación' },
      { status: 500 }
    )
  }
}
