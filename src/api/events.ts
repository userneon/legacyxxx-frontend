import { del, get, post, put, type CallOptions } from "./client"

/** A holiday the site, the app and the bot dress up for (backend siteEvents.ts). */
export type EventTheme = "halloween" | "new-year" | "tsagaan-sar"

export interface ActiveEvent {
  theme: EventTheme
  title: string
  startsOn: string
  endsOn: string
}

export interface StaffEvent {
  id: string
  theme: EventTheme
  title: string
  startsOn: string
  endsOn: string
  enabled: boolean
}

export type StaffEventInput = Omit<StaffEvent, "id">

export interface StaffEventList {
  /** Today in Ulaanbaatar (YYYY-MM-DD), the day the schedule is read by. */
  today: string
  runningId: string | null
  events: StaffEvent[]
}

export const eventsService = {
  /** Public: the event that runs today, or null. */
  active: async (options?: CallOptions) => (await get<{ event: ActiveEvent | null }>("/api/v1/public/events/active", undefined, { ...options, skipAuth: true })).event,
  /** Owner only. */
  list: (options?: CallOptions) => get<StaffEventList>("/api/v1/staff/events", undefined, options),
  create: (input: StaffEventInput, options?: CallOptions) => post<{ event: StaffEvent }>("/api/v1/staff/events", input, options),
  update: (id: string, input: StaffEventInput, options?: CallOptions) => put<{ event: StaffEvent }>(`/api/v1/staff/events/${encodeURIComponent(id)}`, input, options),
  remove: (id: string, options?: CallOptions) => del<{ deleted: boolean }>(`/api/v1/staff/events/${encodeURIComponent(id)}`, options),
}
