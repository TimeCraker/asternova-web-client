import type { ReactNode } from "react"
import { MobileLandscapeGameShell } from "@/src/components/game-shell/MobileLandscapeGameShell"

export default function ShootThemAllLayout({ children }: { children: ReactNode }) {
  return <MobileLandscapeGameShell>{children}</MobileLandscapeGameShell>
}
