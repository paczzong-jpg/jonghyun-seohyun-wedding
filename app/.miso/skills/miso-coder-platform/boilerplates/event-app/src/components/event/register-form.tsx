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

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  name: z.string().min(1, "이름을 입력하세요."),
  affiliation: z.string().min(1, "소속을 입력하세요."),
  email: z.string().email("올바른 이메일 주소를 입력하세요."),
  agreed: z.boolean().refine((v) => v === true, { message: "개인정보 수집에 동의해야 합니다." }),
})

type FormValues = z.infer<typeof schema>

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  onSubmit: (input: ParticipantInput) => Promise<void>
  isSubmitting: boolean
}

/**
 * 참가 신청 폼 — 이름·소속·이메일·개인정보 동의.
 * 제출 성공/실패 처리는 부모(RegisterPage)에서 담당한다.
 */
export function RegisterForm({ onSubmit, isSubmitting }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", affiliation: "", email: "", agreed: false },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      name: values.name,
      affiliation: values.affiliation,
      email: values.email,
      agreed: values.agreed,
    })
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름 *</FormLabel>
              <FormControl>
                <Input placeholder="홍길동" {...field} />
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
                <Input placeholder="회사 / 학교 / 개인" {...field} />
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
                <Input type="email" placeholder="your@email.com" {...field} />
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
                <FormLabel className="cursor-pointer">
                  개인정보 수집·이용에 동의합니다 *
                </FormLabel>
                <p className="text-xs text-muted-foreground">
                  수집 항목: 이름, 소속, 이메일 / 목적: 행사 신청 확인 및 안내 / 보유: 행사 종료 후 30일
                </p>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "신청 중..." : "신청하기"}
        </Button>
      </form>
    </Form>
  )
}
