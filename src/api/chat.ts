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
    frameLook?: import("@/lib/frame-look").FrameLook | null
    nameStyle: { color: string | null; glow: string | null; colorFx?: string | null; glowFx?: string | null } | null
    perk?: { tier: string; name: string } | null
    staffRole: "OWNER" | "MANAGER" | "ADMIN" | null
  }
}

/** A room of the chat: the community ("global") or a clan's own ("clan:<id>", only its members). */
export interface ChatRoom {
  room: string
  kind: "global" | "clan"
  name: string
}

export const chatService = {
  /** The community chat is public; a clan's room needs a sign-in and membership. */
  list: async (options?: CallOptions, room = "global") => (room === "global"
    ? (await get<{ messages: ChatMessage[] }>("/api/v1/public/chat", undefined, { ...options, skipAuth: true })).messages
    : (await get<{ messages: ChatMessage[] }>("/api/v1/chat/room", { room }, options)).messages),
  /** The rooms the signed-in player can open (the community chat, and their clan's). */
  rooms: async (options?: CallOptions) => (await get<{ rooms: ChatRoom[] }>("/api/v1/chat/rooms", undefined, options)).rooms,
  send: async (body: string, options?: CallOptions, room = "global") => (await post<{ message: ChatMessage }>("/api/v1/chat", room === "global" ? { body } : { body, room }, options)).message,
  /** Staff who can ban. */
  remove: (id: string, options?: CallOptions) => del<void>(`/api/v1/staff/chat/${encodeURIComponent(id)}`, options),
}
