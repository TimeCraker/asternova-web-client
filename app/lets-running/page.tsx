import type { Viewport } from "next"
import { StarDashGame } from "@/src/components/star-dash/StarDashGame"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function LetsRunningPage() {
  return <StarDashGame />
}
