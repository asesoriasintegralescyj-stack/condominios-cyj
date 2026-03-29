/**
 * Página principal - Asesorías Integrales CyJ
 * CORREGIDO: Enlaces directos al sistema
 */

import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-blue-900 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Asesorías Integrales CyJ</h1>
          <Link
            href="/sistema"
            className="bg-white text-blue-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Iniciar Sesión
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-gray-50 to-white">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          Administración Profesional para tu <span className="text-blue-900">Condominio</span>
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Gestión integral de comunidades con transparencia, eficiencia y compromiso.
        </p>
        <Link
          href="/sistema"
          className="inline-block bg-blue-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors"
        >
          Acceder al Sistema
        </Link>
      </section>

      {/* Services */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Nuestros Servicios</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-xl text-center hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🏢</div>
              <h4 className="text-lg font-bold mb-2">Administración</h4>
              <p className="text-gray-600">Gestión integral de comunidades</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl text-center hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🔧</div>
              <h4 className="text-lg font-bold mb-2">Mantención</h4>
              <p className="text-gray-600">Órdenes de trabajo y proveedores</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl text-center hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">💰</div>
              <h4 className="text-lg font-bold mb-2">Finanzas</h4>
              <p className="text-gray-600">Control de gastos comunes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 px-4 bg-blue-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-4">¿Necesitas ayuda?</h3>
          <p className="mb-6">Contáctanos para resolver tus dudas</p>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="tel:+56964650643" className="hover:underline transition-colors">📞 +56 964 650 643</a>
            <a href="tel:+56974408794" className="hover:underline transition-colors">📞 +56 974 408 794</a>
            <a href="mailto:asesoriasintegralescyj@gmail.com" className="hover:underline transition-colors">✉️ asesoriasintegralescyj@gmail.com</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 bg-gray-900 text-white text-center">
        <p>© {new Date().getFullYear()} Asesorías Integrales CyJ. Todos los derechos reservados.</p>
      </footer>
    </main>
  )
}
