import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all proyectos
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    
    const proyectos = await db.proyecto.findMany({
      where: search ? {
        OR: [
          { nombre: { contains: search } },
          { estado: { contains: search } },
          { categoria: { contains: search } },
        ]
      } : undefined,
      include: {
        materiales: true,
        herramientas: true,
        tareas: true,
        personal: true,
        documentos: true,
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(proyectos)
  } catch (error) {
    console.error('Error fetching proyectos:', error)
    return NextResponse.json({ error: 'Error fetching proyectos' }, { status: 500 })
  }
}

// POST - Create new proyecto
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Extract resources from data
    const { materiales, herramientas, tareas, personal, documentos, ...proyectoData } = data
    
    const proyecto = await db.proyecto.create({
      data: {
        nombre: proyectoData.nombre,
        categoria: proyectoData.categoria || 'General',
        estado: proyectoData.estado || 'Planificado',
        ubicacion: proyectoData.ubicacion || null,
        fechaInicio: proyectoData.fechaInicio || null,
        fechaFin: proyectoData.fechaFin || null,
        presProg: parseFloat(proyectoData.presProg) || 0,
        presUsado: parseFloat(proyectoData.presUsado) || 0,
        avance: parseInt(proyectoData.avance) || 0,
        descripcion: proyectoData.descripcion || null,
        notas: proyectoData.notas || null,
        
        // Create related resources
        materiales: materiales && materiales.length > 0 ? {
          create: materiales.map((m: { descripcion: string; cantidad: number; unidad: string; precioUnit: number; total: number }) => ({
            descripcion: m.descripcion,
            cantidad: parseFloat(String(m.cantidad)) || 1,
            unidad: m.unidad || 'unidad',
            precioUnit: parseFloat(String(m.precioUnit)) || 0,
            total: parseFloat(String(m.total)) || 0,
          }))
        } : undefined,
        
        herramientas: herramientas && herramientas.length > 0 ? {
          create: herramientas.map((h: { nombre: string; cantidad: number }) => ({
            nombre: h.nombre,
            cantidad: parseInt(String(h.cantidad)) || 1,
          }))
        } : undefined,
        
        tareas: tareas && tareas.length > 0 ? {
          create: tareas.map((t: { descripcion: string; cantidad: number; estado: string }) => ({
            descripcion: t.descripcion,
            cantidad: parseInt(String(t.cantidad)) || 1,
            estado: t.estado || 'Pendiente',
          }))
        } : undefined,
        
        personal: personal && personal.length > 0 ? {
          create: personal.map((p: { nombre: string; tipo: string; cantidad: number; precioUnit: number; total: number }) => ({
            nombre: p.nombre,
            tipo: p.tipo || 'Interno',
            cantidad: parseInt(String(p.cantidad)) || 1,
            precioUnit: parseFloat(String(p.precioUnit)) || 0,
            total: parseFloat(String(p.total)) || 0,
          }))
        } : undefined,
        
        documentos: documentos && documentos.length > 0 ? {
          create: documentos.map((d: { nombre: string; tipo: string; descripcion: string; archivo: string; fechaDoc: string }) => ({
            nombre: d.nombre,
            tipo: d.tipo || 'cotizacion',
            descripcion: d.descripcion || null,
            archivo: d.archivo,
            fechaDoc: d.fechaDoc || null,
          }))
        } : undefined,
      },
      include: {
        materiales: true,
        herramientas: true,
        tareas: true,
        personal: true,
        documentos: true,
      }
    })
    
    return NextResponse.json(proyecto)
  } catch (error) {
    console.error('Error creating proyecto:', error)
    return NextResponse.json({ error: 'Error creating proyecto' }, { status: 500 })
  }
}
