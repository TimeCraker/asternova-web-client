import type { Viewport } from "next"
import { MergeGame } from "@/src/components/merge/MergeGame"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function MergePage() {
  return <MergeGame />
}
