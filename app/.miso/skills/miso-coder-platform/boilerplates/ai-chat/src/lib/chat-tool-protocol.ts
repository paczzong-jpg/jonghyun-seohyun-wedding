import { z } from "zod"
import type { DirectLlmToolInvocation } from "@/lib/miso-sdk/miso-llm"
import type { ArtifactKind } from "@/lib/chat-types"

export const artifactKindSchema = z.enum(["text", "code", "sheet", "image"])

export const createArtifactInputSchema = z.object({
  kind: artifactKindSchema,
  title: z.string().min(1),
  instruction: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  language: z.string().optional(),
  open: z.boolean().optional(),
})

export const updateArtifactInputSchema = z.object({
  artifactId: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  language: z.string().optional(),
})

export const editArtifactInputSchema = z.object({
  artifactId: z.string().min(1).optional(),
  oldString: z.string().min(1),
  newString: z.string(),
  replaceAll: z.boolean().optional(),
})

export const requestSuggestionsInputSchema = z.object({
  artifactId: z.string().min(1).optional(),
  instruction: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  originalText: z.string().min(1).optional(),
  suggestedText: z.string().min(1).optional(),
})

export type ArtifactToolName = "createArtifact" | "updateArtifact" | "editArtifact" | "requestSuggestions"
export type CreateArtifactToolInput = z.infer<typeof createArtifactInputSchema>
export type UpdateArtifactToolInput = z.infer<typeof updateArtifactInputSchema>
export type EditArtifactToolInput = z.infer<typeof editArtifactInputSchema>
export type RequestSuggestionsToolInput = z.infer<typeof requestSuggestionsInputSchema>

export type ArtifactToolOutput = {
  artifactId?: string
  suggestionId?: string
  title?: string
  kind?: ArtifactKind
  version?: number
  message: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isToolState(value: unknown): value is DirectLlmToolInvocation["state"] {
  return value === "input-available" || value === "output-available" || value === "output-error"
}

function isArtifactToolName(value: unknown): value is ArtifactToolName {
  return value === "createArtifact" || value === "updateArtifact" || value === "editArtifact" || value === "requestSuggestions"
}

export function readToolInvocations(metadata: Record<string, unknown> | undefined): DirectLlmToolInvocation[] {
  const rawInvocations = metadata?.toolInvocations
  if (!Array.isArray(rawInvocations)) return []
  return rawInvocations.filter((invocation): invocation is DirectLlmToolInvocation => {
    if (!isRecord(invocation)) return false
    return (
      typeof invocation.toolCallId === "string" &&
      isArtifactToolName(invocation.toolName) &&
      isToolState(invocation.state) &&
      invocation.input !== undefined
    )
  })
}

export function toolOutputText(invocation: DirectLlmToolInvocation): string {
  if (invocation.state === "output-error") return invocation.errorText ?? "Tool execution failed."
  if (!isRecord(invocation.output)) return "Waiting for tool result."
  return typeof invocation.output.message === "string" ? invocation.output.message : "Tool execution completed."
}
