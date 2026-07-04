import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { ParticipantInput } from "@/lib/event-data"

const schema = z.object({
  name: z.string().min(1, "이름을 입력하세요."),
  affiliation: z.string().min(1, "소속을 입력하세요."),
  email: z.string().email("올바른 이메일 주소를 입력하세요."),
  phone: z.string().optional(),
  agreed: z.boolean().refine((v) => v === true, { message: "개인정보 수집에 동의해야 합니다." }),
})

type FormValues = z.infer<typeof schema>

type Props = {
  eventCode: string
  isSubmitting: boolean
  onSubmit: (input: ParticipantInput) => Promise<void>
}

export function JoinCheckinForm({ eventCode, isSubmitting, onSubmit }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", affiliation: "", email: "", phone: "", agreed: false },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      ...values,
      eventCode,
      joinCode: eventCode,
    })
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름 *</FormLabel>
              <FormControl>
                <Input placeholder="Ally" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="affiliation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>소속 *</FormLabel>
              <FormControl>
                <Input placeholder="MISO / FE 개발 / UI/UX" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이메일 *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>휴대폰</FormLabel>
              <FormControl>
                <Input placeholder="010-0000-0000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="agreed"
          render={({ field }) => (
            <FormItem className="flex items-start gap-3 rounded-lg border border-border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="cursor-pointer">행사 참여 및 점수 집계에 동의합니다 *</FormLabel>
                <p className="text-xs text-muted-foreground">
                  수집 항목: 이름, 소속, 연락처 / 목적: 체크인, Q&A, 퀴즈, 경품추첨 운영
                </p>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "체크인 중..." : "체크인하고 참가"}
        </Button>
      </form>
    </Form>
  )
}
