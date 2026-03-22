'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Users, 
  Wrench, 
  DollarSign, 
  BarChart3, 
  Building2, 
  Phone, 
  Mail, 
  MapPin,
  Shield,
  Clock,
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  Star,
  TrendingUp,
  FileText,
  MessageCircle,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/logo.jpg" 
                alt="Asesorías Integrales CyJ" 
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div>
                <span className="text-lg font-bold text-gray-900">Asesorías Integrales CyJ</span>
                <span className="hidden sm:inline text-xs text-[#0A1172] ml-2 font-medium">Administración de Condominios</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#servicios" className="text-gray-600 hover:text-[#0A1172] transition-colors text-sm font-medium">Servicios</a>
              <a href="#nosotros" className="text-gray-600 hover:text-[#0A1172] transition-colors text-sm font-medium">Nosotros</a>
              <a href="#beneficios" className="text-gray-600 hover:text-[#0A1172] transition-colors text-sm font-medium">Beneficios</a>
              <a href="#contacto" className="text-gray-600 hover:text-[#0A1172] transition-colors text-sm font-medium">Contacto</a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="text-gray-600 hover:text-[#0A1172]">
                  Iniciar Sesión
                </Button>
              </Link>
              <a href="#contacto">
                <Button className="bg-[#0A1172] hover:bg-[#080d54] text-white">
                  Solicitar Información
                </Button>
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-4">
            <div className="px-4 space-y-3">
              <a href="#servicios" className="block text-gray-600 hover:text-[#0A1172] py-2">Servicios</a>
              <a href="#nosotros" className="block text-gray-600 hover:text-[#0A1172] py-2">Nosotros</a>
              <a href="#beneficios" className="block text-gray-600 hover:text-[#0A1172] py-2">Beneficios</a>
              <a href="#contacto" className="block text-gray-600 hover:text-[#0A1172] py-2">Contacto</a>
              <div className="pt-3 border-t border-gray-100">
                <Link href="/login">
                  <Button variant="outline" className="w-full mb-2">Iniciar Sesión</Button>
                </Link>
                <a href="#contacto">
                  <Button className="w-full bg-[#0A1172] hover:bg-[#080d54]">Solicitar Información</Button>
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-24 lg:pt-32 pb-16 lg:pb-24 bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-[#0A1172]/10 text-[#0A1172] px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Star className="w-4 h-4" />
                +8 años de experiencia
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Administración Profesional para tu 
                <span className="text-[#0A1172]"> Condominio</span>
              </h1>
              
              <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0">
                Gestión integral de comunidades con transparencia, eficiencia y compromiso. 
                Nos encargamos de todo para que tú solo te preocupes de disfrutar tu hogar.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a href="#contacto">
                  <Button size="lg" className="bg-[#0A1172] hover:bg-[#080d54] text-white px-8 h-12 text-base w-full sm:w-auto">
                    Solicitar Presupuesto
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </a>
                <a href="#servicios">
                  <Button size="lg" variant="outline" className="px-8 h-12 text-base w-full sm:w-auto">
                    Ver Servicios
                  </Button>
                </a>
              </div>

              {/* Trust Badges */}
              <div className="mt-10 flex flex-wrap gap-6 justify-center lg:justify-start">
                <div className="flex items-center gap-2 text-gray-500">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Sin costos ocultos</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">100% Transparencia</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Soporte 24/7</span>
                </div>
              </div>
            </div>

            {/* Right Content - Hero Image/Card */}
            <div className="relative">
              <div className="bg-gradient-to-br from-[#0A1172] to-[#080d54] rounded-2xl p-8 text-white shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <img 
                    src="/logo.jpg" 
                    alt="Asesorías Integrales CyJ" 
                    className="w-16 h-16 rounded-xl object-cover bg-white/20"
                  />
                  <div>
                    <h3 className="text-xl font-bold">Asesorías Integrales CyJ</h3>
                    <p className="text-blue-200 text-sm">Administración de Condominios</p>
                    <p className="text-blue-100 text-xs">Tu tranquilidad es nuestra prioridad</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-3xl font-bold">200+</div>
                    <div className="text-blue-100 text-sm">Unidades administradas</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-3xl font-bold">500+</div>
                    <div className="text-blue-100 text-sm">Clientes satisfechos</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span>Administración completa de condominios</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span>Rendición de cuentas mensual</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span>Portal en línea para residentes</span>
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4 hidden lg:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">+35% ahorro</div>
                    <div className="text-xs text-gray-500">en gestión eficiente</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#0A1172] font-semibold text-sm uppercase tracking-wider">Nuestros Servicios</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 mb-4">
              Soluciones Integrales para tu Comunidad
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Ofrecemos una gestión completa y profesional para que tu condominio funcione de manera óptima
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Service 1 - Administración */}
            <Card className="group hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-[#0A1172]/30 overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/services/administracion.jpg" 
                  alt="Administración de Condominios" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1172]/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Administración de Condominios</h3>
                </div>
              </div>
              <CardContent className="p-6">
                <p className="text-gray-600 mb-4">
                  Gestión integral de comunidades: cobranzas, pagos, mantención y atención a residentes.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Control de gastos comunes
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Asambleas y votaciones
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Rendición mensual
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Service 2 - Mantención */}
            <Card className="group hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-[#0A1172]/30 overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/services/mantencion.jpg" 
                  alt="Mantención y Reparaciones" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1172]/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                    <Wrench className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Mantención y Reparaciones</h3>
                </div>
              </div>
              <CardContent className="p-6">
                <p className="text-gray-600 mb-4">
                  Coordinación de mantenciones preventivas y correctivas con proveedores certificados.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Órdenes de trabajo digitales
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Control de proveedores
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Seguimiento en tiempo real
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Service 3 - Gestión Financiera */}
            <Card className="group hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-[#0A1172]/30 overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/services/finanzas.jpg" 
                  alt="Gestión Financiera" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1172]/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Gestión Financiera</h3>
                </div>
              </div>
              <CardContent className="p-6">
                <p className="text-gray-600 mb-4">
                  Administración transparente de recursos con informes detallados y acceso en línea.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Estados financieros
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Control de morosidad
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Presupuestos anuales
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Service 4 - Atención a Residentes */}
            <Card className="group hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-[#0A1172]/30 overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/services/atencion.jpg" 
                  alt="Atención a Residentes" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1172]/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Atención a Residentes</h3>
                </div>
              </div>
              <CardContent className="p-6">
                <p className="text-gray-600 mb-4">
                  Comunicación directa y eficiente con todos los residentes del condominio.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Mesa de ayuda 24/7
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Notificaciones digitales
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Portal de residentes
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Service 5 - Documentación Legal */}
            <Card className="group hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-[#0A1172]/30 overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/services/legal.jpg" 
                  alt="Documentación Legal" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1172]/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Documentación Legal</h3>
                </div>
              </div>
              <CardContent className="p-6">
                <p className="text-gray-600 mb-4">
                  Respaldo documental completo y gestión de trámites legales del condominio.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Actas y registros
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Contratos y convenios
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Asesoría legal
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Service 6 - Reportes y Análisis */}
            <Card className="group hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-[#0A1172]/30 overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src="/services/reportes.jpg" 
                  alt="Reportes y Análisis" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1172]/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Reportes y Análisis</h3>
                </div>
              </div>
              <CardContent className="p-6">
                <p className="text-gray-600 mb-4">
                  Informes detallados y análisis de datos para tomar mejores decisiones.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Dashboard en línea
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Indicadores de gestión
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0A1172]" />
                    Exportación de datos
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="nosotros" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#0A1172] font-semibold text-sm uppercase tracking-wider">Sobre Nosotros</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 mb-6">
                +8 Años de Experiencia en Administración de Condominios
              </h2>
              <p className="text-gray-600 mb-6 text-lg">
                En <strong>Asesorías Integrales CyJ</strong> nos dedicamos a brindar un servicio de administración profesional, 
                transparente y comprometido con cada una de las comunidades que confían en nosotros.
              </p>
              <p className="text-gray-600 mb-8">
                Nuestro equipo de profesionales está capacitado para resolver cualquier necesidad que tenga 
                tu condominio, desde la gestión financiera hasta el mantenimiento de áreas comunes, 
                siempre con la máxima transparencia y eficiencia.
              </p>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0A1172]/10 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-[#0A1172]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Confianza</h4>
                    <p className="text-sm text-gray-600">Transparencia total en cada gestión</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0A1172]/10 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-[#0A1172]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Experiencia</h4>
                    <p className="text-sm text-gray-600">Más de 8 años en el mercado</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0A1172]/10 flex items-center justify-center shrink-0">
                    <HeartHandshake className="w-5 h-5 text-[#0A1172]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Compromiso</h4>
                    <p className="text-sm text-gray-600">Dedicación a cada comunidad</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0A1172]/10 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-[#0A1172]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Comunicación</h4>
                    <p className="text-sm text-gray-600">Canales directos y efectivos</p>
                  </div>
                </div>
              </div>

              <a href="#contacto">
                <Button className="bg-[#0A1172] hover:bg-[#080d54]">
                  Conoce más sobre nosotros
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </a>
            </div>

            {/* Stats Card */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-6 bg-slate-50 rounded-xl">
                    <div className="text-4xl font-bold text-[#0A1172] mb-2">200+</div>
                    <div className="text-gray-600 font-medium">Unidades</div>
                    <div className="text-sm text-gray-400">administradas</div>
                  </div>
                  <div className="text-center p-6 bg-slate-50 rounded-xl">
                    <div className="text-4xl font-bold text-[#0A1172] mb-2">8+</div>
                    <div className="text-gray-600 font-medium">Años</div>
                    <div className="text-sm text-gray-400">de experiencia</div>
                  </div>
                  <div className="text-center p-6 bg-slate-50 rounded-xl">
                    <div className="text-4xl font-bold text-[#0A1172] mb-2">500+</div>
                    <div className="text-gray-600 font-medium">Clientes</div>
                    <div className="text-sm text-gray-400">satisfechos</div>
                  </div>
                  <div className="text-center p-6 bg-slate-50 rounded-xl">
                    <div className="text-4xl font-bold text-[#0A1172] mb-2">100%</div>
                    <div className="text-gray-600 font-medium">Transparencia</div>
                    <div className="text-sm text-gray-400">garantizada</div>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-[#0A1172] rounded-xl text-white">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                      <Star className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">4.9/5</div>
                      <div className="text-blue-100">Calificación de nuestros clientes</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" className="py-24 bg-[#0A1172]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-blue-200 font-semibold text-sm uppercase tracking-wider">¿Por qué elegirnos?</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2 mb-4">
              Beneficios de Nuestro Servicio
            </h2>
            <p className="text-blue-100 max-w-2xl mx-auto text-lg">
              Transformamos la administración de tu condominio en una experiencia sencilla, transparente y profesional
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            <div className="text-center p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">100% Transparencia</h3>
              <p className="text-blue-100">Acceso completo a estados financieros, rendiciones mensuales y todos los movimientos de tu condominio en tiempo real</p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Respuesta Inmediata</h3>
              <p className="text-blue-100">Atención de emergencias en menos de 24 horas y respuesta a consultas en máximo 48 horas hábiles</p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Seguridad Garantizada</h3>
              <p className="text-blue-100">Respaldo de seguros, garantía en todos nuestros servicios y protección de datos personales</p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Sin Costos Ocultos</h3>
              <p className="text-blue-100">Precios claros, competitivos y detallados desde el inicio. Sin sorpresas ni cobros adicionales</p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Equipo Profesional</h3>
              <p className="text-blue-100">Personal capacitado y comprometido con más de 8 años de experiencia en administración de condominios</p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Tecnología Avanzada</h3>
              <p className="text-blue-100">Portal en línea para residentes, notificaciones digitales y reportes automatizados en tiempo real</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <a href="#contacto">
              <Button size="lg" className="bg-white text-[#0A1172] hover:bg-blue-50 px-10 h-12 text-base font-semibold">
                Solicitar Información
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contacto" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Info */}
            <div>
              <span className="text-[#0A1172] font-semibold text-sm uppercase tracking-wider">Contacto</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 mb-6">
                ¿Listo para Mejorar tu Condominio?
              </h2>
              <p className="text-gray-600 mb-8">
                Contáctanos hoy y descubre cómo podemos ayudarte a transformar la administración de tu comunidad.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0A1172]/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-[#0A1172]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Dirección</h4>
                    <p className="text-gray-600">Av. La Montaña Norte 3650, Lampa, Chile</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0A1172]/10 flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6 text-[#0A1172]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Teléfonos</h4>
                    <div className="space-y-1">
                      <a href="tel:+56964650643" className="text-[#0A1172] hover:text-[#080d54] font-medium block">
                        +56 964 650 643
                      </a>
                      <a href="tel:+56974408794" className="text-[#0A1172] hover:text-[#080d54] font-medium block">
                        +56 974 408 794
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0A1172]/10 flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-[#0A1172]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Email</h4>
                    <a href="mailto:asesoriasintegralescyj@gmail.com" className="text-[#0A1172] hover:text-[#080d54] font-medium">
                      asesoriasintegralescyj@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0A1172]/10 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 text-[#0A1172]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Horario de Atención</h4>
                    <p className="text-gray-600">Lunes a Viernes: 9:00 - 18:00</p>
                    <p className="text-gray-600">Emergencias: 24/7</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-slate-50 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Envíanos un Mensaje</h3>
              <form className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <Input placeholder="Tu nombre" className="bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <Input placeholder="+56 9 1234 5678" className="bg-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input type="email" placeholder="correo@ejemplo.com" className="bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Condominio</label>
                  <Input placeholder="Condominio Ejemplo" className="bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                  <Textarea placeholder="¿En qué podemos ayudarte?" rows={4} className="bg-white" />
                </div>
                <Button type="submit" className="w-full bg-[#0A1172] hover:bg-[#080d54] h-11">
                  Enviar Mensaje
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Company Info */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/logo.jpg" 
                  alt="Asesorías Integrales CyJ" 
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div>
                  <div className="font-bold text-lg">Asesorías Integrales CyJ</div>
                  <div className="text-blue-300 text-sm font-medium">Administración de Condominios</div>
                </div>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                Profesionales en administración de condominios con más de 8 años de experiencia. 
                Transparencia, eficiencia y compromiso con tu comunidad.
              </p>
              <div className="flex gap-4">
                <a href="tel:+56964650643" className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-[#0A1172] transition-colors">
                  <Phone className="w-5 h-5" />
                </a>
                <a href="tel:+56974408794" className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-[#0A1172] transition-colors">
                  <Phone className="w-5 h-5" />
                </a>
                <a href="mailto:asesoriasintegralescyj@gmail.com" className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-[#0A1172] transition-colors">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">Enlaces Rápidos</h4>
              <ul className="space-y-2">
                <li><a href="#servicios" className="text-gray-400 hover:text-white transition-colors">Servicios</a></li>
                <li><a href="#nosotros" className="text-gray-400 hover:text-white transition-colors">Nosotros</a></li>
                <li><a href="#beneficios" className="text-gray-400 hover:text-white transition-colors">Beneficios</a></li>
                <li><a href="#contacto" className="text-gray-400 hover:text-white transition-colors">Contacto</a></li>
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-semibold mb-4">Servicios</h4>
              <ul className="space-y-2">
                <li><a href="#servicios" className="text-gray-400 hover:text-white transition-colors">Administración</a></li>
                <li><a href="#servicios" className="text-gray-400 hover:text-white transition-colors">Mantención</a></li>
                <li><a href="#servicios" className="text-gray-400 hover:text-white transition-colors">Gestión Financiera</a></li>
                <li><a href="#servicios" className="text-gray-400 hover:text-white transition-colors">Reportes</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Asesorías Integrales CyJ. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Política de Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Términos de Servicio</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
