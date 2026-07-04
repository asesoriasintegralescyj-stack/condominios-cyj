'use client'

import { ArrowRight } from 'lucide-react'

export interface IndicadorCard {
  titulo: string
  numero: number | string
  icon: React.ReactNode
  /** Color del gradiente Tailwind: 'azul' | 'verde' | 'naranja' | 'rojo' | 'gris' | 'purpura' | 'cyan' | 'rose' | 'primary' */
  color: 'azul' | 'verde' | 'naranja' | 'rojo' | 'gris' | 'purpura' | 'cyan' | 'rose' | 'primary'
  subtitulo?: string
  onClick?: () => void
}

const GRADIENTES: Record<IndicadorCard['color'], string> = {
  azul: 'from-blue-500 to-blue-600',
  verde: 'from-green-500 to-green-600',
  naranja: 'from-amber-500 to-amber-600',
  rojo: 'from-red-500 to-red-600',
  gris: 'from-slate-500 to-slate-600',
  purpura: 'from-purple-500 to-purple-600',
  cyan: 'from-cyan-500 to-cyan-600',
  rose: 'from-rose-500 to-rose-600',
  primary: 'from-[#0f2044] to-[#0a1628]',
}

export function TableroIndicadores({ cards, columnas = 4 }: { cards: IndicadorCard[]; columnas?: 2 | 3 | 4 | 5 | 6 }) {
  const gridClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6',
  }[columnas]

  return (
    <div className={`grid ${gridClass} gap-3`}>
      {cards.map((card, i) => (
        <div
          key={i}
          onClick={card.onClick}
          className={`rounded-md bg-gradient-to-br ${GRADIENTES[card.color]} text-white p-3 transition-all hover:shadow-md hover:-translate-y-0.5 ${card.onClick ? 'cursor-pointer group' : ''} relative overflow-hidden`}
        >
          <div className="flex items-center gap-2">
            <span className="opacity-80 shrink-0">{card.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs opacity-80 truncate">{card.titulo}</p>
              <p className="text-xl font-bold truncate leading-tight">{card.numero}</p>
            </div>
          </div>
          {card.subtitulo && (
            <p className="text-[10px] opacity-70 mt-1 truncate">{card.subtitulo}</p>
          )}
          {card.onClick && (
            <div className="flex items-center gap-1 mt-1 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Ver detalles <ArrowRight className="w-2.5 h-2.5" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
