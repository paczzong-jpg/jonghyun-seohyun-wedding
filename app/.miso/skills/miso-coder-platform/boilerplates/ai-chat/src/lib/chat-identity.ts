import type { ChatIdentity } from "@/lib/chat-types"
import { getMisoCurrentUser } from "@/lib/miso-sdk/miso-auth"

const STORAGE_KEY = "miso-chat:identity"

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function sanitizeIdentity(value: ChatIdentity): ChatIdentity {
  return {
    userKey: value.userKey,
    displayName: value.displayName.trim() || "Guest User",
    email: value.email?.trim() || undefined,
    role: value.role,
    source: value.source ?? "guest",
  }
}

export function getGuestChatIdentity(): ChatIdentity {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return sanitizeIdentity(JSON.parse(raw) as ChatIdentity)
  } catch {
    // fall through to guest identity
  }

  const identity: ChatIdentity = {
    userKey: `guest:${randomId()}`,
    displayName: "Guest User",
    role: "guest",
    source: "guest",
  }
  saveChatIdentity(identity)
  return identity
}

export function saveChatIdentity(identity: ChatIdentity): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeIdentity(identity)))
}

export function updateChatIdentity(patch: Partial<ChatIdentity>): ChatIdentity {
  const next = sanitizeIdentity({ ...getGuestChatIdentity(), ...patch })
  saveChatIdentity(next)
  return next
}

export function resetChatIdentity(): ChatIdentity {
  localStorage.removeItem(STORAGE_KEY)
  return getGuestChatIdentity()
}

export async function resolveChatIdentity(): Promise<ChatIdentity> {
  try {
    const auth = await getMisoCurrentUser()
    if (auth.authenticated && auth.user?.id) {
      return {
        userKey: `miso:${auth.user.id}`,
        displayName: auth.user.name ?? auth.user.email ?? "MISO User",
        email: auth.user.email ?? undefined,
        role: "member",
        source: "miso",
      }
    }
  } catch {
    // Published external apps and preview sandboxes can run without MISO auth.
  }
  return getGuestChatIdentity()
}
