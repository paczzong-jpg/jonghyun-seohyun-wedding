import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type SelectDropdownItem = {
  label: string
  value: string
  icon?: ComponentType<LucideProps>
}

type Props = {
  value?: string
  defaultValue?: string
  placeholder?: string
  items: SelectDropdownItem[]
  onValueChange?: (value: string) => void
}

export function SelectDropdown({ value, defaultValue, placeholder = 'Select option', items, onValueChange }: Props) {
  return (
    <Select value={value} defaultValue={defaultValue} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            <span className='inline-flex items-center gap-2'>
              {item.icon ? <item.icon className='size-4 text-muted-foreground' /> : null}
              {item.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
