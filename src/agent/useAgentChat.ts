import { useCallback, useRef, useState } from 'react'

/**
 * Lightweight client for the /api/chat SSE stream. Owns the conversation
 * thread state and the in-flight assistant message.
 *
 * Streams text deltas into `messages[last].content` so React re-renders as
 * the assistant types. Returns `streaming` true while the stream is open;
 * callers disable the input + send button on that.
 *
 * The hook is intentionally minimal — no tool calls, no rich components yet.
 * That arrives in a follow-up once the first plain turn works end-to-end.
 */

export type ChatMessage = {
  readonly role: 'user' | 'assistant'
  content: string
  /**
   * Extended-thinking trace for assistant messages — the model's internal
   * reasoning before the final answer. Populated by `thinking_delta` events
   * from the SSE stream; rendered in the UI as a collapsible panel above the
   * message body.
   */
  thinking?: string
  /**
   * Tool calls the model emitted during this turn. The client (AgentPage)
   * applies them to slot state / scene state / cart as they arrive.
   */
  toolCalls?: ReadonlyArray<{
    readonly id: string
    readonly name: string
    readonly input: Record<string, unknown>
  }>
}

export type ToolUseHandler = (call: { name: string; input: Record<string, unknown> }) => void

export function useAgentChat(
  systemPrompt: string,
  onToolUse?: ToolUseHandler,
  /** Current slot state — sent to /api/chat so the server can RAG-retrieve
   *  knowledge chunks (style guide, bundles, finish rules) tuned to the
   *  conversation's current signals. We use a ref so updates between renders
   *  don't re-bind the streaming callback. */
  slotStateRef?: { readonly current: unknown },
  /** AppContext identifier (Axis 1). Passed to the server so it reads
   *  knowledge from `contexts/<id>/`. Defaults to 'lowes-consumer'
   *  when omitted. */
  appContextId?: string,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Keep the latest callback in a ref so we don't have to re-bind handlers
  // mid-stream when the parent re-renders.
  const onToolUseRef = useRef<ToolUseHandler | undefined>(onToolUse)
  onToolUseRef.current = onToolUse

  const streamAssistantReply = useCallback(
    async (baseMessages: readonly ChatMessage[], userText: string) => {
      setError(null)

      const newUser: ChatMessage = { role: 'user', content: userText.trim() }
      const newAssistant: ChatMessage = { role: 'assistant', content: '' }
      const next = [...baseMessages, newUser, newAssistant]
      setMessages(next)
      setStreaming(true)

      const ac = new AbortController()
      abortRef.current = ac

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            systemPrompt,
            // Send all turns EXCEPT the empty assistant placeholder we just added.
            messages: next.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
            // Slot state for server-side RAG retrieval. Optional — if omitted
            // the server falls through to no dynamic knowledge injection.
            slotState: slotStateRef?.current ?? undefined,
            // AppContext for namespaced KB lookup (Axis 1).
            appContextId,
          }),
          signal: ac.signal,
        })
        if (!res.ok || !res.body) {
          const msg = await res.text().catch(() => `HTTP ${res.status}`)
          throw new Error(msg)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          // SSE events are separated by blank lines.
          let idx
          while ((idx = buf.indexOf('\n\n')) !== -1) {
            const raw = buf.slice(0, idx).trim()
            buf = buf.slice(idx + 2)
            if (!raw.startsWith('data: ')) continue
            const payload = raw.slice(6)
            if (payload === '[DONE]') break
            try {
              const obj = JSON.parse(payload) as { type: string; text?: string; message?: string }
              if (obj.type === 'text_delta' && obj.text) {
                setMessages((prev) => {
                  const copy = [...prev]
                  const last = copy[copy.length - 1]
                  copy[copy.length - 1] = { ...last, content: last.content + obj.text }
                  return copy
                })
              } else if (obj.type === 'thinking_delta' && obj.text) {
                setMessages((prev) => {
                  const copy = [...prev]
                  const last = copy[copy.length - 1]
                  copy[copy.length - 1] = {
                    ...last,
                    thinking: (last.thinking ?? '') + obj.text,
                  }
                  return copy
                })
              } else if (obj.type === 'tool_use') {
                const call = {
                  id: (obj as { id?: string }).id ?? '',
                  name: (obj as { name?: string }).name ?? '',
                  input: ((obj as { input?: Record<string, unknown> }).input ?? {}),
                }
                // Append to the assistant message's toolCalls list AND
                // notify the parent via callback so it can apply the side
                // effect (slot update, scene mutation, etc.) immediately.
                setMessages((prev) => {
                  const copy = [...prev]
                  const last = copy[copy.length - 1]
                  copy[copy.length - 1] = {
                    ...last,
                    toolCalls: [...(last.toolCalls ?? []), call],
                  }
                  return copy
                })
                onToolUseRef.current?.({ name: call.name, input: call.input })
              } else if (obj.type === 'error') {
                throw new Error(obj.message ?? 'stream error')
              }
            } catch {
              // Ignore malformed lines — we keep streaming.
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message)
        }
      } finally {
        setStreaming(false)
        abortRef.current = null
      }
    },
    [systemPrompt],
  )

  const send = useCallback(
    async (userText: string) => {
      if (!userText.trim() || streaming) return
      await streamAssistantReply(messages, userText.trim())
    },
    [messages, streaming, streamAssistantReply],
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
    setStreaming(false)
  }, [])

  /** Seed the conversation with a pre-built user message (entry context). */
  const seed = useCallback(
    async (entryUserContent: string) => {
      reset()
      await streamAssistantReply([], entryUserContent)
    },
    [reset, streamAssistantReply],
  )

  return { messages, streaming, error, send, reset, seed }
}
