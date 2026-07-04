import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type Props = {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date' }: Props) {
  const date = value ? new Date(value + 'T00:00:00') : undefined

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline' className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground')}>
          <CalendarIcon className='mr-2 size-4' />
          {date ? format(date, 'yyyy-MM-dd') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <Calendar
          mode='single'
          selected={date}
          onSelect={(nextDate) => {
            if (nextDate) onChange(format(nextDate, 'yyyy-MM-dd'))
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
