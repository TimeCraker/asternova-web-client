import type { Viewport } from "next"
import { NebulaSurvivorGame } from "@/src/components/nebula-survivor/NebulaSurvivorGame"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function NebulaSurvivorPage() {
  return <NebulaSurvivorGame />
}
