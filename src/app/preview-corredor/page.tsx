/**
 * Vista previa pública — Sección "Corredor de Propiedades"
 * -------------------------------------------------------
 * ESTA PÁGINA ES SOLO UNA VISTA PREVIA.
 * No modifica el LandingPage.tsx original.
 * Una vez aprobada, se integrará al landing y se eliminará esta ruta.
 *
 * URL pública: https://condominios-cyj.vercel.app/preview-corredor
 */

import Image from 'next/image'

export const metadata = {
  title: 'Vista Previa — Corredor de Propiedades | Asesorías Integrales CyJ',
  description: 'Propuesta de nueva sección para la landing page. Vista previa no implementada.',
}

export default function PreviewCorredorPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Badge fijo */}
      <div className="fixed top-4 right-4 z-50 bg-amber-400 text-gray-900 font-bold px-4 py-2 rounded-full text-xs shadow-lg">
        👁 VISTA PREVIA — NO IMPLEMENTADO AÚN
      </div>

      {/* ============================== */}
      {/* NAV (resumido) */}
      {/* ============================== */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpg"
              alt="Asesorías Integrales CyJ"
              width={48}
              height={48}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div>
              <div className="text-base font-bold">Asesorías Integrales CyJ</div>
              <div className="text-[10px] text-[#0A1172] font-medium">
                Administración de Condominios
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <span>Servicios</span>
            <span>Nosotros</span>
            <span>Beneficios</span>
            <span>Contacto</span>
          </div>
        </div>
      </nav>

      {/* ============================== */}
      {/* HERO (resumido) */}
      {/* ============================== */}
      <section className="py-16 bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 bg-[#0A1172]/10 text-[#0A1172] px-4 py-2 rounded-full text-sm font-medium mb-4">
            ★ +8 años de experiencia
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
            Administración Profesional para tu{' '}
            <span className="text-[#0A1172]">Condominio</span>
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            Gestión integral de comunidades con transparencia, eficiencia y compromiso.
          </p>
          <p className="text-xs text-gray-400 mt-6 italic">
            ▲ Sección HERO existente (sin cambios) — solo mostrada para dar contexto
          </p>
        </div>
      </section>

      {/* ============================== */}
      {/* SERVICIOS (3 tarjetas resumidas) */}
      {/* ============================== */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-[#0A1172] font-semibold text-sm uppercase tracking-wider">
              Nuestros Servicios
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mt-2">
              Soluciones Integrales para tu Comunidad
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="h-32 bg-gradient-to-br from-[#0A1172] to-[#080d54] flex items-center justify-center text-white text-4xl">
                🏢
              </div>
              <div className="p-4">
                <h3 className="font-bold mb-1">Administración de Condominios</h3>
                <p className="text-xs text-gray-600">Gestión integral de comunidades...</p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="h-32 bg-gradient-to-br from-[#0A1172] to-[#080d54] flex items-center justify-center text-white text-4xl">
                🔧
              </div>
              <div className="p-4">
                <h3 className="font-bold mb-1">Mantención y Reparaciones</h3>
                <p className="text-xs text-gray-600">Coordinación de mantenciones...</p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="h-32 bg-gradient-to-br from-[#0A1172] to-[#080d54] flex items-center justify-center text-white text-4xl">
                💰
              </div>
              <div className="p-4">
                <h3 className="font-bold mb-1">Gestión Financiera</h3>
                <p className="text-xs text-gray-600">Administración transparente...</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-6 text-center italic">
            ▲ Sección SERVICIOS existente (6 tarjetas en total, mostradas 3 para resumir) — sin cambios
          </p>
        </div>
      </section>

      {/* ============================== */}
      {/* 🆕 NUEVA SECCIÓN: CORREDOR DE PROPIEDADES */}
      {/* ============================== */}
      <section
        className="py-16 bg-gradient-to-br from-[#0A1172] to-[#080d54] text-white"
        style={{ boxShadow: '0 0 0 4px #fbbf24, 0 0 0 8px rgba(251, 191, 36, .25)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span
              className="inline-flex items-center gap-2 bg-amber-100 text-amber-900 font-bold px-3 py-1.5 rounded-full text-xs"
              style={{ border: '1px dashed #f59e0b' }}
            >
              🆕 SECCIÓN NUEVA PROPUESTA
            </span>
          </div>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Imagen */}
            <div className="relative order-2 lg:order-1">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="/corretaje.png"
                  alt="Corredor de Propiedades"
                  width={1344}
                  height={768}
                  className="w-full h-80 object-cover"
                  priority
                />
              </div>
              {/* Card flotante */}
              <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-lg p-4 hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-xl">
                    🏠
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">+50 propiedades</div>
                    <div className="text-[10px] text-gray-500">vendidas el último año</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenido */}
            <div className="order-1 lg:order-2">
              <span className="inline-flex items-center gap-2 bg-white/10 text-blue-100 px-4 py-2 rounded-full text-sm font-medium mb-4">
                🏠 Servicio Destacado
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
                Corredor de Propiedades Profesional
              </h2>
              <p className="text-blue-100 mb-6 text-lg">
                Vende o arrienda tu propiedad dentro del condominio con el respaldo de nuestros
                corredores expertos. Conocemos el mercado, las instalaciones y el perfil de
                compradores que buscan vivir en tu comunidad.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    📊
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Tasaciones Profesionales</div>
                    <div className="text-xs text-blue-200">Valor de mercado real</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    🔑
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Venta y Arriendo</div>
                    <div className="text-xs text-blue-200">Gestión completa del proceso</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    👥
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Red de Clientes</div>
                    <div className="text-xs text-blue-200">Compradores calificados</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    📋
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Acompañamiento Legal</div>
                    <div className="text-xs text-blue-200">Trámites notariales incluidos</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold text-sm transition-colors">
                  Solicitar Tasación Gratuita →
                </button>
                <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-semibold text-sm transition-colors">
                  Ver Propiedades Disponibles
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== */}
      {/* ABOUT (resumido) */}
      {/* ============================== */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-[#0A1172] font-semibold text-sm uppercase tracking-wider">
                Sobre Nosotros
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold mt-2 mb-4">
                +8 Años de Experiencia en Administración de Condominios
              </h2>
              <p className="text-gray-600 text-sm">
                En Asesorías Integrales CyJ nos dedicamos a brindar un servicio de
                administración profesional, transparente y comprometido...
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-2xl font-bold text-[#0A1172]">200+</div>
                  <div className="text-xs text-gray-600">Unidades</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-2xl font-bold text-[#0A1172]">8+</div>
                  <div className="text-xs text-gray-600">Años</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-2xl font-bold text-[#0A1172]">500+</div>
                  <div className="text-xs text-gray-600">Clientes</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-2xl font-bold text-[#0A1172]">100%</div>
                  <div className="text-xs text-gray-600">Transparencia</div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-6 text-center italic">
            ▲ Sección NOSOTROS existente — sin cambios
          </p>
        </div>
      </section>

      {/* ============================== */}
      {/* PANEL DE DECISIÓN */}
      {/* ============================== */}
      <div className="bg-gray-900 text-white py-10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-xl font-bold mb-3">
            ¿Cómo te gustaría implementar esta sección?
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Revisa la vista previa de arriba y responde con la opción que prefieras.
            No se realizará ningún cambio en el LandingPage original hasta que lo autorices.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 text-left">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="text-amber-400 font-bold text-sm mb-1">
                ✅ Opción A (Recomendada)
              </div>
              <div className="font-semibold mb-1">Sección destacada (la de arriba)</div>
              <p className="text-xs text-gray-400">
                Banner azul corporativo entre Servicios y Nosotros. Resalta el corretaje como
                servicio premium. Usa <code>corretaje.png</code> existente. Incluye 4 features
                + 2 botones CTA.
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="text-blue-400 font-bold text-sm mb-1">🔁 Opción B</div>
              <div className="font-semibold mb-1">7ª tarjeta en la grilla de Servicios</div>
              <p className="text-xs text-gray-400">
                Agregar &quot;Corredor de Propiedades&quot; como 7ª tarjeta en la sección de
                servicios existente (mismo formato que las otras 6). Requiere generar imagen{' '}
                <code>/services/corretaje.jpg</code>. La grilla quedaría 3×3 con un slot vacío.
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="text-green-400 font-bold text-sm mb-1">✏️ Opción C</div>
              <div className="font-semibold mb-1">Modificar textos de la propuesta</div>
              <p className="text-xs text-gray-400">
                Misma sección destacada de la Opción A, pero dime qué textos cambiar: título,
                descripción, features, botones CTA, etc.
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="text-purple-400 font-bold text-sm mb-1">🎨 Opción D</div>
              <div className="font-semibold mb-1">Otra ubicación / estilo</div>
              <p className="text-xs text-gray-400">
                Moverla a otra posición (después de Beneficios, antes de Contacto, etc.) o usar
                otro estilo de diseño. Describe qué quieres.
              </p>
            </div>
          </div>
          <div className="mt-6 text-xs text-gray-500">
            💡 Respóndeme con la letra de la opción elegida (A, B, C o D) y los ajustes que
            quieras.
          </div>
          <div className="mt-6">
            <a
              href="/"
              className="inline-block bg-[#0A1172] hover:bg-[#080d54] text-white px-6 py-3 rounded-lg font-semibold text-sm transition-colors"
            >
              ← Volver al Inicio
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
