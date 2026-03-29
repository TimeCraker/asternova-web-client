"use client"

import * as React from "react"
import { tryLockLandscapeOrientation, useMobileGameViewport } from "@/src/hooks/useMobileGameViewport"

type Props = { children: React.ReactNode }

/**
 * 桌面 / 手机横屏：常规全宽全高流式布局。
 * 手机竖屏：整页旋转 90°，用短边×长边作为逻辑横屏画布，并尝试 Screen Orientation API 锁定横屏。
 */
export function MobileLandscapeGameShell({ children }: Props) {
  const { isMobile, isPortraitMobile } = useMobileGameViewport()
  const triedLock = React.useRef(false)

  React.useEffect(() => {
    if (!isMobile) return
    tryLockLandscapeOrientation()
  }, [isMobile])

  const onInteract = React.useCallback(() => {
    if (triedLock.current) return
    triedLock.current = true
    tryLockLandscapeOrientation()
  }, [])

  if (!isMobile || !isPortraitMobile) {
    return (
      <div className="relative min-h-[100dvh] min-h-screen w-full max-w-[100vw] overflow-x-hidden">
        {children}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[200] overflow-hidden bg-black"
      onPointerDown={onInteract}
      style={{
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <p
        className="pointer-events-none absolute left-1/2 top-[max(0.5rem,env(safe-area-inset-top))] z-[201] max-w-[90vw] -translate-x-1/2 rounded-full border border-white/12 bg-black/65 px-3 py-1 text-center text-[10px] leading-snug text-white/65 backdrop-blur-md"
        aria-live="polite"
      >
        竖屏已自动横屏显示 · 也可将手机横握
      </p>
      <div
        className="mobile-game-landscape-rotor absolute overflow-hidden bg-black"
        style={{
          width: "100dvh",
          height: "100dvw",
          maxWidth: "100dvh",
          maxHeight: "100dvw",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(90deg)",
        }}
      >
        <div className="mobile-game-landscape-fill h-full w-full">{children}</div>
      </div>
    </div>
  )
}
