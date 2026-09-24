/**
 * The signed-in player's competitive profile (rank, EXP, next threshold, Pro League access), shared by the
 * profile menu, the sidebar Pro League lock and the Play pages. Read-only: the API alone changes EXP.
 */
import { createContext, useContext, type ReactNode } from "react"

import { competitiveService, type CompetitiveProfile } from "@/api"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"

interface MyRankValue {
  profile: CompetitiveProfile | null
  loading: boolean
  refetch: () => void
}

const MyRankContext = createContext<MyRankValue>({ profile: null, loading: false, refetch: () => {} })

export function MyRankProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { data, loading, refetch } = useApiQuery<CompetitiveProfile>((signal) => competitiveService.getPlayer(user!.id, { signal }), {
    enabled: Boolean(user),
    queryKey: user?.id ?? "guest",
  })
  return <MyRankContext.Provider value={{ profile: user ? data : null, loading, refetch }}>{children}</MyRankContext.Provider>
}

export function useMyRank(): MyRankValue {
  return useContext(MyRankContext)
}
