import { Palette } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useAdminUi } from '@/context/admin-ui-provider'

export function AppearanceSettingsPage() {
  const { theme, setTheme } = useAdminUi()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Theme options mirror the shadcn-admin config drawer.</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')} className='grid gap-3 sm:grid-cols-3'>
          {(['light', 'dark', 'system'] as const).map((item) => (
            <Label key={item} htmlFor={'theme-' + item} className='flex cursor-pointer items-center gap-3 rounded-md border p-4'>
              <RadioGroupItem id={'theme-' + item} value={item} />
              <span className='capitalize'>{item}</span>
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter><Button onClick={() => toast.success('Theme preference saved')}><Palette className='mr-2 size-4' />Apply theme</Button></CardFooter>
    </Card>
  )
}
