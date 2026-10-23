import { del, get, post, type CallOptions } from "./client"

/** One message in the public chat (bottom right of the site). */
export interface ChatMessage {
  id: string
  body: string
  createdAt: string
  author: {
    steamId: string
    name: string
    avatar: string | null
    frame: string | null
    nameStyle: { color: string | null; glow: string | null; colorFx?: string | null; glowFx?: string | null } | null
    staffRole: "OWNER" | "MANAGER" | "ADMIN" | null
  }
}

export const chatService = {
  list: async (options?: CallOptions) => (await get<{ messages: ChatMessage[] }>("/api/v1/public/chat", undefined, { ...options, skipAuth: true })).messages,
  send: async (body: string, options?: CallOptions) => (await post<{ message: ChatMessage }>("/api/v1/chat", { body }, options)).message,
  /** Staff who can ban. */
  remove: (id: string, options?: CallOptions) => del<void>(`/api/v1/staff/chat/${encodeURIComponent(id)}`, options),
}
