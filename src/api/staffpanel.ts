import { get, patch, post, type CallOptions } from "./client"
import type { PhantomEvidenceEntry, PhantomReviewDecision, PhantomSuspensionCase, StaffPanelAccess, StaffPanelAction, StaffPanelActionRequest, StaffPanelDatabaseOverview, StaffPanelOverview } from "./types"

export const staffPanelService = {
  access: (options?: CallOptions) => get<StaffPanelAccess>("/staffpanel/access", undefined, options),
  overview: (options?: CallOptions) => get<StaffPanelOverview>("/staffpanel/overview", undefined, options),
  database: (options?: CallOptions) => get<StaffPanelDatabaseOverview>("/staffpanel/database", undefined, options),
  phantomCases: (options?: CallOptions) => get<{ cases: PhantomSuspensionCase[] }>("/staffpanel/anti-cheat/phantom-cases", undefined, options),
  phantomEvidence: (options?: CallOptions) => get<{ evidence: PhantomEvidenceEntry[] }>("/staffpanel/anti-cheat/phantom-evidence", undefined, options),
  reviewPhantomCase: (caseId: string, input: { decision: PhantomReviewDecision; note: string }, options?: CallOptions) =>
    patch<{ case: PhantomSuspensionCase }>(`/staffpanel/anti-cheat/phantom-cases/${encodeURIComponent(caseId)}`, input, options),
  queueAction: (input: StaffPanelActionRequest, options?: CallOptions) => post<{ action: StaffPanelAction }>("/staffpanel/actions", input, options),
}
