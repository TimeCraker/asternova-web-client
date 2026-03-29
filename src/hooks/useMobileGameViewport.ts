"use client"

import * as React from "react"

/**
 * Client-only: coarse mobile / tablet heuristic (UA + touch + pointer).
 */
export function detectMobileClient(): boolean {
  if (typeof window === "undefined") return false

  const ua = navigator.userAgent || ""
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|SamsungBrowser|Kindle|Silk/i.test(ua)) {
    return true
  }

  const touchCapable = "ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0
  if (touchCapable && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) {
    return true
  }

  return false
}

function isPortraitViewport(): boolean {
  if (typeof window === "undefined") return false
  return window.innerHeight > window.innerWidth
}

export type MobileGameViewport = {
  isMobile: boolean
  /** True when mobile and viewport is taller than wide (user should rotate). */
  isPortraitMobile: boolean
  shouldShowLandscapeHint: boolean
}

/** 尝试锁定横屏（部分 Android Chrome 在用户手势后可用；iOS 通常无效，需配合 CSS 旋转壳） */
export function tryLockLandscapeOrientation(): void {
  if (typeof window === "undefined") return
  const ori = screen.orientation as ScreenOrientation & { lock?: (o: OrientationLockType) => Promise<void> }
  void ori?.lock?.("landscape-primary").catch(() => {
    /* unsupported or not allowed */
  })
}

/**
 * Tracks mobile detection and portrait vs landscape for arena / embedded games.
 */
export function useMobileGameViewport(): MobileGameViewport {
  const [isMobile, setIsMobile] = React.useState(false)
  const [isPortrait, setIsPortrait] = React.useState(false)

  React.useLayoutEffect(() => {
    const sync = () => {
      setIsMobile(detectMobileClient())
      setIsPortrait(isPortraitViewport())
    }

    sync()

    window.addEventListener("resize", sync)
    window.addEventListener("orientationchange", sync)

    const mql = typeof window.matchMedia === "function" ? window.matchMedia("(orientation: portrait)") : null
    mql?.addEventListener("change", sync)

    return () => {
      window.removeEventListener("resize", sync)
      window.removeEventListener("orientationchange", sync)
      mql?.removeEventListener("change", sync)
    }
  }, [])

  const isPortraitMobile = isMobile && isPortrait

  return {
    isMobile,
    isPortraitMobile,
    shouldShowLandscapeHint: isPortraitMobile,
  }
}
