import { get, type CallOptions } from "./client"

/**
 * The signed-in player's leaves from ranked matches in the last 24 hours (backend playAccess.ts). The 1st and 2nd leave only
 * cost EXP; the 3rd blocks playing for 30 minutes and every leave after that adds 30 more. While `cooldown` is set the
 * Connect and Quick play buttons are inactive and the game servers remove the player.
 */
export interface PlayStatus {
  leavesToday: number
  cooldown: { until: string; minutes: number } | null
  next: { cooldownMinutes: number }
}

export const playStatusService = {
  get(options?: CallOptions): Promise<PlayStatus> {
    return get<PlayStatus>("/play/status", undefined, options)
  },
}
