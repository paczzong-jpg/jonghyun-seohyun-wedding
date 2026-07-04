import { Laptop, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAdminUi } from '@/context/admin-ui-provider'

export function ThemeSwitch() {
  const { theme, setTheme } = useAdminUi()
  const Icon = theme === 'dark' ? Moon : Sun
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' aria-label='Switch theme'>
          <Icon className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={() => setTheme('light')}><Sun className='mr-2 size-4' />Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}><Moon className='mr-2 size-4' />Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}><Laptop className='mr-2 size-4' />System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
