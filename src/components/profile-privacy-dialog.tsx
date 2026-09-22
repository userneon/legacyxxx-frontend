import { useEffect, useState } from "react"
import { Loader2, Lock } from "lucide-react"
import { toast } from "sonner"

import { profileService } from "@/api"
import type { ApiError, ProfileSection, UserProfile } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

const SECTIONS: { id: ProfileSection; label: string }[] = [
  { id: "kd", label: "K/D ratio" },
  { id: "matches", label: "Matches" },
  { id: "kills", label: "Kills & combat" },
  { id: "faceit", label: "FACEIT" },
  { id: "recent_matches", label: "Recent matches" },
]

/** Profile settings: which boxes other players see. Unchecking a box removes it from the profile. */
export function ProfilePrivacyDialog({ profile, open, onOpenChange, onSaved }: {
  profile: UserProfile
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [hidden, setHidden] = useState<ProfileSection[]>(profile.hiddenSections ?? [])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setHidden(profile.hiddenSections ?? [])
  }, [open, profile.hiddenSections])

  const toggle = (section: ProfileSection, shown: boolean) => {
    setHidden((current) => (shown ? current.filter((item) => item !== section) : [...current, section]))
  }

  const save = async () => {
    setSaving(true)
    try {
      await profileService.updateProfile({ hiddenSections: hidden })
      toast.success("Profile settings saved")
      onSaved()
      onOpenChange(false)
    } catch (error) {
      const apiError = error as Partial<ApiError>
      toast.error(apiError.status === 503 ? "Profile settings are not available yet" : "Could not save your profile settings")
    } finally {
      setSaving(false)
    }
  }

  const unchanged = [...hidden].sort().join() === [...(profile.hiddenSections ?? [])].sort().join()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-sm">
        <DialogTitle>Profile settings</DialogTitle>
        <DialogDescription>Choose what other players see on your profile.</DialogDescription>
        <div className="flex flex-col gap-1">
          {SECTIONS.map((section) => {
            const shown = !hidden.includes(section.id)
            return (
              <label key={section.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary/50">
                <span className="text-sm">{section.label}</span>
                <Checkbox checked={shown} onCheckedChange={(checked) => toggle(section.id, checked === true)} aria-label={`Show ${section.label}`} />
              </label>
            )
          })}
        </div>
        <p className="flex items-start gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          Penalty history, SteamID, Steam link and rank are always shown.
        </p>
        <Button onClick={() => void save()} disabled={saving || unchanged}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Save
        </Button>
      </DialogContent>
    </Dialog>
  )
}
