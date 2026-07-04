import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, Search, Sun } from 'lucide-react'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { sidebarData } from '@/lib/admin-data'
import { useAdminUi } from '@/context/admin-ui-provider'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandMenu({ open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const { setTheme } = useAdminUi()
  const items = useMemo(() => sidebarData.navGroups.flatMap((group) => group.items.flatMap((item) => 'items' in item ? item.items : [item])), [])
  const go = (url: string) => {
    navigate(url)
    onOpenChange(false)
  }
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder='Type a command or search...' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading='Navigation'>
          {items.map((item) => (
            <CommandItem key={item.title + item.url} onSelect={() => go(item.url)}>
              {item.icon ? <item.icon className='mr-2 size-4' /> : <Search className='mr-2 size-4' />}
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='Theme'>
          <CommandItem onSelect={() => setTheme('light')}><Sun className='mr-2 size-4' />Light</CommandItem>
          <CommandItem onSelect={() => setTheme('dark')}><Moon className='mr-2 size-4' />Dark</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
