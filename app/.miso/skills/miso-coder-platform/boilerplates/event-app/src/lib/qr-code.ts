import { DEFAULT_EVENT_CODE } from "@/lib/event-constants"

export function normalizeEventCode(code: string | undefined): string {
  const trimmed = (code ?? "").trim()
  return trimmed.length > 0 ? trimmed : DEFAULT_EVENT_CODE
}

export function buildJoinUrl(eventCode = DEFAULT_EVENT_CODE): string {
  const code = encodeURIComponent(normalizeEventCode(eventCode))
  if (typeof window === "undefined") return `/join/${code}`
  return `${window.location.origin}/join/${code}`
}

export function buildQrImageUrl(targetUrl: string, size = 220): string {
  const px = Math.max(160, Math.min(size, 360))
  const encoded = encodeURIComponent(targetUrl)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${px}x${px}&margin=12&data=${encoded}`
}
