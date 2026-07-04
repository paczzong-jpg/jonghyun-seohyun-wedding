import type { ReactNode } from 'react'
import { RotateCcw, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { useAdminUi } from '@/context/admin-ui-provider'

export function ConfigDrawer() {
  const ui = useAdminUi()
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='ghost' size='icon' aria-label='Open display settings'>
          <Settings className='size-4' />
        </Button>
      </SheetTrigger>
      <SheetContent className='flex flex-col'>
        <SheetHeader>
          <SheetTitle>Theme Settings</SheetTitle>
          <SheetDescription>Adjust shadcn-admin layout density without leaving the app.</SheetDescription>
        </SheetHeader>
        <div className='flex flex-1 flex-col gap-6 overflow-y-auto px-4'>
          <Section title='Theme'>
            <RadioGroup value={ui.theme} onValueChange={(value) => ui.setTheme(value as 'light' | 'dark' | 'system')} className='grid grid-cols-3 gap-3'>
              <RadioCard id='theme-light' value='light' label='Light' />
              <RadioCard id='theme-dark' value='dark' label='Dark' />
              <RadioCard id='theme-system' value='system' label='System' />
            </RadioGroup>
          </Section>
          <Section title='Sidebar'>
            <RadioGroup value={ui.sidebarVariant} onValueChange={(value) => ui.setSidebarVariant(value as 'sidebar' | 'floating' | 'inset')} className='grid grid-cols-3 gap-3'>
              <RadioCard id='variant-sidebar' value='sidebar' label='Sidebar' />
              <RadioCard id='variant-floating' value='floating' label='Floating' />
              <RadioCard id='variant-inset' value='inset' label='Inset' />
            </RadioGroup>
          </Section>
          <Section title='Collapse behavior'>
            <RadioGroup value={ui.sidebarCollapsible} onValueChange={(value) => ui.setSidebarCollapsible(value as 'offcanvas' | 'icon' | 'none')} className='grid grid-cols-3 gap-3'>
              <RadioCard id='collapse-offcanvas' value='offcanvas' label='Offcanvas' />
              <RadioCard id='collapse-icon' value='icon' label='Icon' />
              <RadioCard id='collapse-none' value='none' label='Pinned' />
            </RadioGroup>
          </Section>
        </div>
        <SheetFooter>
          <Button variant='outline' onClick={ui.resetUi}>
            <RotateCcw className='mr-2 size-4' />Reset
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className='flex flex-col gap-3'>
      <div className='text-sm font-medium text-muted-foreground'>{title}</div>
      {children}
      <Separator />
    </div>
  )
}

function RadioCard({ id, value, label }: { id: string; value: string; label: string }) {
  return (
    <Label htmlFor={id} className='cursor-pointer rounded-lg border bg-card p-3 text-center text-xs font-medium hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary has-[[data-state=checked]]:text-primary-foreground'>
      <RadioGroupItem id={id} value={value} className='sr-only' />
      {label}
    </Label>
  )
}
