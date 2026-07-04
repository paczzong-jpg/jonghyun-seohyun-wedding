import { Copy, QrCode } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buildJoinUrl, buildQrImageUrl, normalizeEventCode } from "@/lib/qr-code"

type Props = {
  eventCode?: string
}

export function JoinQrCard({ eventCode }: Props) {
  const code = normalizeEventCode(eventCode)
  const joinUrl = useMemo(() => buildJoinUrl(code), [code])
  const qrUrl = useMemo(() => buildQrImageUrl(joinUrl, 240), [joinUrl])
  const [copied, setCopied] = useState(false)

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="size-4" />
            참가 QR
          </CardTitle>
          <Badge variant="secondary" className="font-mono uppercase">
            {code}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="mx-auto flex size-60 items-center justify-center rounded-lg border border-border bg-background p-3">
          <img
            src={qrUrl}
            alt={`${code} 참가 QR`}
            className="size-full rounded-md"
          />
        </div>
        <div className="space-y-2">
          <p className="break-all rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {joinUrl}
          </p>
          <Button type="button" variant="outline" className="w-full" onClick={copyUrl}>
            <Copy className="mr-2 size-4" />
            {copied ? "복사됨" : "참가 URL 복사"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
