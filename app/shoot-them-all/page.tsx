import type { Viewport } from "next"
import { GameEngine } from "@/src/components/nova-ball/GameEngine"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function ShootThemAllPage() {
  return <GameEngine />
}

