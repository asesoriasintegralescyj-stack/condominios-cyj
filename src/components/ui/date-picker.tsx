'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerProps {
  date?: Date | null
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = 'Seleccionar fecha',
  className,
  disabled = false,
}: DatePickerProps) {
  const [selected, setSelected] = React.useState<Date | undefined>(
    date ? new Date(date) : undefined
  )

  React.useEffect(() => {
    setSelected(date ? new Date(date) : undefined)
  }, [date])

  const handleSelect = (newDate: Date | undefined) => {
    setSelected(newDate)
    onDateChange?.(newDate)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal h-9',
            !selected && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, 'PPP', { locale: es }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

// Función helper para convertir fecha a string ISO (YYYY-MM-DD)
export function dateToISO(date: Date | undefined): string {
  if (!date) return ''
  return format(date, 'yyyy-MM-dd')
}

// Función helper para convertir string ISO a Date
export function isoToDate(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined
  try {
    return new Date(iso)
  } catch {
    return undefined
  }
}
