import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

/**
 * ENDPOINT TEMPORAL: Carga 26 materiales + 15 herramientas adicionales.
 * Solo admin. Hace upsert por código.
 */
export async function POST() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.user.rol !== 'admin') return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const imagenes = {
    ladrillo_novol: 'https://sfile.chatglm.cn/images-ppt/dd313b7a22f3.jpg',
    viga_madera_pino: 'https://sfile.chatglm.cn/images-ppt/218df67c92b9.jpg',
    tabla_osa: 'https://sfile.chatglm.cn/images-ppt/ab43cacab3b0.jpg',
    placa_yeso: 'https://sfile.chatglm.cn/images-ppt/0cf0e4cfeab5.jpg',
    perfileria_metal: 'https://sfile.chatglm.cn/images-ppt/f245422a9e97.jpg',
    masilla_pared: 'https://sfile.chatglm.cn/images-ppt/4c8b42093a24.png',
    cinta_paper: 'https://sfile.chatglm.cn/images-ppt/5faa36fcac29.jpg',
    tubo_cobre: 'https://sfile.chatglm.cn/images-ppt/875d030b51e0.jpg',
    flexible_cobre: 'https://sfile.chatglm.cn/images-ppt/58c9c8447d46.jpeg',
    teflon: 'https://sfile.chatglm.cn/images-ppt/def999d38d0d.jpg',
    sifon_lavatorio: 'https://sfile.chatglm.cn/images-ppt/718b336992e2.jpg',
    griferia_lavamanos: 'https://sfile.chatglm.cn/images-ppt/893cf4f7ac60.jpg',
    termica_16a: 'https://sfile.chatglm.cn/images-ppt/78cb93b669c3.png',
    disyuntor_diferencial: 'https://sfile.chatglm.cn/images-ppt/51cd5431345b.jpg',
    caja_embutir: 'https://sfile.chatglm.cn/images-ppt/aede5005c644.jpg',
    tubo_corrugado: 'https://sfile.chatglm.cn/images-ppt/ccb387bfab6a.jpg',
    bornera_wago: 'https://sfile.chatglm.cn/images-ppt/da40908cdaa0.jpg',
    imprimador_pared: 'https://sfile.chatglm.cn/images-ppt/c27d5dbdc0f2.png',
    masilla_pared_ra: 'https://sfile.chatglm.cn/images-ppt/56ecfc870536.jpeg',
    pintura_esmalte_sintetico: 'https://sfile.chatglm.cn/images-ppt/d94bf44ab1fe.png',
    limpiador_pinceles: 'https://sfile.chatglm.cn/images-ppt/6a6e4a1e2d2c.jpg',
    tierra_hoja: 'https://sfile.chatglm.cn/images-ppt/98a28c0c9599.jpg',
    mulch_corteza: 'https://sfile.chatglm.cn/images-ppt/65bbfe6ca072.jpg',
    pala_trasplantador: 'https://sfile.chatglm.cn/images-ppt/407f8ed5a455.jpg',
    trapeador_escurridor: 'https://sfile.chatglm.cn/images-ppt/89f3cf714d2b.jpeg',
    limpiavidrios_500: 'https://sfile.chatglm.cn/images-ppt/f4566a2c3566.png',
    desinfectante_piso: 'https://sfile.chatglm.cn/images-ppt/f2fd33694cf1.jpg',
    set_llaves_boca: 'https://sfile.chatglm.cn/images-ppt/cb2ef5dbc001.jpg',
    set_cortafrío: 'https://sfile.chatglm.cn/images-ppt/4352568d7d4c.jpg',
    pala_cuadrada: 'https://sfile.chatglm.cn/images-ppt/407f8ed5a455.jpg',
    combo_goma: 'https://sfile.chatglm.cn/images-ppt/f8565fdedc44.jpg',
    nivel_laser: 'https://sfile.chatglm.cn/images-ppt/d29e84ebd857.jpg',
    teodolito: 'https://sfile.chatglm.cn/images-ppt/d29e84ebd857.jpg',
    sierra_mesa: 'https://sfile.chatglm.cn/images-ppt/2f871df14111.jpg',
    router_carpinteria: 'https://sfile.chatglm.cn/images-ppt/f86ea17c3432.png',
    trompo_mezcla: 'https://sfile.chatglm.cn/images-ppt/0e4c42f91fb0.jpg',
    andamio_movil: 'https://sfile.chatglm.cn/images-ppt/0e4c42f91fb0.jpg',
    compresor_portatil: 'https://sfile.chatglm.cn/images-ppt/0e4c42f91fb0.jpg',
    caladora_bateria: 'https://sfile.chatglm.cn/images-ppt/2f871df14111.jpg',
    lima_metal: 'https://sfile.chatglm.cn/images-ppt/cb2ef5dbc001.jpg',
    pala_carbonera: 'https://sfile.chatglm.cn/images-ppt/4352568d7d4c.jpg',
    tijera_hojalata: 'https://sfile.chatglm.cn/images-ppt/2164415eea8c.png',
  }

  const materiales = [
    // === CONSTRUCCIÓN ADICIONALES ===
    { codigo: 'MAT-CONST-09', nombre: 'Ladrillo Novol', categoria: 'Ferretería', unidad: 'unidad', precio: 890, stockMin: 100, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: imagenes.ladrillo_novol },
    { codigo: 'MAT-CONST-10', nombre: 'Viga Madera Pino 2x4" x 3m', categoria: 'Ferretería', unidad: 'unidad', precio: 8990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Easy', imagenUrl: imagenes.viga_madera_pino },
    { codigo: 'MAT-CONST-11', nombre: 'Placa OSB 9mm 244x122cm', categoria: 'Ferretería', unidad: 'placa', precio: 14990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: imagenes.tabla_osa },
    { codigo: 'MAT-CONST-12', nombre: 'Placa Yeso Cartón 12mm Standard', categoria: 'Ferretería', unidad: 'placa', precio: 6990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Easy', imagenUrl: imagenes.placa_yeso },
    { codigo: 'MAT-CONST-13', nombre: 'Perfilería Metal Placa Yeso 3m', categoria: 'Ferretería', unidad: 'unidad', precio: 3490, stockMin: 20, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: imagenes.perfileria_metal },
    { codigo: 'MAT-CONST-14', nombre: 'Masilla Pared 5kg', categoria: 'Pintura', unidad: 'saco', precio: 7990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Easy', imagenUrl: imagenes.masilla_pared },
    { codigo: 'MAT-CONST-15', nombre: 'Cinta Junta Papel 90m', categoria: 'Pintura', unidad: 'rollo', precio: 1990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: imagenes.cinta_paper },

    // === FONTANERÍA ADICIONALES ===
    { codigo: 'MAT-FONT-11', nombre: 'Tubo Cobre 1/2" x 1m', categoria: 'Fontanería', unidad: 'metro', precio: 3990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: imagenes.tubo_cobre },
    { codigo: 'MAT-FONT-12', nombre: 'Flexible Cobre 1/2" 30cm', categoria: 'Fontanería', unidad: 'unidad', precio: 2490, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Easy', imagenUrl: imagenes.flexible_cobre },
    { codigo: 'MAT-FONT-13', nombre: 'Cinta Teflón 12mm x 12m', categoria: 'Fontanería', unidad: 'rollo', precio: 390, stockMin: 30, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: imagenes.teflon },
    { codigo: 'MAT-FONT-14', nombre: 'Sifón Lavatorio Cromado', categoria: 'Fontanería', unidad: 'unidad', precio: 4990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Easy', imagenUrl: imagenes.sifon_lavatorio },
    { codigo: 'MAT-FONT-15', nombre: 'Grifería Lavamanos Cromada', categoria: 'Fontanería', unidad: 'unidad', precio: 24990, stockMin: 3, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: imagenes.griferia_lavamanos },

    // === ELÉCTRICO ADICIONALES ===
    { codigo: 'MAT-ELEC-09', nombre: 'Termomagnética 16A Bipolar', categoria: 'Eléctrico', unidad: 'unidad', precio: 6990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: imagenes.termica_16a },
    { codigo: 'MAT-ELEC-10', nombre: 'Disyuntor Diferencial 25A', categoria: 'Eléctrico', unidad: 'unidad', precio: 18990, stockMin: 3, ubicacion: 'Bodega Central', fuente: 'Easy', imagenUrl: imagenes.disyuntor_diferencial },
    { codigo: 'MAT-ELEC-11', nombre: 'Caja Embutir Plástico', categoria: 'Eléctrico', unidad: 'unidad', precio: 290, stockMin: 50, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: imagenes.caja_embutir },
    { codigo: 'MAT-ELEC-12', nombre: 'Tubo Corrugado 25mm x 50m', categoria: 'Eléctrico', unidad: 'rollo', precio: 7990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Easy', imagenUrl: imagenes.tubo_corrugado },
    { codigo: 'MAT-ELEC-13', nombre: 'Bornera WAGO 221 (10 unidades)', categoria: 'Eléctrico', unidad: 'paquete', precio: 4990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: imagenes.bornera_wago },

    // === PINTURA ADICIONALES ===
    { codigo: 'MAT-PINT-09', nombre: 'Imprimador Pared 4 Litros', categoria: 'Pintura', unidad: 'galón', precio: 9990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: imagenes.imprimador_pared },
    { codigo: 'MAT-PINT-10', nombre: 'Masilla Reparación Pared 1kg', categoria: 'Pintura', unidad: 'tubo', precio: 3490, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Easy', imagenUrl: imagenes.masilla_pared_ra },
    { codigo: 'MAT-PINT-11', nombre: 'Esmalte Sintético 4 Litros', categoria: 'Pintura', unidad: 'galón', precio: 18990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: imagenes.pintura_esmalte_sintetico },
    { codigo: 'MAT-PINT-12', nombre: 'Limpiador Pinceles Thinner 1L', categoria: 'Pintura', unidad: 'litro', precio: 1990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Easy', imagenUrl: imagenes.limpiador_pinceles },

    // === JARDINERÍA ADICIONALES ===
    { codigo: 'MAT-JARD-07', nombre: 'Tierra de Hoja 40 Litros', categoria: 'Jardinería', unidad: 'saco', precio: 6990, stockMin: 10, ubicacion: 'Bodega Jardinería', fuente: 'Sodimac', imagenUrl: imagenes.tierra_hoja },
    { codigo: 'MAT-JARD-08', nombre: 'Mulch Corteza Pino 50L', categoria: 'Jardinería', unidad: 'saco', precio: 9990, stockMin: 5, ubicacion: 'Bodega Jardinería', fuente: 'Easy', imagenUrl: imagenes.mulch_corteza },
    { codigo: 'MAT-JARD-09', nombre: 'Pala Trasplantador', categoria: 'Jardinería', unidad: 'unidad', precio: 4990, stockMin: 3, ubicacion: 'Bodega Jardinería', fuente: 'Sodimac', imagenUrl: imagenes.pala_trasplantador },

    // === LIMPIEZA ADICIONALES ===
    { codigo: 'MAT-LIMP-09', nombre: 'Trapeador Escurridor', categoria: 'Limpieza', unidad: 'unidad', precio: 5990, stockMin: 5, ubicacion: 'Bodega Limpieza', fuente: 'Easy', imagenUrl: imagenes.trapeador_escurridor },
    { codigo: 'MAT-LIMP-10', nombre: 'Limpiavidrios 500ml', categoria: 'Limpieza', unidad: 'unidad', precio: 1290, stockMin: 10, ubicacion: 'Bodega Limpieza', fuente: 'Sodimac', imagenUrl: imagenes.limpiavidrios_500 },
    { codigo: 'MAT-LIMP-11', nombre: 'Desinfectante Pisos 1L', categoria: 'Limpieza', unidad: 'litro', precio: 1990, stockMin: 10, ubicacion: 'Bodega Limpieza', fuente: 'Easy', imagenUrl: imagenes.desinfectante_piso },
  ]

  const herramientas = [
    // === HERRAMIENTAS MANUALES ADICIONALES ===
    { codigo: 'HERR-301', nombre: 'Set Llaves Boca Fija 8 piezas', marca: 'Truper', cantidad: 1, estado: 'Bueno', valor: 29990, ubicacion: 'Pañol', fuente: 'Sodimac', imagenUrl: imagenes.set_llaves_boca },
    { codigo: 'HERR-302', nombre: 'Cortafrío Ajustable 12"', marca: 'Truper', cantidad: 2, estado: 'Bueno', valor: 8990, ubicacion: 'Pañol', fuente: 'Easy', imagenUrl: imagenes.set_cortafrío },
    { codigo: 'HERR-303', nombre: 'Pala Cuadrada Mango Fibra', marca: 'Truper', cantidad: 2, estado: 'Bueno', valor: 14990, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenUrl: imagenes.pala_cuadrada },
    { codigo: 'HERR-304', nombre: 'Combo Goma 1 libra', marca: 'Stanley', cantidad: 3, estado: 'Bueno', valor: 6990, ubicacion: 'Pañol', fuente: 'Easy', imagenUrl: imagenes.combo_goma },
    { codigo: 'HERR-305', nombre: 'Nivel Láser Verde', marca: 'Bosch', cantidad: 1, estado: 'Bueno', valor: 89990, ubicacion: 'Pañol', fuente: 'Sodimac', imagenUrl: imagenes.nivel_laser },
    { codigo: 'HERR-306', nombre: 'Teodolito Óptico', marca: 'Topcon', cantidad: 1, estado: 'Bueno', valor: 599990, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenUrl: imagenes.teodolito },

    // === HERRAMIENTAS ELÉCTRICAS ADICIONALES ===
    { codigo: 'HERR-307', nombre: 'Sierra Mesa 10"', marca: 'Makita', cantidad: 1, estado: 'Bueno', valor: 249990, ubicacion: 'Carpintería', fuente: 'Sodimac', imagenUrl: imagenes.sierra_mesa },
    { codigo: 'HERR-308', nombre: 'Router Carpintería 2200W', marca: 'Makita', cantidad: 1, estado: 'Bueno', valor: 159990, ubicacion: 'Carpintería', fuente: 'Easy', imagenUrl: imagenes.router_carpinteria },
    { codigo: 'HERR-309', nombre: 'Trompo Mezcla Cemento 350L', marca: 'Generico', cantidad: 1, estado: 'Bueno', valor: 299990, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenUrl: imagenes.trompo_mezcla },
    { codigo: 'HERR-310', nombre: 'Andamio Móvil 5 metros', marca: 'Generico', cantidad: 2, estado: 'Bueno', valor: 199990, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenUrl: imagenes.andamio_movil },
    { codigo: 'HERR-311', nombre: 'Compresor Portátil 50L', marca: 'Bosch', cantidad: 1, estado: 'Bueno', valor: 149990, ubicacion: 'Pañol', fuente: 'Sodimac', imagenUrl: imagenes.compresor_portatil },
    { codigo: 'HERR-312', nombre: 'Caladora Batería 18V', marca: 'Black&Decker', cantidad: 1, estado: 'Bueno', valor: 69990, ubicacion: 'Pañol', fuente: 'Easy', imagenUrl: imagenes.caladora_bateria },

    // === HERRAMIENTAS MANUALES ESPECIALIZADAS ===
    { codigo: 'HERR-313', nombre: 'Juego Limas Metal 5 piezas', marca: 'Truper', cantidad: 1, estado: 'Bueno', valor: 12990, ubicacion: 'Pañol', fuente: 'Sodimac', imagenUrl: imagenes.lima_metal },
    { codigo: 'HERR-314', nombre: 'Pala Carbonera Mango Fibra', marca: 'Truper', cantidad: 2, estado: 'Bueno', valor: 13990, ubicacion: 'Bodega Central', fuente: 'Easy', imagenUrl: imagenes.pala_carbonera },
    { codigo: 'HERR-315', nombre: 'Tijera Hojalata Recta', marca: 'Truper', cantidad: 2, estado: 'Bueno', valor: 8990, ubicacion: 'Pañol', fuente: 'Sodimac', imagenUrl: imagenes.tijera_hojalata },
  ]

  try {
    const resultados = { materiales: { creados: 0, actualizados: 0 }, herramientas: { creados: 0, actualizados: 0 } }

    for (const m of materiales) {
      const existente = m.codigo ? await db.catMaterial.findUnique({ where: { codigo: m.codigo } }) : null
      if (existente) {
        await db.catMaterial.update({
          where: { id: existente.id },
          data: {
            nombre: m.nombre, precioUnit: m.precio, categoria: m.categoria, unidad: m.unidad,
            ubicacion: m.ubicacion, imagenUrl: m.imagenUrl, fuente: m.fuente,
            ultimaActPrecio: new Date(), stockMinimo: m.stockMin,
          },
        })
        resultados.materiales.actualizados++
      } else {
        await db.catMaterial.create({
          data: {
            codigo: m.codigo, nombre: m.nombre, precioUnit: m.precio, categoria: m.categoria,
            unidad: m.unidad, ubicacion: m.ubicacion, stockMinimo: m.stockMin, stockActual: 0,
            imagenUrl: m.imagenUrl, fuente: m.fuente, ultimaActPrecio: new Date(),
          },
        })
        resultados.materiales.creados++
      }
    }

    for (const h of herramientas) {
      const existente = h.codigo ? await db.catHerramienta.findUnique({ where: { codigo: h.codigo } }) : null
      if (existente) {
        await db.catHerramienta.update({
          where: { id: existente.id },
          data: {
            nombre: h.nombre, marca: h.marca || null, cantidad: h.cantidad, estado: h.estado,
            valorReposicion: h.valor, ubicacion: h.ubicacion, imagenUrl: h.imagenUrl,
            fuente: h.fuente, ultimaActPrecio: new Date(),
          },
        })
        resultados.herramientas.actualizados++
      } else {
        await db.catHerramienta.create({
          data: {
            codigo: h.codigo, nombre: h.nombre, marca: h.marca || null, cantidad: h.cantidad,
            estado: h.estado, valorReposicion: h.valor, ubicacion: h.ubicacion,
            imagenUrl: h.imagenUrl, fuente: h.fuente, ultimaActPrecio: new Date(),
          },
        })
        resultados.herramientas.creados++
      }
    }

    return NextResponse.json({
      success: true,
      mensaje: 'Catálogo extendido cargado',
      resultados,
      total_materiales_nuevos: materiales.length,
      total_herramientas_nuevas: herramientas.length,
    })
  } catch (error) {
    console.error('Error cargando catálogo extendido:', error)
    return NextResponse.json({ error: 'Error', detalle: String(error) }, { status: 500 })
  }
}
