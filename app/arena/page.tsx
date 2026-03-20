"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Orbitron } from "next/font/google"
import { Unity, useUnityContext } from "react-unity-webgl"

import { CinematicBlackHole } from "@/src/components/CinematicBlackHole"
import { Button } from "@/components/ui/button"
import { useGameStore } from "@/src/store/useGameStore"

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

type UnityBattleProps = {
  router: ReturnType<typeof useRouter>
  token: string
  userId: number
  currentRoomId: string
  selectedClass: string
  buildUrls: {
    loaderUrl: string
    dataUrl: string
    frameworkUrl: string
    codeUrl: string
  }
}

type UnityBattleHandle = {
  unload: () => Promise<void>
}

const UnityBattle = React.forwardRef<UnityBattleHandle, UnityBattleProps>(function UnityBattle(props, ref) {
  const { router, token, userId, currentRoomId, selectedClass, buildUrls } = props

  const { loaderUrl, dataUrl, frameworkUrl, codeUrl } = buildUrls

  const { unityProvider, isLoaded, loadingProgression, sendMessage, unload } = useUnityContext({
    loaderUrl,
    dataUrl,
    frameworkUrl,
    codeUrl,
  })

  React.useImperativeHandle(ref, () => ({ unload }), [unload])

  React.useEffect(() => {
    return () => {
      void unload()
    }
  }, [unload])

  // ===== 新增代码 START =====
  // 修改内容：前端跨端初始化单发锁，规避严格模式下重复注入
  // 修改原因：React 18 Strict Mode 下 effect 可能触发重复调用
  // 影响范围：仅 Unity EnterBattle 注入链路
  const hasSentInitRef = React.useRef(false)
  // ===== 新增代码 END =====
  const percent = Math.max(0, Math.min(100, Math.round((loadingProgression ?? 0) * 100)))

  // ===== 新增代码 START =====
  // Unity 初始化观测：加载进度日志、WASM 实例化拦截、异常兜底与卡死提示
  const [loadingText, setLoadingText] = React.useState("启动引擎中...")
  const stuckTimerRef = React.useRef<number | null>(null)
  const wasmPatchedRef = React.useRef(false)

  React.useEffect(() => {
    if (isLoaded) return
    const seq = ["启动引擎中...", "构造场景中..."]
    let idx = 0
    setLoadingText(seq[0])
    const t = window.setInterval(() => {
      idx = (idx + 1) % seq.length
      setLoadingText(seq[idx])
    }, 1200)
    return () => window.clearInterval(t)
  }, [isLoaded])

  React.useEffect(() => {
    // 进度日志：用于诊断卡在 100% 的场景
    // eslint-disable-next-line no-console
    console.debug(
      "[UnityWebGL] loadingProgression =",
      loadingProgression,
      "percent =",
      percent,
      "isLoaded =",
      isLoaded,
    )
  }, [loadingProgression, percent, isLoaded])

  React.useEffect(() => {
    if (wasmPatchedRef.current) return
    wasmPatchedRef.current = true

    const w = window as unknown as {
      WebAssembly?: typeof WebAssembly
    }
    if (!w.WebAssembly) return

    const originalInstantiateStreaming = w.WebAssembly.instantiateStreaming?.bind(
      w.WebAssembly,
    ) as typeof WebAssembly.instantiateStreaming | undefined
    const originalInstantiate = w.WebAssembly.instantiate?.bind(w.WebAssembly) as
      | typeof WebAssembly.instantiate
      | undefined

    // 拦截 instantiateStreaming（通常用于 wasm）
    if (originalInstantiateStreaming) {
      w.WebAssembly.instantiateStreaming = (async (source, importObject) => {
        try {
          // eslint-disable-next-line no-console
          console.debug("[UnityWebGL] WebAssembly.instantiateStreaming called", source)
          const res = await originalInstantiateStreaming(
            source as Parameters<typeof WebAssembly.instantiateStreaming>[0],
            importObject as Parameters<typeof WebAssembly.instantiateStreaming>[1],
          )
          // eslint-disable-next-line no-console
          console.debug("[UnityWebGL] WebAssembly.instantiateStreaming success")
          return res
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[UnityWebGL] WebAssembly.instantiateStreaming failed", err)
          throw err
        }
      }) as typeof WebAssembly.instantiateStreaming
    }

    // 拦截 instantiate（某些情况下会走这里）
    if (originalInstantiate) {
      w.WebAssembly.instantiate = (async (bufferSource, importObject) => {
        const size =
          bufferSource && typeof (bufferSource as ArrayBuffer).byteLength === "number"
            ? (bufferSource as ArrayBuffer).byteLength
            : undefined
        try {
          // eslint-disable-next-line no-console
          console.debug("[UnityWebGL] WebAssembly.instantiate called", { size })
          const res = await originalInstantiate(
            bufferSource as Parameters<typeof WebAssembly.instantiate>[0],
            importObject as Parameters<typeof WebAssembly.instantiate>[1],
          )
          // eslint-disable-next-line no-console
          console.debug("[UnityWebGL] WebAssembly.instantiate success")
          return res
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[UnityWebGL] WebAssembly.instantiate failed", err)
          throw err
        }
      }) as typeof WebAssembly.instantiate
    }

    // 捕获全局异常（包含 wasm / unity loader 的异常）
    const onError = (ev: Event) => {
      // eslint-disable-next-line no-console
      console.error("[UnityWebGL] window.error", ev)
    }
    const onRejection = (ev: PromiseRejectionEvent) => {
      // eslint-disable-next-line no-console
      console.error("[UnityWebGL] window.unhandledrejection", ev.reason)
    }
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])

  React.useEffect(() => {
    // 兜底：如果进度 100% 但 15 秒内仍未进入画布（isLoaded=false），提示玩家清缓存/重启
    if (isLoaded) {
      if (stuckTimerRef.current) {
        window.clearTimeout(stuckTimerRef.current)
        stuckTimerRef.current = null
      }
      return
    }

    if (percent < 100) {
      if (stuckTimerRef.current) {
        window.clearTimeout(stuckTimerRef.current)
        stuckTimerRef.current = null
      }
      return
    }

    if (stuckTimerRef.current) return
    stuckTimerRef.current = window.setTimeout(() => {
      if (!isLoaded) {
        toast.error("Unity 引擎卡死，请尝试清理缓存或重启")
      }
      stuckTimerRef.current = null
    }, 15000)

    return () => {
      if (stuckTimerRef.current) {
        window.clearTimeout(stuckTimerRef.current)
        stuckTimerRef.current = null
      }
    }
  }, [percent, isLoaded])
  // ===== 新增代码 END =====

  React.useEffect(() => {
    if (!isLoaded) return
    if (hasSentInitRef.current) return
    hasSentInitRef.current = true

    if (!token || !userId || !currentRoomId || !selectedClass) {
      toast.error("缺少进入战场所需数据，将返回大厅")
      router.push("/lobby")
      return
    }

    // ===== 新增代码 START =====
    // 修改内容：改为 JSON 载荷，向 Unity 注入 battle ws 初始化参数
    // 修改原因：Unity 端 BattleWsClient.EnterBattle 按 JSON 解析并执行 Protobuf WS 握手
    // 影响范围：仅前端 -> Unity 的初始化消息格式
    const battleWsBase = "ws://127.0.0.1:8081/ws"
    const payload = JSON.stringify({
      token,
      userId,
      roomId: currentRoomId,
      selectedClass,
      wsBase: battleWsBase,
    })
    // ===== 新增代码 END =====
    try {
      sendMessage("GameManager", "EnterBattle", payload)
    } catch {
      toast.error("跨端通信失败：无法向 Unity 注入战场参数")
    }
  }, [isLoaded, token, userId, currentRoomId, selectedClass, sendMessage, router])

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent text-white">
      <style>{`
        @keyframes neonPulse {
          0%, 100% { opacity: .55; transform: translateX(-25%); }
          50% { opacity: 1; transform: translateX(25%); }
        }
        @keyframes scanline {
          0% { transform: translateY(-120%); opacity: 0; }
          12% { opacity: .65; }
          100% { transform: translateY(120%); opacity: 0; }
        }
        @keyframes dataFlow {
          0% { transform: translateX(-20%); opacity: .15; }
          35% { opacity: .35; }
          100% { transform: translateX(120%); opacity: 0; }
        }
        .cyberText {
          background: linear-gradient(45deg, rgba(255,105,180,.95), #8E2DE2, rgba(0,229,255,.95));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
      `}</style>

      {/* ===== 新增代码 START ===== */}
      {/* 修改内容：Unity 画布始终挂载在 DOM，未加载时仅用 opacity 隐藏，避免 display/hidden 导致引擎停摆 */}
      <div
        className={[
          "absolute inset-0 h-full w-full transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
      >
        <div className="absolute inset-0 h-full w-full">
          <Unity
            unityProvider={unityProvider}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              background: "transparent",
            }}
          />
        </div>
      </div>
      {/* ===== 新增代码 END ===== */}

      {isLoaded ? (
        <div className="absolute left-4 top-4 z-20">
          <Button
            asChild
            variant="secondary"
            className="border border-white/12 bg-black/40 text-white backdrop-blur-md shadow-[0_0_0_1px_rgba(255,255,255,0.06)] hover:bg-black/55 hover:shadow-[0_0_0_1px_rgba(0,229,255,0.18),0_0_24px_rgba(142,45,226,0.14)]"
          >
            <Link href="/lobby">紧急撤离（返回大厅）</Link>
          </Button>
        </div>
      ) : null}

      {!isLoaded ? (
        <div className="relative z-50 flex h-full w-full items-center justify-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-black/45 to-black/80" />
          {/* 中央 HUD */}
          <div className="relative z-50 w-full max-w-2xl px-6">
            <div className="mx-auto rounded-2xl border border-white/10 bg-black/45 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_90px_rgba(142,45,226,0.14)] backdrop-blur">
              <div className={[orbitron.className, "text-center"].join(" ")}>
                <div className="text-xs tracking-[0.35em] text-white/50">ASTER NOVA</div>
                <div
                  className={[
                    "mt-3 text-2xl font-semibold tracking-tight cyberText",
                    "drop-shadow-[0_0_18px_rgba(142,45,226,0.20)]",
                  ].join(" ")}
                >
                  {/* ===== 新增代码 START ===== */}
                  ASTERONA 核心引擎启动中… <span className="ml-2 text-white/70">{loadingText}</span>
                  {/* ===== 新增代码 END ===== */}
                </div>

                <div className="mt-6 text-sm text-white/65">正在注入运行时数据流，请稍候</div>

                <div className="mt-7">
                  <div className="mb-3 flex items-center justify-center gap-3">
                    <div className="h-px w-12 bg-white/10" />
                    <div className={[orbitron.className, "cyberText text-lg font-bold tabular-nums"].join(" ")}>
                      {percent}%
                    </div>
                    <div className="h-px w-12 bg-white/10" />
                  </div>

                  {/* 刻度线 */}
                  <div className="relative mx-auto max-w-xl">
                    <div className="mb-2 flex items-center justify-between px-1">
                      {Array.from({ length: 13 }).map((_, i) => (
                        <span
                          key={i}
                          className={[
                            "inline-block w-[1px]",
                            i % 3 === 0 ? "h-3 bg-white/22" : "h-2 bg-white/12",
                          ].join(" ")}
                          style={{ opacity: i === 0 || i === 12 ? 0.35 : 0.55 }}
                        />
                      ))}
                    </div>

                    {/* 进度条轨道 */}
                    <div className="relative h-5 overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-inner">
                      {/* 扫描线 */}
                      <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-10"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(0,229,255,0) 0%, rgba(0,229,255,0.18) 30%, rgba(255,105,180,0.0) 100%)",
                          animation: "scanline 1.9s ease-in-out infinite",
                        }}
                      />

                      {/* 数据流粒子 */}
                      <div
                        className="pointer-events-none absolute left-0 top-1/2 h-2 w-24 -translate-y-1/2 rounded-full blur-sm"
                        style={{
                          background:
                            "linear-gradient(90deg, rgba(255,105,180,0), rgba(142,45,226,0.65), rgba(0,229,255,0))",
                          animation: "dataFlow 1.15s linear infinite",
                        }}
                      />

                      {/* 填充条 */}
                      <div
                        className="relative h-full rounded-full"
                        style={{
                          width: `${percent}%`,
                          background:
                            "linear-gradient(90deg, rgba(255,105,180,0.95), #8E2DE2, rgba(0,229,255,0.95))",
                          boxShadow:
                            "0 0 0 1px rgba(255,255,255,0.10), 0 0 22px rgba(142,45,226,0.35), 0 0 30px rgba(0,229,255,0.18)",
                        }}
                      >
                        {/* 脉冲光效（沿进度段轻微游走） */}
                        <div
                          className="pointer-events-none absolute inset-y-0 left-0 w-2/3 rounded-full blur-md"
                          style={{
                            background:
                              "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.30), rgba(255,255,255,0))",
                            animation: "neonPulse 1.05s ease-in-out infinite",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 资源缺失兜底提示 */}
                  <div className="mt-6 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-left text-xs text-white/65">
                    <div className="mb-1 text-white/80">Unity Build 资源检查</div>
                    <div className="font-mono text-white/60">
                      loader: {loaderUrl}
                      <br />
                      data: {dataUrl}
                      <br />
                      framework: {frameworkUrl}
                      <br />
                      wasm: {codeUrl}
                    </div>
                    <div className="mt-2 text-white/55">
                      若一直卡在加载：请把 Unity WebGL 导出的{" "}
                      <span className="font-mono text-white/70">Build.data / Build.framework.js / Build.wasm</span>（或对应的{" "}
                      <span className="font-mono text-white/70">.unityweb</span>）补齐到{" "}
                      <span className="font-mono text-white/70">public/unity/Build/</span>。
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <Button asChild className="bg-white/10 text-white hover:bg-white/15">
                  <Link href="/lobby">返回大厅</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
})

UnityBattle.displayName = "UnityBattle"

export default function ArenaPage() {
  const router = useRouter()
  const unityBattleRef = React.useRef<UnityBattleHandle | null>(null)

  const token = useGameStore((s) => s.token)
  const userId = useGameStore((s) => s.userId)
  const currentRoomId = useGameStore((s) => s.currentRoomId)
  const selectedClass = useGameStore((s) => s.selectedClass)
  // ===== 新增代码 START =====
  // 修改内容：在首帧即识别是否为浏览器刷新导航
  // 修改原因：避免刷新场景下先挂载 Unity 再异步跳转，造成误入战场
  // 影响范围：arena 页面入口守卫
  const isReloadNavigation = React.useMemo(() => {
    if (typeof window === "undefined") return false
    const navEntry = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
    return navEntry?.type === "reload"
  }, [])
  // ===== 新增代码 END =====
  // ===== 新增代码 START =====
  // 修改内容：战场准入硬校验（刷新即丢内存态，直接视为掉线）
  // 修改原因：业务规则要求不做刷新重连，不允许 sessionStorage 恢复房间态
  // 影响范围：仅 arena 路由入口渲染守卫
  const canEnterArena = Boolean(token && userId && currentRoomId) && !isReloadNavigation
  // ===== 新增代码 END =====

  // ===== 新增代码 START =====
  // 修改内容：检测浏览器刷新行为，刷新即判负并清空关键状态
  // 修改原因：业务规则明确不支持刷新重连
  // 影响范围：arena 路由入口守卫
  React.useEffect(() => {
    if (isReloadNavigation) {
      const state = useGameStore.getState()
      state.clearAuth()
      state.setCurrentRoomId("")
      toast.error("检测到刷新：判定掉线，已返回大厅")
      router.replace("/lobby")
    }
  }, [isReloadNavigation, router])
  // ===== 新增代码 END =====

  // ===== 新增代码 START =====
  // 路由守卫：未登录直接访问战场时，强制跳转登录页
  React.useEffect(() => {
    if (!canEnterArena) {
      toast.error("战场会话已失效，请重新进入房间")
      router.replace("/lobby")
    }
  }, [canEnterArena, router])
  // ===== 新增代码 END =====

  // ===== 新增代码 START =====
  // 修改内容：监听 Unity 回传的战斗结算事件，由前端主导弹提示并跳回大厅
  // 修改原因：对手掉线/判负消息由 Unity 解析后回传前端，完成业务闭环
  // 影响范围：arena 页面事件监听
  React.useEffect(() => {
    const onBattleResult = async (event: Event) => {
      const customEvent = event as CustomEvent<{ resultType?: string }>
      const resultType = customEvent?.detail?.resultType ?? ""
      if (resultType === "win" || resultType === "victory" || resultType === "opponent_left") {
        toast.success("对局结束：对手离线，你已获胜")
      } else if (resultType) {
        toast.info(`对局结束：${resultType}`)
      } else {
        toast.info("对局结束")
      }
      try {
        await unityBattleRef.current?.unload()
      } catch {
        /* unload 失败时仍跳转，避免卡在战场页 */
      }
      router.replace("/lobby")
    }
    window.addEventListener("unity:battle_result", onBattleResult)
    return () => window.removeEventListener("unity:battle_result", onBattleResult)
  }, [router])

  React.useEffect(() => {
    if (!canEnterArena) return
    const onBeforeUnload = () => {
      const { token: t, currentRoomId: rid } = useGameStore.getState()
      if (t && rid) {
        try {
          const blob = new Blob([JSON.stringify({ roomId: rid, reason: "page_unload" })], {
            type: "application/json",
          })
          navigator.sendBeacon("/api/proxy/battle_forfeit", blob)
        } catch {
          /* 浏览器可能禁止或后端未实现该路由，判负仍可由 WS close 兜底 */
        }
      }
      void unityBattleRef.current?.unload()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [canEnterArena])
  // ===== 新增代码 END =====

  // ===== 新增代码 START =====
  // 修改原因：将隐藏在 Console 的异常直接展示在 UI 顶层，便于定位 Unity/WebGL 的 silent error
  const [errorLog, setErrorLog] = React.useState<string[]>([])

  React.useEffect(() => {
    const push = (msg: string) => {
      setErrorLog((prev) => {
        const next = [...prev, msg]
        return next.slice(-30)
      })
    }

    const onErrorEvent = (event: ErrorEvent) => {
      const message = event.message || event.type || "UnknownError"
      const extra = event.filename ? ` @ ${event.filename}:${event.lineno ?? "?"}:${event.colno ?? "?"}` : ""
      const stack = event.error instanceof Error ? event.error.stack : undefined
      push(`[window.onerror] ${message}${extra}${stack ? `\n${stack}` : ""}`)
    }

    const onUnhandledRejection = (ev: PromiseRejectionEvent) => {
      const reason = ev?.reason
      const msg =
        reason instanceof Error
          ? `${reason.name}: ${reason.message}\n${reason.stack ?? ""}`
          : typeof reason === "string"
            ? reason
            : JSON.stringify(reason)
      push(`[unhandledrejection] ${msg}`)
    }

    window.addEventListener("error", onErrorEvent)
    window.addEventListener("unhandledrejection", onUnhandledRejection)
    return () => {
      window.removeEventListener("error", onErrorEvent)
      window.removeEventListener("unhandledrejection", onUnhandledRejection)
    }
  }, [])

  // Unity loader 预检：避免玩家卡在 0%（典型原因：Build.loader.js 404 被吞）
  const [loaderCheckState, setLoaderCheckState] = React.useState<"checking" | "ok" | "not_found">("checking")
  const [resolvedBuildUrls, setResolvedBuildUrls] = React.useState<{
    loaderUrl: string
    dataUrl: string
    frameworkUrl: string
    codeUrl: string
  } | null>(null)
  const [precheckLoadingText, setPrecheckLoadingText] = React.useState("启动引擎中...")

  React.useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const run = async () => {
      try {
        // ===== 新增代码 START =====
        // 修改原因：彻底抛弃 .gz，探活未压缩文件是否存在
        const buildBase = "/unity/Build"
        const candidates = [
          {
            loaderUrl: `${buildBase}/Build.loader.js`,
            dataUrl: `${buildBase}/Build.data`,
            frameworkUrl: `${buildBase}/Build.framework.js`,
            codeUrl: `${buildBase}/Build.wasm`,
          },
          {
            loaderUrl: `${buildBase}/Build.loader.js`,
            dataUrl: `${buildBase}/Build.data.unityweb`,
            frameworkUrl: `${buildBase}/Build.framework.js.unityweb`,
            codeUrl: `${buildBase}/Build.wasm.unityweb`,
          },
        ]

        for (const candidate of candidates) {
          const required = [candidate.loaderUrl, candidate.dataUrl, candidate.frameworkUrl, candidate.codeUrl]
          let allOk = true
          for (const url of required) {
            const res = await fetch(url, { method: "HEAD", signal: controller.signal })
            if (cancelled) return
            if (res.status === 404) {
              allOk = false
              break
            }
          }
          if (allOk) {
            setResolvedBuildUrls(candidate)
            setLoaderCheckState("ok")
            return
          }
        }
        setLoaderCheckState("not_found")
        // ===== 新增代码 END =====
      } catch {
        // 若网络异常/被拦截，仍允许继续走 Unity 初始化逻辑（由 Unity 自身兜底提示）
        if (!cancelled) setLoaderCheckState("ok")
      }
    }

    run()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  React.useEffect(() => {
    if (loaderCheckState === "ok" || loaderCheckState === "not_found") return
    const seq = ["启动引擎中...", "构造场景中..."]
    let idx = 0
    setPrecheckLoadingText(seq[0])
    const t = window.setInterval(() => {
      idx = (idx + 1) % seq.length
      setPrecheckLoadingText(seq[idx])
    }, 1200)
    return () => window.clearInterval(t)
  }, [loaderCheckState])
  // ===== 新增代码 END =====

  // ===== 新增代码 START =====
  // 修改内容：守卫失败时立即停止后续渲染，确保 Unity 不会被挂载
  // 修改原因：防止刷新后进入单机态
  // 影响范围：arena 页面渲染出口
  if (!canEnterArena) {
    return null
  }
  // ===== 新增代码 END =====

  if (loaderCheckState === "not_found") {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-black text-white">
        {/* ===== 新增代码 START ===== */}
        {errorLog.length ? (
          <div className="fixed left-0 right-0 top-0 z-50 max-h-[45vh] overflow-auto bg-red-500/20 p-3">
            <div className="rounded-lg bg-white p-3">
              <div className="mb-2 text-sm font-semibold text-red-600">Runtime Errors</div>
              <pre className="whitespace-pre-wrap break-words text-xs text-red-700">
                {errorLog.join("\n\n---\n\n")}
              </pre>
            </div>
          </div>
        ) : null}
        {/* ===== 新增代码 END ===== */}

        <CinematicBlackHole interactive={false} intensity={0.9} opacity={0.22} className="pointer-events-none absolute inset-0" />
        <div className="relative z-10 flex h-full w-full items-center justify-center p-6">
          <div
            className={[
              orbitron.className,
              "w-full max-w-2xl rounded-2xl border border-red-400/30 bg-red-950/40 p-8 shadow-[0_0_120px_rgba(255,0,0,0.18)] backdrop-blur",
            ].join(" ")}
          >
            <div className="text-center text-2xl font-semibold text-red-200">❌ 严重错误</div>
            <div className="mt-4 text-center text-sm text-red-100/80">
              ❌ 找不到解压后的 Unity 文件！请在 Unity 中禁用 Compression Format 并重新 Build！
            </div>
            <div className="mt-6 flex justify-center">
              <Button asChild className="bg-white/10 text-white hover:bg-white/15">
                <Link href="/lobby">返回大厅</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white">
      {/* ===== 新增代码 START ===== */}
      {errorLog.length ? (
        <div className="fixed left-0 right-0 top-0 z-50 max-h-[45vh] overflow-auto bg-red-500/20 p-3">
          <div className="rounded-lg bg-white p-3">
            <div className="mb-2 text-sm font-semibold text-red-600">Runtime Errors</div>
            <pre className="whitespace-pre-wrap break-words text-xs text-red-700">{errorLog.join("\n\n---\n\n")}</pre>
          </div>
        </div>
      ) : null}
      {/* ===== 新增代码 END ===== */}

      <CinematicBlackHole interactive={false} intensity={0.95} opacity={0.3} className="pointer-events-none absolute inset-0" />
      {loaderCheckState === "ok" ? (
        resolvedBuildUrls ? (
          <UnityBattle
            ref={unityBattleRef}
            router={router}
            token={token}
            userId={userId}
            currentRoomId={currentRoomId}
            selectedClass={selectedClass}
            buildUrls={resolvedBuildUrls}
          />
        ) : null
      ) : (
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          <div className="w-full max-w-2xl px-6">
            <div className="mx-auto rounded-2xl border border-white/10 bg-black/45 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_90px_rgba(142,45,226,0.14)] backdrop-blur">
              <div className={[orbitron.className, "text-center"].join(" ")}>
                <div className="text-xs tracking-[0.35em] text-white/50">ASTER NOVA</div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-cyan-100 drop-shadow-[0_0_18px_rgba(142,45,226,0.20)]">
                  启动预检中… <span className="ml-2 text-white/70">{precheckLoadingText}</span>
                </div>
                <div className="mt-4 text-sm text-white/65">正在探测 Unity loader 资源是否可访问</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

