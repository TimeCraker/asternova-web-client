"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Orbitron } from "next/font/google"

import { CinematicBlackHole } from "@/src/components/CinematicBlackHole"
import { Button } from "@/components/ui/button"
import { useGameStore } from "@/src/store/useGameStore"

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

export default function ArenaPage() {
  const router = useRouter()
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const [isEngineLoaded, setIsEngineLoaded] = React.useState(false)

  const token = useGameStore((s) => s.token)
  const userId = useGameStore((s) => s.userId)
  // ===== 新增代码 START =====
  const username = useGameStore((s) => s.username)
  // ===== 新增代码 END =====
  const currentRoomId = useGameStore((s) => s.currentRoomId)
  const selectedClass = useGameStore((s) => s.selectedClass)
  const sessionReadyForBattle = useGameStore((s) => s.sessionReadyForBattle)

  const canEnterArena = Boolean(token && userId && currentRoomId && sessionReadyForBattle)

  // 严格安全的路由守卫：逃跑惩罚与断线踢出
  React.useEffect(() => {
    // 1. 刷新惩罚：没有 sessionReadyForBattle 通行证（玩家按了刷新）
    if (!sessionReadyForBattle) {
      const state = useGameStore.getState()
      state.clearAuth() // 严厉惩罚：彻底清空 Token 和 userId
      state.setCurrentRoomId("")
      toast.error("检测到战斗中刷新，判定为逃跑。已清空身份，请重新登录！")
      router.replace("/login") // 直接踢回登录页
      return
    }

    // 2. 状态丢失：有通行证，但 Token 意外丢失
    if (!canEnterArena) {
      toast.error("战场会话已失效，请重新登录")
      useGameStore.getState().clearAuth()
      router.replace("/login")
    }
  }, [sessionReadyForBattle, canEnterArena, router])

  const handleGodotLoad = React.useCallback(() => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return

    setIsEngineLoaded(true)

    // ===== 新增代码 START =====
    type EnterBattlePayload = {
      token: string
      userId: number
      username: string
      roomId: string
      selectedClass: string
      wsBase: string
    }
    // ===== 新增代码 END =====
    const payload: EnterBattlePayload = {
      token,
      userId,
      // ===== 新增代码 START =====
      username,
      // ===== 新增代码 END =====
      roomId: currentRoomId,
      selectedClass,
      wsBase: "ws://127.0.0.1:8081/ws",
    }

    // 使用轮询等待 Godot 引擎初始化并挂载方法
    const tryInject = () => {
      const cw = iframeRef.current?.contentWindow as any
      if (cw && typeof cw.enterBattle === "function") {
        try {
          cw.enterBattle(JSON.stringify(payload))
          console.log("[ArenaPage] 已向 Godot 注入战场参数")
        } catch (err) {
          console.error("[ArenaPage] 向 Godot 注入参数失败:", err)
        }
      } else {
        // 如果还没有挂载上，等待 100ms 后重试
        setTimeout(tryInject, 100)
      }
    }

    tryInject()
  }, [token, userId, username, currentRoomId, selectedClass])

  React.useEffect(() => {
    const handleBattleResult = (event: Event) => {
      const customEvent = event as CustomEvent<{ resultType?: string; payload?: unknown }>
      const { resultType = "", payload } = customEvent.detail ?? {}
      console.log("收到 Godot 战斗结果:", resultType, payload)

      if (resultType === "win" || resultType === "victory" || resultType === "opponent_left") {
        toast.success("对局结束：对手离线，你已获胜")
      } else if (resultType) {
        toast.info(`对局结束：${resultType}`)
      } else {
        toast.info("对局结束")
      }

      router.replace("/lobby")
    }

    window.addEventListener("unity:battle_result", handleBattleResult)
    return () => window.removeEventListener("unity:battle_result", handleBattleResult)
  }, [router])

  React.useEffect(() => {
    if (!canEnterArena) return
    const onBeforeUnload = () => {
      const { token: t, currentRoomId: rid } = useGameStore.getState()
      if (t && rid) {
        try {
          const blob = new Blob([JSON.stringify({ roomId: rid, reason: "page_unload" })], { type: "application/json" })
          navigator.sendBeacon("/api/proxy/battle_forfeit", blob)
        } catch {}
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)

    // 关键修正：坚决不在这里重置 sessionReadyForBattle！全权交给内存生命周期自然销毁
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
    }
  }, [canEnterArena])

  if (!canEnterArena) {
    return null
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white">
      <CinematicBlackHole interactive={false} intensity={0.95} opacity={0.3} className="pointer-events-none absolute inset-0" />

      <div className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${isEngineLoaded ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <iframe
          ref={iframeRef}
          src="/godot/GoDot_game.html"
          className="w-full h-full border-none outline-none"
          onLoad={handleGodotLoad}
        />
      </div>

      {!isEngineLoaded && (
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          <div className="w-full max-w-2xl px-6">
            <div className="mx-auto rounded-2xl border border-white/10 bg-black/45 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_90px_rgba(142,45,226,0.14)] backdrop-blur">
              <div className={[orbitron.className, "text-center"].join(" ")}>
                <div className="text-xs tracking-[0.35em] text-white/50">ASTER NOVA</div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-cyan-100 drop-shadow-[0_0_18px_rgba(142,45,226,0.20)]">
                  ASTERNOVA 核心引擎启动中…
                </div>
                <div className="mt-4 text-sm text-white/65">正在建立神经链路，请稍候...</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEngineLoaded && (
        <div className="absolute left-4 top-4 z-20">
          <Button asChild variant="secondary" className="border border-white/12 bg-black/40 text-white backdrop-blur-md">
            <Link href="/lobby">紧急撤离（返回大厅）</Link>
          </Button>
        </div>
      )}
    </div>
  )
}