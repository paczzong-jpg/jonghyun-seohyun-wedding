import { PanelLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useAdminUi } from '@/context/admin-ui-provider'

export function DisplaySettingsPage() {
  const { sidebarVariant, setSidebarVariant, sidebarCollapsible, setSidebarCollapsible } = useAdminUi()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Display</CardTitle>
        <CardDescription>Sidebar density and collapse behavior.</CardDescription>
      </CardHeader>
      <CardContent className='grid gap-6 md:grid-cols-2'>
        <div className='space-y-3'>
          <Label>Sidebar variant</Label>
          <RadioGroup value={sidebarVariant} onValueChange={(value) => setSidebarVariant(value as 'sidebar' | 'floating' | 'inset')}>
            {(['sidebar', 'floating', 'inset'] as const).map((item) => (
              <Label key={item} htmlFor={'variant-' + item} className='flex cursor-pointer items-center gap-3 rounded-md border p-3'>
                <RadioGroupItem id={'variant-' + item} value={item} />
                <span className='capitalize'>{item}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>
        <div className='space-y-3'>
          <Label>Collapse mode</Label>
          <RadioGroup value={sidebarCollapsible} onValueChange={(value) => setSidebarCollapsible(value as 'offcanvas' | 'icon' | 'none')}>
            {(['offcanvas', 'icon', 'none'] as const).map((item) => (
              <Label key={item} htmlFor={'collapse-' + item} className='flex cursor-pointer items-center gap-3 rounded-md border p-3'>
                <RadioGroupItem id={'collapse-' + item} value={item} />
                <span className='capitalize'>{item}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
      <CardFooter><Button onClick={() => toast.success('Display preference saved')}><PanelLeft className='mr-2 size-4' />Save display</Button></CardFooter>
    </Card>
  )
}
