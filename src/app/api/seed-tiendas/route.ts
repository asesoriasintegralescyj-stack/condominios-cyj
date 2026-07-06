import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

/**
 * ENDPOINT TEMPORAL: Carga catálogo completo de 5 tiendas.
 * Total: 135 productos (Sodimac 40, Easy 30, Construplaza 25, Imperial 20, MercadoLibre 20)
 * Solo admin. Hace upsert por código.
 */
export async function POST() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.user.rol !== 'admin') return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  const imagenes: Record<string, string> = {
    'sod_cemento_mel': '""',
    'sod_hormigon': '""',
    'sod_cal_mel': '""',
    'sod_tubo_pvc_110': '""',
    'sod_tubo_pvc_32': '""',
    'sod_codo_110_45': '""',
    'sod_tee_110': '""',
    'sod_valvula_esfera': '""',
    'sod_llave_angle': '""',
    'sod_cable_4mm': '""',
    'sod_cable_tierra': '""',
    'sod_bocas_techo': '""',
    'sod_placa_doble': '""',
    'sod_termica_25a': '""',
    'sod_arrancador': '""',
    'sod_pintura_terciopelo': '""',
    'sod_pintura_cielo': '""',
    'sod_barniz_madera': '""',
    'sod_masilla_estuco': '""',
    'sod_disco_corte': '""',
    'sod_disco_diamante': '""',
    'sod_brocha_3': '""',
    'sod_rodillo_18': '""',
    'sod_tornillo_madera': '""',
    'sod_clavo_2pulg': '""',
    'sod_pala_redonda': '""',
    'sod_pico_doble': '""',
    'sod_carretilla_pro': '""',
    'sod_serrucho': '""',
    'sod_martillo_uña': '""',
    'sod_alicate_universal': '""',
    'sod_nivel_aluminio': '""',
    'sod_huincha_5m': '""',
    'sod_taladro_20v': '""',
    'sod_amoladora_7': '""',
    'sod_compresor_50': '""',
    'sod_hidrolavadora': '""',
    'sod_escoba_suave': '""',
    'sod_y_pvc': '""',
    'sod_tornillo_techo': '""',
    'easy_cemento_bio': '""',
    'easy_mortero': '""',
    'easy_yeso_pro': '""',
    'easy_tubo_cobre_22': '""',
    'easy_codo_cobre': '""',
    'easy_tee_cobre': '""',
    'easy_codo_90_110': '""',
    'easy_sifon_pvc': '""',
    'easy_rejilla_lavatorio': '""',
    'easy_llave_punto': '""',
    'easy_cable_6mm': '""',
    'easy_canopia_exterior': '""',
    'easy_portalampara': '""',
    'easy_interruptor_dim': '""',
    'easy_placa_tv': '""',
    'easy_pintura_lux': '""',
    'easy_esmalte_aceite': '""',
    'easy_thinner': '""',
    'easy_masilla_imper': '""',
    'easy_disco_piedra': '""',
    'easy_malla_lija': '""',
    'easy_tornillo_concreto': '""',
    'easy_taco_plastico': '""',
    'easy_pala_cuadrada_pro': '""',
    'easy_pala_pala': '""',
    'easy_martillo_bola': '""',
    'easy_destornillador': '""',
    'easy_serrucho_metal': '""',
    'easy_nivel_tubo': '""',
    'easy_balde_canner': '""',
    'cp_cemento_cbb': '""',
    'cp_cal_cbb': '""',
    'cp_aditivo': '""',
    'cp_hormigon_premez': '""',
    'cp_tubo_estructural': '""',
    'cp_perfil_u': '""',
    'cp_clavo_concreto': '""',
    'cp_alambre': '""',
    'cp_malla_gallinero': '""',
    'cp_malla_ciclon': '""',
    'cp_tornillo_techo_galv': '""',
    'cp_disco_7_klingspor': '""',
    'cp_amoladora_2200w': '""',
    'cp_compresor_100': '""',
    'cp_sierra_caladora_pro': '""',
    'cp_soldadora_inverter': '""',
    'cp_escalera_aluminio': '""',
    'cp_andamio_tubular': '""',
    'cp_carretilla_85': '""',
    'cp_combo_3lb': '""',
    'cp_nivel_magnetico': '""',
    'cp_huincha_acero': '""',
    'cp_caja_herramientas': '""',
    'cp_guantes_cuero': '""',
    'cp_mascarilla_gas': '""',
    'imp_ceramica_45': '""',
    'imp_porcelanato': '""',
    'imp_melamina_blanca': '""',
    'imp_melamina_roble': '""',
    'imp_mdf_18': '""',
    'imp_tirador': '""',
    'imp_bisagra_cuba': '""',
    'imp_corredera': '""',
    'imp_piso_flotante': '""',
    'imp_alfombra_rollo': '""',
    'imp_pintura_melamina': '""',
    'imp_barniz_marino': '""',
    'imp_tornillo_melamina': '""',
    'imp_serrucho_melamina': '""',
    'imp_lima_madera': '""',
    'imp_formon': '""',
    'imp_escuadra_madera': '""',
    'imp_sargento_8': '""',
    'imp_ruteador': '""',
    'imp_caladora_800': '""',
    'ml_taladro_21v': '""',
    'ml_amoladora_20v': '""',
    'ml_sierra_7_1_4': '""',
    'ml_compresor_50': '""',
    'ml_soldadora_mig': '""',
    'ml_generador_3kw': '""',
    'ml_compresor_silencioso': '""',
    'ml_hidrolavadora_1800': '""',
    'ml_cortacesped_gas': '""',
    'ml_motosierra_22': '""',
    'ml_orilladora_4t': '""',
    'ml_sopladora_bat': '""',
    'ml_neumatica_juego': '""',
    'ml_gato_hidraulico': '""',
    'ml_caja_herramientas': '""',
    'ml_multimetro_digital': '""',
    'ml_termometro': '""',
    'ml_detector_estudio': '""',
    'ml_techo_transparente': '""',
    'ml_foco_solar': '""',
  }

  const productos: Array<{
    codigo: string
    nombre: string
    categoria: string
    unidad: string
    precio: number
    stockMin: number
    ubicacion: string
    fuente: string
    imagenKey: string
    esHerramienta: boolean
    marca?: string
  }> = [
    { codigo: 'MAT-SOD-01', nombre: 'Cemento Melón 25 kg', categoria: 'Ferretería', unidad: 'saco', precio: 5390, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_cemento_mel', esHerramienta: false },
    { codigo: 'MAT-SOD-02', nombre: 'Hormigón Premezclado 25 kg', categoria: 'Ferretería', unidad: 'saco', precio: 7990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_hormigon', esHerramienta: false },
    { codigo: 'MAT-SOD-03', nombre: 'Cal Melón 25 kg', categoria: 'Ferretería', unidad: 'saco', precio: 6490, stockMin: 3, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_cal_mel', esHerramienta: false },
    { codigo: 'MAT-SOD-04', nombre: 'Tubo PVC Alcantarillado 110mm x 1m', categoria: 'Fontanería', unidad: 'metro', precio: 2990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_tubo_pvc_110', esHerramienta: false },
    { codigo: 'MAT-SOD-05', nombre: 'Tubo PVC Presión 32mm Clase 10 x 1m', categoria: 'Fontanería', unidad: 'metro', precio: 1890, stockMin: 15, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_tubo_pvc_32', esHerramienta: false },
    { codigo: 'MAT-SOD-06', nombre: 'Codo PVC 110mm 45°', categoria: 'Fontanería', unidad: 'unidad', precio: 1290, stockMin: 30, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_codo_110_45', esHerramienta: false },
    { codigo: 'MAT-SOD-07', nombre: 'Tee PVC 110mm Alcantarillado', categoria: 'Fontanería', unidad: 'unidad', precio: 1590, stockMin: 20, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_tee_110', esHerramienta: false },
    { codigo: 'MAT-SOD-08', nombre: 'Y PVC 110mm Alcantarillado', categoria: 'Fontanería', unidad: 'unidad', precio: 1990, stockMin: 15, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_y_pvc', esHerramienta: false },
    { codigo: 'MAT-SOD-09', nombre: 'Válvula Esfera 1/2" Bronce', categoria: 'Fontanería', unidad: 'unidad', precio: 3490, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_valvula_esfera', esHerramienta: false },
    { codigo: 'MAT-SOD-10', nombre: 'Llave Angular Lavatorio Cromada', categoria: 'Fontanería', unidad: 'unidad', precio: 6990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_llave_angle', esHerramienta: false },
    { codigo: 'MAT-SOD-11', nombre: 'Cable Eléctrico 4mm² Cobre (por metro)', categoria: 'Eléctrico', unidad: 'metro', precio: 1290, stockMin: 50, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_cable_4mm', esHerramienta: false },
    { codigo: 'MAT-SOD-12', nombre: 'Cable Tierra 16mm² Cobre (por metro)', categoria: 'Eléctrico', unidad: 'metro', precio: 1990, stockMin: 30, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_cable_tierra', esHerramienta: false },
    { codigo: 'MAT-SOD-13', nombre: 'Boca de Techo Eléctrica', categoria: 'Eléctrico', unidad: 'unidad', precio: 2490, stockMin: 15, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_bocas_techo', esHerramienta: false },
    { codigo: 'MAT-SOD-14', nombre: 'Placa Doble Enchufe 10A', categoria: 'Eléctrico', unidad: 'unidad', precio: 2290, stockMin: 20, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_placa_doble', esHerramienta: false },
    { codigo: 'MAT-SOD-15', nombre: 'Termomagnética 25A Unipolar', categoria: 'Eléctrico', unidad: 'unidad', precio: 7990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_termica_25a', esHerramienta: false },
    { codigo: 'MAT-SOD-16', nombre: 'Arrancador Fluorescente 36W', categoria: 'Eléctrico', unidad: 'unidad', precio: 990, stockMin: 20, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_arrancador', esHerramienta: false },
    { codigo: 'MAT-SOD-17', nombre: 'Pintura Látex Terciopelo 4L', categoria: 'Pintura', unidad: 'galón', precio: 14990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_pintura_terciopelo', esHerramienta: false },
    { codigo: 'MAT-SOD-18', nombre: 'Pintura Cielo Blanco 4L', categoria: 'Pintura', unidad: 'galón', precio: 11990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_pintura_cielo', esHerramienta: false },
    { codigo: 'MAT-SOD-19', nombre: 'Barniz Madera Transparente 4L', categoria: 'Pintura', unidad: 'galón', precio: 19990, stockMin: 3, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_barniz_madera', esHerramienta: false },
    { codigo: 'MAT-SOD-20', nombre: 'Masilla Estuco 1kg', categoria: 'Pintura', unidad: 'tubo', precio: 3990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_masilla_estuco', esHerramienta: false },
    { codigo: 'MAT-SOD-21', nombre: 'Disco Corte 4.5" Metal', categoria: 'Ferretería', unidad: 'unidad', precio: 1290, stockMin: 30, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_disco_corte', esHerramienta: false },
    { codigo: 'MAT-SOD-22', nombre: 'Disco Diamante 4.5" Concreto', categoria: 'Ferretería', unidad: 'unidad', precio: 8990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_disco_diamante', esHerramienta: false },
    { codigo: 'MAT-SOD-23', nombre: 'Brocha 3" Pulgadas', categoria: 'Pintura', unidad: 'unidad', precio: 2490, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_brocha_3', esHerramienta: false },
    { codigo: 'MAT-SOD-24', nombre: 'Rodillo Pintura 18" Pulgadas', categoria: 'Pintura', unidad: 'unidad', precio: 8990, stockMin: 3, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_rodillo_18', esHerramienta: false },
    { codigo: 'MAT-SOD-25', nombre: 'Tornillos Madera Caja 100', categoria: 'Ferretería', unidad: 'caja', precio: 4990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_tornillo_madera', esHerramienta: false },
    { codigo: 'MAT-SOD-26', nombre: 'Clavos 2" Pulgadas Caja 1kg', categoria: 'Ferretería', unidad: 'caja', precio: 2990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_clavo_2pulg', esHerramienta: false },
    { codigo: 'MAT-SOD-27', nombre: 'Tornillos Techo Caja 1kg', categoria: 'Ferretería', unidad: 'caja', precio: 3490, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_tornillo_techo', esHerramienta: false },
    { codigo: 'HERR-SOD-01', nombre: 'Pala Redonda Mango Fibra', categoria: 'Ferretería', unidad: 'pala', precio: 15990, stockMin: 1, ubicacion: 'Pañol', fuente: 'Sodimac', imagenKey: 'sod_pala_redonda', esHerramienta: true, marca: 'Truper' },
    { codigo: 'HERR-SOD-02', nombre: 'Pico Doble 5 Libras', categoria: 'Ferretería', unidad: 'pico', precio: 13990, stockMin: 1, ubicacion: 'Pañol', fuente: 'Sodimac', imagenKey: 'sod_pico_doble', esHerramienta: true, marca: 'Truper' },
    { codigo: 'HERR-SOD-03', nombre: 'Carretilla Profesional 100L', categoria: 'Ferretería', unidad: 'carretilla', precio: 69990, stockMin: 1, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_carretilla_pro', esHerramienta: true, marca: 'Truper' },
    { codigo: 'HERR-SOD-04', nombre: 'Serrucho Madera 20"', categoria: 'Ferretería', unidad: 'serrucho', precio: 8990, stockMin: 1, ubicacion: 'Pañol', fuente: 'Sodimac', imagenKey: 'sod_serrucho', esHerramienta: true, marca: 'Truper' },
    { codigo: 'HERR-SOD-05', nombre: 'Martillo Uña 16oz', categoria: 'Ferretería', unidad: 'martillo', precio: 5990, stockMin: 2, ubicacion: 'Pañol', fuente: 'Sodimac', imagenKey: 'sod_martillo_uña', esHerramienta: true, marca: 'Stanley' },
    { codigo: 'HERR-SOD-06', nombre: 'Alicate Universal 8"', categoria: 'Ferretería', unidad: 'alicate', precio: 6990, stockMin: 2, ubicacion: 'Pañol', fuente: 'Sodimac', imagenKey: 'sod_alicate_universal', esHerramienta: true, marca: 'Stanley' },
    { codigo: 'HERR-SOD-07', nombre: 'Nivel Aluminio 24"', categoria: 'Ferretería', unidad: 'nivel', precio: 14990, stockMin: 1, ubicacion: 'Pañol', fuente: 'Sodimac', imagenKey: 'sod_nivel_aluminio', esHerramienta: true, marca: 'Stanley' },
    { codigo: 'HERR-SOD-08', nombre: 'Huincha Medir 5m', categoria: 'Ferretería', unidad: 'huincha', precio: 3990, stockMin: 3, ubicacion: 'Pañol', fuente: 'Sodimac', imagenKey: 'sod_huincha_5m', esHerramienta: true, marca: 'Stanley' },
    { codigo: 'HERR-SOD-09', nombre: 'Taladro 20V Batería + Cargador', categoria: 'Ferretería', unidad: 'taladro', precio: 89990, stockMin: 1, ubicacion: 'Pañol', fuente: 'Sodimac', imagenKey: 'sod_taladro_20v', esHerramienta: true, marca: 'DeWalt' },
    { codigo: 'HERR-SOD-10', nombre: 'Amoladora 7" Pulgadas', categoria: 'Ferretería', unidad: 'amoladora', precio: 49990, stockMin: 1, ubicacion: 'Pañol', fuente: 'Sodimac', imagenKey: 'sod_amoladora_7', esHerramienta: true, marca: 'Makita' },
    { codigo: 'HERR-SOD-11', nombre: 'Compresor Aire 50 Litros', categoria: 'Ferretería', unidad: 'compresor', precio: 149990, stockMin: 1, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_compresor_50', esHerramienta: true, marca: 'Bosch' },
    { codigo: 'HERR-SOD-12', nombre: 'Hidrolavadora 1300W', categoria: 'Ferretería', unidad: 'hidrolavadora', precio: 89990, stockMin: 1, ubicacion: 'Bodega Central', fuente: 'Sodimac', imagenKey: 'sod_hidrolavadora', esHerramienta: true, marca: 'Karcher' },
    { codigo: 'MAT-SOD-28', nombre: 'Escoba Cerdas Suaves', categoria: 'Limpieza', unidad: 'unidad', precio: 2990, stockMin: 10, ubicacion: 'Bodega Limpieza', fuente: 'Sodimac', imagenKey: 'sod_escoba_suave', esHerramienta: false },
    { codigo: 'MAT-EASY-01', nombre: 'Cemento Bio Bio 25 kg', categoria: 'Ferretería', unidad: 'saco', precio: 5080, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_cemento_bio', esHerramienta: false },
    { codigo: 'MAT-EASY-02', nombre: 'Mortero Premezclado 25 kg', categoria: 'Ferretería', unidad: 'saco', precio: 6990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_mortero', esHerramienta: false },
    { codigo: 'MAT-EASY-03', nombre: 'Yeso Construcción Pro 25 kg', categoria: 'Ferretería', unidad: 'saco', precio: 6990, stockMin: 3, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_yeso_pro', esHerramienta: false },
    { codigo: 'MAT-EASY-04', nombre: 'Tubo Cobre 22mm x 1m', categoria: 'Fontanería', unidad: 'metro', precio: 4990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_tubo_cobre_22', esHerramienta: false },
    { codigo: 'MAT-EASY-05', nombre: 'Codo Cobre 22mm', categoria: 'Fontanería', unidad: 'unidad', precio: 890, stockMin: 30, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_codo_cobre', esHerramienta: false },
    { codigo: 'MAT-EASY-06', nombre: 'Tee Cobre 22mm', categoria: 'Fontanería', unidad: 'unidad', precio: 1290, stockMin: 20, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_tee_cobre', esHerramienta: false },
    { codigo: 'MAT-EASY-07', nombre: 'Codo PVC 110mm 90°', categoria: 'Fontanería', unidad: 'unidad', precio: 1490, stockMin: 20, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_codo_90_110', esHerramienta: false },
    { codigo: 'MAT-EASY-08', nombre: 'Sifón PVC 40mm', categoria: 'Fontanería', unidad: 'unidad', precio: 2490, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_sifon_pvc', esHerramienta: false },
    { codigo: 'MAT-EASY-09', nombre: 'Rejilla Lavatorio Cromada', categoria: 'Fontanería', unidad: 'unidad', precio: 3990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_rejilla_lavatorio', esHerramienta: false },
    { codigo: 'MAT-EASY-10', nombre: 'Llave Punto Lavatorio Cromada', categoria: 'Fontanería', unidad: 'unidad', precio: 8990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_llave_punto', esHerramienta: false },
    { codigo: 'MAT-EASY-11', nombre: 'Cable Eléctrico 6mm² Cobre (por metro)', categoria: 'Eléctrico', unidad: 'metro', precio: 1890, stockMin: 30, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_cable_6mm', esHerramienta: false },
    { codigo: 'MAT-EASY-12', nombre: 'Canopia Exterior Plástica', categoria: 'Eléctrico', unidad: 'unidad', precio: 4990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_canopia_exterior', esHerramienta: false },
    { codigo: 'MAT-EASY-13', nombre: 'Portalámpara Exterior', categoria: 'Eléctrico', unidad: 'unidad', precio: 1990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_portalampara', esHerramienta: false },
    { codigo: 'MAT-EASY-14', nombre: 'Interruptor Dimmer 600W', categoria: 'Eléctrico', unidad: 'unidad', precio: 9990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_interruptor_dim', esHerramienta: false },
    { codigo: 'MAT-EASY-15', nombre: 'Placa TV Coaxial', categoria: 'Eléctrico', unidad: 'unidad', precio: 2490, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_placa_tv', esHerramienta: false },
    { codigo: 'MAT-EASY-16', nombre: 'Pintura Lux Exterior 4L', categoria: 'Pintura', unidad: 'galón', precio: 13990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_pintura_lux', esHerramienta: false },
    { codigo: 'MAT-EASY-17', nombre: 'Esmalte al Aceite 4L', categoria: 'Pintura', unidad: 'galón', precio: 16990, stockMin: 3, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_esmalte_aceite', esHerramienta: false },
    { codigo: 'MAT-EASY-18', nombre: 'Thinner Estándar 4L', categoria: 'Pintura', unidad: 'galón', precio: 7990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_thinner', esHerramienta: false },
    { codigo: 'MAT-EASY-19', nombre: 'Masilla Impermeabilizante 1kg', categoria: 'Pintura', unidad: 'tubo', precio: 5990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_masilla_imper', esHerramienta: false },
    { codigo: 'MAT-EASY-20', nombre: 'Disco Corte Piedra 4.5"', categoria: 'Ferretería', unidad: 'unidad', precio: 1990, stockMin: 20, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_disco_piedra', esHerramienta: false },
    { codigo: 'MAT-EASY-21', nombre: 'Malla Lija 10 Piezas', categoria: 'Pintura', unidad: 'paquete', precio: 3990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_malla_lija', esHerramienta: false },
    { codigo: 'MAT-EASY-22', nombre: 'Tornillos Concreto Caja 50', categoria: 'Ferretería', unidad: 'caja', precio: 5990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_tornillo_concreto', esHerramienta: false },
    { codigo: 'MAT-EASY-23', nombre: 'Tacos Plásticos Caja 100', categoria: 'Ferretería', unidad: 'caja', precio: 2990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_taco_plastico', esHerramienta: false },
    { codigo: 'HERR-EASY-01', nombre: 'Pala Cuadrada Profesional', categoria: 'Ferretería', unidad: 'pala', precio: 14990, stockMin: 1, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_pala_cuadrada_pro', esHerramienta: true, marca: 'Truper' },
    { codigo: 'HERR-EASY-02', nombre: 'Pala Punta Mango Madera', categoria: 'Ferretería', unidad: 'pala', precio: 11990, stockMin: 2, ubicacion: 'Bodega Central', fuente: 'Easy', imagenKey: 'easy_pala_pala', esHerramienta: true, marca: 'Truper' },
    { codigo: 'HERR-EASY-03', nombre: 'Martillo Bola 1kg', categoria: 'Ferretería', unidad: 'martillo', precio: 7990, stockMin: 1, ubicacion: 'Pañol', fuente: 'Easy', imagenKey: 'easy_martillo_bola', esHerramienta: true, marca: 'Stanley' },
    { codigo: 'HERR-EASY-04', nombre: 'Set Destornilladores 6 Piezas', categoria: 'Ferretería', unidad: 'set', precio: 9990, stockMin: 1, ubicacion: 'Pañol', fuente: 'Easy', imagenKey: 'easy_destornillador', esHerramienta: true, marca: 'Stanley' },
    { codigo: 'HERR-EASY-05', nombre: 'Serrucho Corte Metal', categoria: 'Ferretería', unidad: 'serrucho', precio: 7990, stockMin: 1, ubicacion: 'Pañol', fuente: 'Easy', imagenKey: 'easy_serrucho_metal', esHerramienta: true, marca: 'Truper' },
    { codigo: 'HERR-EASY-06', nombre: 'Nivel de Tubo 60cm', categoria: 'Ferretería', unidad: 'nivel', precio: 8990, stockMin: 1, ubicacion: 'Pañol', fuente: 'Easy', imagenKey: 'easy_nivel_tubo', esHerramienta: true, marca: 'Stanley' },
    { codigo: 'MAT-EASY-24', nombre: 'Balde Pintor 18L', categoria: 'Pintura', unidad: 'balde', precio: 4990, stockMin: 5, ubicacion: 'Bodega Limpieza', fuente: 'Easy', imagenKey: 'easy_balde_canner', esHerramienta: false },
    { codigo: 'MAT-CP-01', nombre: 'Cemento CBB 25 kg', categoria: 'Ferretería', unidad: 'saco', precio: 5224, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenKey: 'cp_cemento_cbb', esHerramienta: false },
    { codigo: 'MAT-CP-02', nombre: 'Cal CBB 25 kg', categoria: 'Ferretería', unidad: 'saco', precio: 5990, stockMin: 3, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenKey: 'cp_cal_cbb', esHerramienta: false },
    { codigo: 'MAT-CP-03', nombre: 'Aditivo Hormigón 1L', categoria: 'Ferretería', unidad: 'litro', precio: 4990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenKey: 'cp_aditivo', esHerramienta: false },
    { codigo: 'MAT-CP-04', nombre: 'Hormigón Premezclado', categoria: 'Ferretería', unidad: 'saco', precio: 7490, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenKey: 'cp_hormigon_premez', esHerramienta: false },
    { codigo: 'MAT-CP-05', nombre: 'Tubo Estructural Cuadrado 40x40mm', categoria: 'Ferretería', unidad: 'metro', precio: 8990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenKey: 'cp_tubo_estructural', esHerramienta: false },
    { codigo: 'MAT-CP-06', nombre: 'Perfil U Galvanizado 3m', categoria: 'Ferretería', unidad: 'unidad', precio: 9990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenKey: 'cp_perfil_u', esHerramienta: false },
    { codigo: 'MAT-CP-07', nombre: 'Clavo Concreto 3x40 Bolsa 100', categoria: 'Ferretería', unidad: 'bolsa', precio: 3990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenKey: 'cp_clavo_concreto', esHerramienta: false },
    { codigo: 'MAT-CP-08', nombre: 'Alambre Negro 1kg', categoria: 'Ferretería', unidad: 'kg', precio: 1990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenKey: 'cp_alambre', esHerramienta: false },
    { codigo: 'MAT-CP-09', nombre: 'Malla Gallinero 10m', categoria: 'Ferretería', unidad: 'rollo', precio: 12990, stockMin: 3, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenKey: 'cp_malla_gallinero', esHerramienta: false },
    { codigo: 'MAT-CP-10', nombre: 'Malla Ciclón 1.5m x 10m', categoria: 'Ferretería', unidad: 'rollo', precio: 39990, stockMin: 2, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenKey: 'cp_malla_ciclon', esHerramienta: false },
    { codigo: 'MAT-CP-11', nombre: 'Tornillos Techo Galvanizado', categoria: 'Ferretería', unidad: 'caja', precio: 4990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenKey: 'cp_tornillo_techo_galv', esHerramienta: false },
    { codigo: 'MAT-CP-12', nombre: 'Disco Diamante 7" Klingspor', categoria: 'Ferretería', unidad: 'unidad', precio: 11990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenKey: 'cp_disco_7_klingspor', esHerramienta: false },
    { codigo: 'HERR-CP-01', nombre: 'Amoladora 2200W', categoria: 'Ferretería', unidad: 'amoladora', precio: 39990, stockMin: 1, ubicacion: 'Pañol', fuente: 'Construplaza', imagenKey: 'cp_amoladora_2200w', esHerramienta: true, marca: 'Bosch' },
    { codigo: 'HERR-CP-02', nombre: 'Compresor 100L', categoria: 'Ferretería', unidad: 'compresor', precio: 199990, stockMin: 1, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenKey: 'cp_compresor_100', esHerramienta: true, marca: 'Generico' },
    { codigo: 'HERR-CP-03', nombre: 'Sierra Caladora Profesional', categoria: 'Ferretería', unidad: 'sierra', precio: 44990, stockMin: 1, ubicacion: 'Pañol', fuente: 'Construplaza', imagenKey: 'cp_sierra_caladora_pro', esHerramienta: true, marca: 'Bosch' },
    { codigo: 'HERR-CP-04', nombre: 'Soldadora Inverter 200A', categoria: 'Ferretería', unidad: 'soldadora', precio: 119990, stockMin: 1, ubicacion: 'Pañol', fuente: 'Construplaza', imagenKey: 'cp_soldadora_inverter', esHerramienta: true, marca: 'Generico' },
    { codigo: 'HERR-CP-05', nombre: 'Escalera Aluminio 8 Peldaños', categoria: 'Ferretería', unidad: 'escalera', precio: 59990, stockMin: 1, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenKey: 'cp_escalera_aluminio', esHerramienta: true, marca: 'Truper' },
    { codigo: 'HERR-CP-06', nombre: 'Andamio Tubular Metálico', categoria: 'Ferretería', unidad: 'andamio', precio: 199990, stockMin: 1, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenKey: 'cp_andamio_tubular', esHerramienta: true, marca: 'Generico' },
    { codigo: 'HERR-CP-07', nombre: 'Carretilla 85L', categoria: 'Ferretería', unidad: 'carretilla', precio: 49990, stockMin: 1, ubicacion: 'Bodega Central', fuente: 'Construplaza', imagenKey: 'cp_carretilla_85', esHerramienta: true, marca: 'Truper' },
    { codigo: 'HERR-CP-08', nombre: 'Combo 3 Libras Fibra', categoria: 'Ferretería', unidad: 'combo', precio: 7990, stockMin: 2, ubicacion: 'Pañol', fuente: 'Construplaza', imagenKey: 'cp_combo_3lb', esHerramienta: true, marca: 'Truper' },
    { codigo: 'HERR-CP-09', nombre: 'Nivel Magnético 40cm', categoria: 'Ferretería', unidad: 'nivel', precio: 12990, stockMin: 1, ubicacion: 'Pañol', fuente: 'Construplaza', imagenKey: 'cp_nivel_magnetico', esHerramienta: true, marca: 'Stanley' },
    { codigo: 'HERR-CP-10', nombre: 'Huincha Acero 5m', categoria: 'Ferretería', unidad: 'huincha', precio: 4990, stockMin: 2, ubicacion: 'Pañol', fuente: 'Construplaza', imagenKey: 'cp_huincha_acero', esHerramienta: true, marca: 'Stanley' },
    { codigo: 'HERR-CP-11', nombre: 'Caja Herramientas Metálica', categoria: 'Ferretería', unidad: 'caja', precio: 29990, stockMin: 1, ubicacion: 'Pañol', fuente: 'Construplaza', imagenKey: 'cp_caja_herramientas', esHerramienta: true, marca: 'Stanley' },
    { codigo: 'MAT-CP-13', nombre: 'Guantes Cuero Soldador', categoria: 'Seguridad', unidad: 'par', precio: 6990, stockMin: 5, ubicacion: 'Bodega Limpieza', fuente: 'Construplaza', imagenKey: 'cp_guantes_cuero', esHerramienta: false },
    { codigo: 'MAT-CP-14', nombre: 'Mascarilla Gases', categoria: 'Seguridad', unidad: 'unidad', precio: 14990, stockMin: 3, ubicacion: 'Bodega Limpieza', fuente: 'Construplaza', imagenKey: 'cp_mascarilla_gas', esHerramienta: false },
    { codigo: 'MAT-IMP-01', nombre: 'Cerámica 45x45 cm Cemento Gris', categoria: 'Pintura', unidad: 'm²', precio: 9990, stockMin: 20, ubicacion: 'Bodega Central', fuente: 'Imperial', imagenKey: 'imp_ceramica_45', esHerramienta: false },
    { codigo: 'MAT-IMP-02', nombre: 'Porcelanato 60x60 cm Mate', categoria: 'Pintura', unidad: 'm²', precio: 14990, stockMin: 15, ubicacion: 'Bodega Central', fuente: 'Imperial', imagenKey: 'imp_porcelanato', esHerramienta: false },
    { codigo: 'MAT-IMP-03', nombre: 'Melamina Blanca 15mm 244x122cm', categoria: 'Ferretería', unidad: 'placa', precio: 24990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Imperial', imagenKey: 'imp_melamina_blanca', esHerramienta: false },
    { codigo: 'MAT-IMP-04', nombre: 'Melamina Roble 18mm 244x122cm', categoria: 'Ferretería', unidad: 'placa', precio: 29990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Imperial', imagenKey: 'imp_melamina_roble', esHerramienta: false },
    { codigo: 'MAT-IMP-05', nombre: 'MDF 18mm 244x122cm', categoria: 'Ferretería', unidad: 'placa', precio: 19990, stockMin: 5, ubicacion: 'Bodega Central', fuente: 'Imperial', imagenKey: 'imp_mdf_18', esHerramienta: false },
    { codigo: 'MAT-IMP-06', nombre: 'Tirador Mueble Cromado', categoria: 'Ferretería', unidad: 'unidad', precio: 1990, stockMin: 30, ubicacion: 'Bodega Central', fuente: 'Imperial', imagenKey: 'imp_tirador', esHerramienta: false },
    { codigo: 'MAT-IMP-07', nombre: 'Bisagra Cuba Mueble', categoria: 'Ferretería', unidad: 'unidad', precio: 990, stockMin: 50, ubicacion: 'Bodega Central', fuente: 'Imperial', imagenKey: 'imp_bisagra_cuba', esHerramienta: false },
    { codigo: 'MAT-IMP-08', nombre: 'Corredera Telescópica 45cm', categoria: 'Ferretería', unidad: 'par', precio: 4990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Imperial', imagenKey: 'imp_corredera', esHerramienta: false },
    { codigo: 'MAT-IMP-09', nombre: 'Piso Flotante Roble 8mm m²', categoria: 'Pintura', unidad: 'm²', precio: 12990, stockMin: 20, ubicacion: 'Bodega Central', fuente: 'Imperial', imagenKey: 'imp_piso_flotante', esHerramienta: false },
    { codigo: 'MAT-IMP-10', nombre: 'Alfombra Rollo 2m ancho', categoria: 'Pintura', unidad: 'm²', precio: 8990, stockMin: 15, ubicacion: 'Bodega Central', fuente: 'Imperial', imagenKey: 'imp_alfombra_rollo', esHerramienta: false },
    { codigo: 'MAT-IMP-11', nombre: 'Pintura Melamina Blanca 4L', categoria: 'Pintura', unidad: 'galón', precio: 18990, stockMin: 3, ubicacion: 'Bodega Central', fuente: 'Imperial', imagenKey: 'imp_pintura_melamina', esHerramienta: false },
    { codigo: 'MAT-IMP-12', nombre: 'Barniz Marino Madera 4L', categoria: 'Pintura', unidad: 'galón', precio: 22990, stockMin: 3, ubicacion: 'Bodega Central', fuente: 'Imperial', imagenKey: 'imp_barniz_marino', esHerramienta: false },
    { codigo: 'MAT-IMP-13', nombre: 'Tornillos Melamina Caja', categoria: 'Ferretería', unidad: 'caja', precio: 5990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'Imperial', imagenKey: 'imp_tornillo_melamina', esHerramienta: false },
    { codigo: 'HERR-IMP-01', nombre: 'Serrucho Melamina Especial', categoria: 'Ferretería', unidad: 'serrucho', precio: 12990, stockMin: 1, ubicacion: 'Pañol', fuente: 'Imperial', imagenKey: 'imp_serrucho_melamina', esHerramienta: true, marca: 'Bosch' },
    { codigo: 'HERR-IMP-02', nombre: 'Lima Madera 8"', categoria: 'Ferretería', unidad: 'lima', precio: 5990, stockMin: 2, ubicacion: 'Pañol', fuente: 'Imperial', imagenKey: 'imp_lima_madera', esHerramienta: true, marca: 'Truper' },
    { codigo: 'HERR-IMP-03', nombre: 'Formón 12mm Mango Madera', categoria: 'Ferretería', unidad: 'formón', precio: 4990, stockMin: 2, ubicacion: 'Pañol', fuente: 'Imperial', imagenKey: 'imp_formon', esHerramienta: true, marca: 'Truper' },
    { codigo: 'HERR-IMP-04', nombre: 'Escuadra Madera 90°', categoria: 'Ferretería', unidad: 'escuadra', precio: 3990, stockMin: 2, ubicacion: 'Pañol', fuente: 'Imperial', imagenKey: 'imp_escuadra_madera', esHerramienta: true, marca: 'Truper' },
    { codigo: 'HERR-IMP-05', nombre: 'Sargento 8" Pulgadas', categoria: 'Ferretería', unidad: 'sargento', precio: 8990, stockMin: 2, ubicacion: 'Pañol', fuente: 'Imperial', imagenKey: 'imp_sargento_8', esHerramienta: true, marca: 'Stanley' },
    { codigo: 'HERR-IMP-06', nombre: 'Ruteador 2200W', categoria: 'Ferretería', unidad: 'ruteador', precio: 159990, stockMin: 1, ubicacion: 'Carpintería', fuente: 'Imperial', imagenKey: 'imp_ruteador', esHerramienta: true, marca: 'Bosch' },
    { codigo: 'HERR-IMP-07', nombre: 'Caladora 800W', categoria: 'Ferretería', unidad: 'caladora', precio: 39990, stockMin: 1, ubicacion: 'Pañol', fuente: 'Imperial', imagenKey: 'imp_caladora_800', esHerramienta: true, marca: 'Bosch' },
    { codigo: 'HERR-ML-01', nombre: 'Taladro 21V Batería + Cargador', categoria: 'Ferretería', unidad: 'taladro', precio: 36990, stockMin: 1, ubicacion: 'Pañol', fuente: 'MercadoLibre', imagenKey: 'ml_taladro_21v', esHerramienta: true, marca: 'Lernen' },
    { codigo: 'HERR-ML-02', nombre: 'Amoladora 20V Batería Inalámbrica', categoria: 'Ferretería', unidad: 'amoladora', precio: 44990, stockMin: 1, ubicacion: 'Pañol', fuente: 'MercadoLibre', imagenKey: 'ml_amoladora_20v', esHerramienta: true, marca: 'Lernen' },
    { codigo: 'HERR-ML-03', nombre: 'Sierra Circular 7-1/4"', categoria: 'Ferretería', unidad: 'sierra', precio: 59990, stockMin: 1, ubicacion: 'Pañol', fuente: 'MercadoLibre', imagenKey: 'ml_sierra_7_1_4', esHerramienta: true, marca: 'Bosch' },
    { codigo: 'HERR-ML-04', nombre: 'Compresor 50L Aceite', categoria: 'Ferretería', unidad: 'compresor', precio: 129990, stockMin: 1, ubicacion: 'Bodega Central', fuente: 'MercadoLibre', imagenKey: 'ml_compresor_50', esHerramienta: true, marca: 'Generico' },
    { codigo: 'HERR-ML-05', nombre: 'Soldadora MIG 200A', categoria: 'Ferretería', unidad: 'soldadora', precio: 199990, stockMin: 1, ubicacion: 'Pañol', fuente: 'MercadoLibre', imagenKey: 'ml_soldadora_mig', esHerramienta: true, marca: 'Generico' },
    { codigo: 'HERR-ML-06', nombre: 'Generador Eléctrico 3KW', categoria: 'Ferretería', unidad: 'generador', precio: 399990, stockMin: 1, ubicacion: 'Bodega Central', fuente: 'MercadoLibre', imagenKey: 'ml_generador_3kw', esHerramienta: true, marca: 'Generico' },
    { codigo: 'HERR-ML-07', nombre: 'Compresor Silencioso 24L', categoria: 'Ferretería', unidad: 'compresor', precio: 89990, stockMin: 1, ubicacion: 'Pañol', fuente: 'MercadoLibre', imagenKey: 'ml_compresor_silencioso', esHerramienta: true, marca: 'Generico' },
    { codigo: 'HERR-ML-08', nombre: 'Hidrolavadora 1800W', categoria: 'Ferretería', unidad: 'hidrolavadora', precio: 79990, stockMin: 1, ubicacion: 'Bodega Central', fuente: 'MercadoLibre', imagenKey: 'ml_hidrolavadora_1800', esHerramienta: true, marca: 'Generico' },
    { codigo: 'HERR-ML-09', nombre: 'Cortacésped a Gasolina 20"', categoria: 'Ferretería', unidad: 'cortacésped', precio: 199990, stockMin: 1, ubicacion: 'Bodega Jardinería', fuente: 'MercadoLibre', imagenKey: 'ml_cortacesped_gas', esHerramienta: true, marca: 'Generico' },
    { codigo: 'HERR-ML-10', nombre: 'Motosierra 22" Gasolina', categoria: 'Ferretería', unidad: 'motosierra', precio: 159990, stockMin: 1, ubicacion: 'Bodega Jardinería', fuente: 'MercadoLibre', imagenKey: 'ml_motosierra_22', esHerramienta: true, marca: 'Generico' },
    { codigo: 'HERR-ML-11', nombre: 'Orilladora 4 Tiempos', categoria: 'Ferretería', unidad: 'orilladora', precio: 179990, stockMin: 1, ubicacion: 'Bodega Jardinería', fuente: 'MercadoLibre', imagenKey: 'ml_orilladora_4t', esHerramienta: true, marca: 'Generico' },
    { codigo: 'HERR-ML-12', nombre: 'Sopladora Batería 40V', categoria: 'Ferretería', unidad: 'sopladora', precio: 89990, stockMin: 1, ubicacion: 'Bodega Jardinería', fuente: 'MercadoLibre', imagenKey: 'ml_sopladora_bat', esHerramienta: true, marca: 'Generico' },
    { codigo: 'HERR-ML-13', nombre: 'Juego Llaves Neumáticas 1/2"', categoria: 'Ferretería', unidad: 'set', precio: 49990, stockMin: 1, ubicacion: 'Pañol', fuente: 'MercadoLibre', imagenKey: 'ml_neumatica_juego', esHerramienta: true, marca: 'Generico' },
    { codigo: 'HERR-ML-14', nombre: 'Gato Hidráulico 2 Toneladas', categoria: 'Ferretería', unidad: 'gato', precio: 19990, stockMin: 1, ubicacion: 'Bodega Central', fuente: 'MercadoLibre', imagenKey: 'ml_gato_hidraulico', esHerramienta: true, marca: 'Generico' },
    { codigo: 'HERR-ML-15', nombre: 'Caja Herramientas Rodantes 5 Cajones', categoria: 'Ferretería', unidad: 'caja', precio: 89990, stockMin: 1, ubicacion: 'Pañol', fuente: 'MercadoLibre', imagenKey: 'ml_caja_herramientas', esHerramienta: true, marca: 'Generico' },
    { codigo: 'HERR-ML-16', nombre: 'Multímetro Digital Pinza', categoria: 'Ferretería', unidad: 'multímetro', precio: 19990, stockMin: 1, ubicacion: 'Pañol', fuente: 'MercadoLibre', imagenKey: 'ml_multimetro_digital', esHerramienta: true, marca: 'Steren' },
    { codigo: 'HERR-ML-17', nombre: 'Termómetro Infrarrojo Digital', categoria: 'Ferretería', unidad: 'termómetro', precio: 14990, stockMin: 1, ubicacion: 'Pañol', fuente: 'MercadoLibre', imagenKey: 'ml_termometro', esHerramienta: true, marca: 'Generico' },
    { codigo: 'HERR-ML-18', nombre: 'Detector Estudio Pared', categoria: 'Ferretería', unidad: 'detector', precio: 24990, stockMin: 1, ubicacion: 'Pañol', fuente: 'MercadoLibre', imagenKey: 'ml_detector_estudio', esHerramienta: true, marca: 'Generico' },
    { codigo: 'MAT-ML-01', nombre: 'Panel Techo Transparente Policarbonato', categoria: 'Ferretería', unidad: 'placa', precio: 14990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'MercadoLibre', imagenKey: 'ml_techo_transparente', esHerramienta: false },
    { codigo: 'MAT-ML-02', nombre: 'Foco Solar Exterior LED', categoria: 'Eléctrico', unidad: 'unidad', precio: 9990, stockMin: 10, ubicacion: 'Bodega Central', fuente: 'MercadoLibre', imagenKey: 'ml_foco_solar', esHerramienta: false },
  ]

  try {
    const resultados = { materiales: { creados: 0, actualizados: 0 }, herramientas: { creados: 0, actualizados: 0 } }

    for (const p of productos) {
      const imagenUrl = imagenes[p.imagenKey] || null

      if (p.esHerramienta) {
        const existente = await db.catHerramienta.findUnique({ where: { codigo: p.codigo } })
        if (existente) {
          await db.catHerramienta.update({
            where: { id: existente.id },
            data: {
              nombre: p.nombre, marca: p.marca || null, cantidad: 1, estado: 'Bueno',
              valorReposicion: p.precio, ubicacion: p.ubicacion, imagenUrl,
              fuente: p.fuente, ultimaActPrecio: new Date(),
            },
          })
          resultados.herramientas.actualizados++
        } else {
          await db.catHerramienta.create({
            data: {
              codigo: p.codigo, nombre: p.nombre, marca: p.marca || null, cantidad: 1,
              estado: 'Bueno', valorReposicion: p.precio, ubicacion: p.ubicacion,
              imagenUrl, fuente: p.fuente, ultimaActPrecio: new Date(),
            },
          })
          resultados.herramientas.creados++
        }
      } else {
        const existente = await db.catMaterial.findUnique({ where: { codigo: p.codigo } })
        if (existente) {
          await db.catMaterial.update({
            where: { id: existente.id },
            data: {
              nombre: p.nombre, precioUnit: p.precio, categoria: p.categoria, unidad: p.unidad,
              ubicacion: p.ubicacion, imagenUrl, fuente: p.fuente,
              ultimaActPrecio: new Date(), stockMinimo: p.stockMin,
            },
          })
          resultados.materiales.actualizados++
        } else {
          await db.catMaterial.create({
            data: {
              codigo: p.codigo, nombre: p.nombre, precioUnit: p.precio, categoria: p.categoria,
              unidad: p.unidad, ubicacion: p.ubicacion, stockMinimo: p.stockMin, stockActual: 0,
              imagenUrl, fuente: p.fuente, ultimaActPrecio: new Date(),
            },
          })
          resultados.materiales.creados++
        }
      }
    }

    return NextResponse.json({
      success: true,
      mensaje: 'Catálogo completo de tiendas cargado',
      resultados,
      total_productos: productos.length,
      tiendas: ['Sodimac', 'Easy', 'Construplaza', 'Imperial', 'MercadoLibre'],
    })
  } catch (error) {
    console.error('Error cargando catálogo:', error)
    return NextResponse.json({ error: 'Error', detalle: String(error) }, { status: 500 })
  }
}
