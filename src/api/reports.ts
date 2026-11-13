import { get, post, type CallOptions } from "./client"

/** Player reports from the website (owner request 2026-11-13). A signed-in player reports another player; staff (Admin and above) answer on the staff site. */
export type ReportCategory = "cheating" | "griefing" | "toxic" | "boosting" | "other"
export const REPORT_CATEGORIES: Array<{ id: ReportCategory; label: string; hint: string }> = [
  { id: "cheating", label: "Cheating", hint: "Walls, aim help, speed or other hacks" },
  { id: "griefing", label: "Griefing", hint: "Team damage, blocking, throwing rounds" },
  { id: "toxic", label: "Toxic chat or voice", hint: "Insults, threats, spam" },
  { id: "boosting", label: "Boosting", hint: "Losing on purpose, account sharing" },
  { id: "other", label: "Something else", hint: "Anything staff should look at" },
]
export const reportCategoryLabel = (id: string) => REPORT_CATEGORIES.find((entry) => entry.id === id)?.label ?? id

export interface ReportPerson { username: string; avatar: string | null; steamId: string }
export interface StaffReport {
  id: string
  category: ReportCategory
  reason: string
  evidenceUrl: string | null
  status: "open" | "actioned" | "dismissed"
  staffNote: string | null
  createdAt: string
  handledAt: string | null
  reporter: ReportPerson
  reported: ReportPerson & { openReports: number; banned: boolean }
}

export const reportsService = {
  create: (input: { reportedUserId: string; category: ReportCategory; reason: string; evidenceUrl?: string }, options?: CallOptions) => post<{ id: string }>("/api/v1/reports", input, options),
  /** Staff: the open queue, or the latest answered ones. */
  list: (status: "open" | "closed", options?: CallOptions) => get<StaffReport[]>("/api/v1/moderation/reports", { status }, options),
  resolve: (id: string, input: { outcome: "actioned" | "dismissed"; note?: string }, options?: CallOptions) => post<void>(`/api/v1/moderation/reports/${encodeURIComponent(id)}/resolve`, input, options),
}
