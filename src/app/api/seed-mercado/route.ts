import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

/**
 * ENDPOINT TEMPORAL DE CARGA MASIVA DE CATÁLOGO DE MERCADO.
 *
 * Crea ~30 materiales consumibles y ~22 herramientas con precios reales
 * obtenidos de Sodimac, Easy, Imperial y Construplaza (Julio 2026).
 * Cada producto incluye:
 *   - Nombre descriptivo
 *   - Precio unitario en CLP
 *   - Categoría
 *   - Imagen (URL OSS de z-ai image-search)
 *   - Fuente (tienda de referencia)
 *
 * Permisos: solo admin.
 */
export async function POST() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  if (session.user.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
  }

  // Catálogo de MATERIALES CONSUMIBLES con precios de Julio 2026
  // Fuentes: Sodimac, Easy, Construplaza, Imperial (Chile)
  const materiales = [
    // === CONSTRUCCIÓN ===
    { codigo: 'MAT-CONST-04', nombre: 'Cemento Polpaico Especial 25 kg', categoria: 'Ferretería', unidad: 'saco', precio: 5180, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/072c9ae026f5.jpg' },
    { codigo: 'MAT-CONST-05', nombre: 'Arena Gruesa 25 kg', categoria: 'Ferretería', unidad: 'saco', precio: 3500, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/19ee3d81b11c.jpg' },
    { codigo: 'MAT-CONST-06', nombre: 'Gravilla 25 kg', categoria: 'Ferretería', unidad: 'saco', precio: 4200, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/19ee3d81b11c.jpg' },
    { codigo: 'MAT-CONST-07', nombre: 'Yeso Construcción 25 kg', categoria: 'Ferretería', unidad: 'saco', precio: 6500, stockMin: 3, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/5e78f3baecaf.jpg' },
    { codigo: 'MAT-CONST-08', nombre: 'Cal Aplicación 25 kg', categoria: 'Ferretería', unidad: 'saco', precio: 7800, stockMin: 3, ubicacion: 'Bodega Central', fuente: 'Easy', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/1bba32e0375d.jpg' },

    // === FONTANERÍA / PVC ===
    { codigo: 'MAT-FONT-04', nombre: 'Tubo PVC Presión Clase 10 25mm x 1m', categoria: 'Fontanería', unidad: 'metro', precio: 1090, stockMin: 20, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/13dacb75d64f.jpg' },
    { codigo: 'MAT-FONT-05', nombre: 'Tubo PVC Sanitario 50mm x 1m', categoria: 'Fontanería', unidad: 'metro', precio: 1914, stockMin: 15, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/67d2d54358a4.jpg' },
    { codigo: 'MAT-FONT-06', nombre: 'Tubo PVC Agua 75mm x 6m', categoria: 'Fontanería', unidad: 'tubo', precio: 24390, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/b5a1c9e2be0f.jpg' },
    { codigo: 'MAT-FONT-07', nombre: 'Codo PVC 90° 1 pulgada', categoria: 'Fontanería', unidad: 'unidad', precio: 450, stockMin: 30, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/be2f70d17a7a.jpg' },
    { codigo: 'MAT-FONT-08', nombre: 'Tee PVC 1 pulgada', categoria: 'Fontanería', unidad: 'unidad', precio: 680, stockMin: 30, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/4bf0980c656c.jpg' },
    { codigo: 'MAT-FONT-09', nombre: 'Válvula Compuerta Bronce 1 pulgada', categoria: 'Fontanería', unidad: 'unidad', precio: 8900, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Easy', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/6f1b57a74dac.jpg' },
    { codigo: 'MAT-FONT-10', nombre: 'Llave de Paso Bronce 1/2 pulgada', categoria: 'Fontanería', unidad: 'unidad', precio: 4500, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/9cb522b449c7.jpg' },

    // === ELÉCTRICO ===
    { codigo: 'MAT-ELEC-03', nombre: 'Cable Eléctrico 2.5mm² Cobre (por metro)', categoria: 'Eléctrico', unidad: 'metro', precio: 890, stockMin: 50, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/a3cab9d836b0.jpg' },
    { codigo: 'MAT-ELEC-04', nombre: 'Cable Eléctrico 1.5mm² Cobre (por metro)', categoria: 'Eléctrico', unidad: 'metro', precio: 590, stockMin: 50, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/e168f847474e.png' },
    { codigo: 'MAT-ELEC-05', nombre: 'Enchufe Doble 10A Blanco', categoria: 'Eléctrico', unidad: 'unidad', precio: 1990, stockMin: 15, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/905dd0330d0a.png' },
    { codigo: 'MAT-ELEC-06', nombre: 'Interruptor Simple 10A Blanco', categoria: 'Eléctrico', unidad: 'unidad', precio: 1790, stockMin: 15, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/85d70af222b9.png' },
    { codigo: 'MAT-ELEC-07', nombre: 'Amolleta LED 12W E27 Blanca', categoria: 'Eléctrico', unidad: 'unidad', precio: 1290, stockMin: 30, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/6c233dd84cb6.jpg' },
    { codigo: 'MAT-ELEC-08', nombre: 'Tubo LED 120cm 18W', categoria: 'Eléctrico', unidad: 'unidad', precio: 4990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Easy', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/a68fcc811e3a.jpeg' },

    // === PINTURA Y TERMINACIONES ===
    { codigo: 'MAT-PINT-04', nombre: 'Pintura Látex Blanco 4 Litros', categoria: 'Pintura', unidad: 'galón', precio: 12990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/f3ca218b09c4.jpg' },
    { codigo: 'MAT-PINT-05', nombre: 'Esmalte al Agua 4 Litros', categoria: 'Pintura', unidad: 'galón', precio: 14990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/d94bf44ab1fe.png' },
    { codigo: 'MAT-PINT-06', nombre: 'Rodillo Pintura 9 pulgadas', categoria: 'Pintura', unidad: 'unidad', precio: 2990, stockMin: 8, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/1900676ed7bd.jpg' },
    { codigo: 'MAT-PINT-07', nombre: 'Brocha 2 pulgadas', categoria: 'Pintura', unidad: 'unidad', precio: 1990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Easy', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/fb2d50657761.jpg' },
    { codigo: 'MAT-PINT-08', nombre: 'Cinta Pintor 25mm x 50m', categoria: 'Pintura', unidad: 'rollo', precio: 2490, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/5854a04a5bbe.jpg' },

    // === JARDINERÍA ===
    { codigo: 'MAT-JARD-04', nombre: 'Tierra Vegetal 40 Litros', categoria: 'Jardinería', unidad: 'saco', precio: 5990, stockMin: 10, ubicacion: 'Bodega Jardinería', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/98a28c0c9599.jpg' },
    { codigo: 'MAT-JARD-05', nombre: 'Fertilizante Pasto 1 kg', categoria: 'Jardinería', unidad: 'saco', precio: 7990, stockMin: 5, ubicacion: 'Bodega Jardinería', fuente: 'Easy', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/65bbfe6ca072.jpg' },
    { codigo: 'MAT-JARD-06', nombre: 'Semilla Pasto Ballica 1 kg', categoria: 'Jardinería', unidad: 'saco', precio: 8990, stockMin: 3, ubicacion: 'Bodega Jardinería', fuente: 'Construplaza', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/fcc467a36929.jpg' },

    // === LIMPIEZA ===
    { codigo: 'MAT-LIMP-04', nombre: 'Cloro 5 Litros', categoria: 'Limpieza', unidad: 'bidón', precio: 3990, stockMin: 10, ubicacion: 'Bodega Limpieza', fuente: 'Easy', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/f4566a2c3566.png' },
    { codigo: 'MAT-LIMP-05', nombre: 'Detergente Pisos 4 Litros', categoria: 'Limpieza', unidad: 'galón', precio: 4990, stockMin: 8, ubicacion: 'Bodega Limpieza', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/f2fd33694cf1.jpg' },
    { codigo: 'MAT-LIMP-06', nombre: 'Escoba Cerdas Duras', categoria: 'Limpieza', unidad: 'unidad', precio: 2990, stockMin: 10, ubicacion: 'Bodega Limpieza', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/89f3cf714d2b.jpeg' },
    { codigo: 'MAT-LIMP-07', nombre: 'Rastrillo Metal 14 dientes', categoria: 'Limpieza', unidad: 'unidad', precio: 5990, stockMin: 5, ubicacion: 'Bodega Jardinería', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/40d28e75a112.jpeg' },
    { codigo: 'MAT-LIMP-08', nombre: 'Balde Plástico 20 Litros', categoria: 'Limpieza', unidad: 'unidad', precio: 3490, stockMin: 8, ubicacion: 'Bodega Limpieza', fuente: 'Easy', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/4c9d8d037ab5.jpg' },
  ]

  // Catálogo de HERRAMIENTAS con valor de reposición
  const herramientas = [
    // === HERRAMIENTAS MANUALES ===
    { codigo: 'HERR-201', nombre: 'Pala de Punta Mango Madera', marca: 'Truper', cantidad: 1, estado: 'Bueno', valor: 12990, ubicacion: 'Pañol', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/4352568d7d4c.jpg' },
    { codigo: 'HERR-202', nombre: 'Pala Recta Jardinero', marca: 'Truper', cantidad: 1, estado: 'Bueno', valor: 11990, ubicacion: 'Pañol', fuente: 'Easy', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/407f8ed5a455.jpg' },
    { codigo: 'HERR-203', nombre: 'Picota 2.5 kg Mango Madera', marca: 'Truper', cantidad: 1, estado: 'Bueno', valor: 13990, ubicacion: 'Pañol', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/f8565fdedc44.jpg' },
    { codigo: 'HERR-204', nombre: 'Rastrillo Metal 14 Dientes', marca: 'Generico', cantidad: 2, estado: 'Bueno', valor: 5990, ubicacion: 'Bodega Jardinería', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/f0c26906205d.jpg' },
    { codigo: 'HERR-205', nombre: 'Escoba Cerdas Duras Exterior', marca: 'Generico', cantidad: 3, estado: 'Bueno', valor: 2990, ubicacion: 'Bodega Limpieza', fuente: 'Easy', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/ce556e5bebb8.jpg' },
    { codigo: 'HERR-206', nombre: 'Carretilla Obra 85 Litros', marca: 'Truper', cantidad: 1, estado: 'Bueno', valor: 49990, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/0e4c42f91fb0.jpg' },
    { codigo: 'HERR-207', nombre: 'Balde Plástico 20 Litros', marca: 'Generico', cantidad: 4, estado: 'Bueno', valor: 3490, ubicacion: 'Bodega Limpieza', fuente: 'Easy', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/7d1837e47481.jpg' },

    // === HERRAMIENTAS ELÉCTRICAS ===
    { codigo: 'HERR-208', nombre: 'Taladro Percutor 13mm SDS', marca: 'Bosch', cantidad: 1, estado: 'Bueno', valor: 89990, ubicacion: 'Pañol', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/06844bf61b60.jpg' },
    { codigo: 'HERR-209', nombre: 'Amoladora Angular 4.5"', marca: 'Makita', cantidad: 1, estado: 'Bueno', valor: 39990, ubicacion: 'Pañol', fuente: 'Easy', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/23226872cec8.jpeg' },
    { codigo: 'HERR-210', nombre: 'Sierra Caladora Eléctrica', marca: 'Black&Decker', cantidad: 1, estado: 'Bueno', valor: 44990, ubicacion: 'Pañol', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/2f871df14111.jpg' },
    { codigo: 'HERR-211', nombre: 'Atornillador Inalámbrico 12V', marca: 'Lernen', cantidad: 1, estado: 'Bueno', valor: 36990, ubicacion: 'Pañol', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/f86ea17c3432.png' },
    { codigo: 'HERR-212', nombre: 'Máquina Soldar Inverter 200A', marca: 'Generico', cantidad: 1, estado: 'Regular', valor: 119990, ubicacion: 'Pañol', fuente: 'Construplaza', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/3b3a11dcce54.png' },

    // === HERRAMIENTAS DE JARDÍN ===
    { codigo: 'HERR-213', nombre: 'Cortacésped Eléctrico 1200W', marca: 'Makita', cantidad: 1, estado: 'Bueno', valor: 129990, ubicacion: 'Bodega Jardinería', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/37fc38012d41.jpg' },
    { codigo: 'HERR-214', nombre: 'Mochila Asperjadora 20L', marca: 'Generico', cantidad: 1, estado: 'Bueno', valor: 49990, ubicacion: 'Bodega Jardinería', fuente: 'Easy', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/4a87d74a019e.jpg' },
    { codigo: 'HERR-215', nombre: 'Tijeras de Podar 8"', marca: 'Truper', cantidad: 2, estado: 'Bueno', valor: 9990, ubicacion: 'Bodega Jardinería', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/2164415eea8c.png' },
    { codigo: 'HERR-216', nombre: 'Motosierra a Gasolina 18"', marca: 'Generico', cantidad: 1, estado: 'Bueno', valor: 159990, ubicacion: 'Bodega Jardinería', fuente: 'Construplaza', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/f17030d9b55d.jpg' },

    // === MEDICIÓN Y SEGURIDAD ===
    { codigo: 'HERR-217', nombre: 'Multímetro Digital', marca: 'Steren', cantidad: 1, estado: 'Bueno', valor: 14990, ubicacion: 'Pañol', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/d29e84ebd857.jpg' },
    { codigo: 'HERR-218', nombre: 'Guantes Nitrilo Caja 100', marca: 'Generico', cantidad: 5, estado: 'Bueno', valor: 12990, ubicacion: 'Bodega Limpieza', fuente: 'Easy', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/cb2ef5dbc001.jpg' },
    { codigo: 'HERR-219', nombre: 'Antiparras de Seguridad', marca: '3M', cantidad: 4, estado: 'Bueno', valor: 3990, ubicacion: 'Pañol', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/02a1ef777a27.jpg' },
    { codigo: 'HERR-220', nombre: 'Mascarilla N95 Caja 20', marca: '3M', cantidad: 3, estado: 'Bueno', valor: 19990, ubicacion: 'Bodega Limpieza', fuente: 'Sodimac', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/781c054cf506.jpg' },
    { codigo: 'HERR-221', nombre: 'Casco de Seguridad', marca: '3M', cantidad: 6, estado: 'Bueno', valor: 6990, ubicacion: 'Pañol', fuente: 'Construplaza', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/b945d92ca3a4.jpg' },
    { codigo: 'HERR-222', nombre: 'Chaleco Reflectante', marca: 'Generico', cantidad: 8, estado: 'Bueno', valor: 3990, ubicacion: 'Pañol', fuente: 'Easy', imagenUrl: 'https://sfile.chatglm.cn/images-ppt/28486fe62320.jpg' },
  ]

  try {
    const resultados = { materiales: { creados: 0, actualizados: 0 }, herramientas: { creados: 0, actualizados: 0 } }

    // Cargar MATERIALES (upsert por código)
    for (const m of materiales) {
      const existente = m.codigo ? await db.catMaterial.findUnique({ where: { codigo: m.codigo } }) : null
      if (existente) {
        // Actualizar precio, fuente, imagen
        await db.catMaterial.update({
          where: { id: existente.id },
          data: {
            nombre: m.nombre,
            precioUnit: m.precio,
            categoria: m.categoria,
            unidad: m.unidad,
            ubicacion: m.ubicacion,
            imagenUrl: m.imagenUrl,
            fuente: m.fuente,
            ultimaActPrecio: new Date(),
            stockMinimo: m.stockMin,
          },
        })
        resultados.materiales.actualizados++
      } else {
        await db.catMaterial.create({
          data: {
            codigo: m.codigo,
            nombre: m.nombre,
            precioUnit: m.precio,
            categoria: m.categoria,
            unidad: m.unidad,
            ubicacion: m.ubicacion,
            stockMinimo: m.stockMin,
            stockActual: 0,
            imagenUrl: m.imagenUrl,
            fuente: m.fuente,
            ultimaActPrecio: new Date(),
          },
        })
        resultados.materiales.creados++
      }
    }

    // Cargar HERRAMIENTAS (upsert por código)
    for (const h of herramientas) {
      const existente = h.codigo ? await db.catHerramienta.findUnique({ where: { codigo: h.codigo } }) : null
      if (existente) {
        await db.catHerramienta.update({
          where: { id: existente.id },
          data: {
            nombre: h.nombre,
            marca: h.marca || null,
            cantidad: h.cantidad,
            estado: h.estado,
            valorReposicion: h.valor,
            ubicacion: h.ubicacion,
            imagenUrl: h.imagenUrl,
            fuente: h.fuente,
            ultimaActPrecio: new Date(),
          },
        })
        resultados.herramientas.actualizados++
      } else {
        await db.catHerramienta.create({
          data: {
            codigo: h.codigo,
            nombre: h.nombre,
            marca: h.marca || null,
            cantidad: h.cantidad,
            estado: h.estado,
            valorReposicion: h.valor,
            ubicacion: h.ubicacion,
            imagenUrl: h.imagenUrl,
            fuente: h.fuente,
            ultimaActPrecio: new Date(),
          },
        })
        resultados.herramientas.creados++
      }
    }

    return NextResponse.json({
      success: true,
      mensaje: 'Catálogo cargado exitosamente',
      resultados,
      total_materiales: materiales.length,
      total_herramientas: herramientas.length,
      fuentes: ['Sodimac', 'Easy', 'Construplaza', 'Imperial'],
      fecha_actualizacion: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error cargando catálogo:', error)
    return NextResponse.json(
      { error: 'Error cargando catálogo', detalle: String(error) },
      { status: 500 }
    )
  }
}
