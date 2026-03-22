import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all cat tareas
export async function GET() {
  try {
    const tareas = await db.catTarea.findMany({
      orderBy: { nombre: 'asc' }
    })
    
    return NextResponse.json(tareas)
  } catch (error) {
    console.error('Error fetching tareas:', error)
    return NextResponse.json({ error: 'Error fetching tareas' }, { status: 500 })
  }
}

// POST - Create new cat tarea
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const tarea = await db.catTarea.create({
      data: {
        nombre: data.nombre,
        categoria: data.categoria || 'General',
      }
    })
    
    return NextResponse.json(tarea)
  } catch (error) {
    console.error('Error creating tarea:', error)
    return NextResponse.json({ error: 'Error creating tarea' }, { status: 500 })
  }
}
