"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Orbitron } from "next/font/google"
import { Unity, useUnityContext } from "react-unity-webgl"

import { Button } from "@/components/ui/button"
import { useGameStore } from "@/src/store/useGameStore"

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

export default function ArenaPage() {
  const router = useRouter()

  const token = useGameStore((s) => s.token)
  const userId = useGameStore((s) => s.userId)
  const currentRoomId = useGameStore((s) => s.currentRoomId)
  const selectedClass = useGameStore((s) => s.selectedClass)

  // ===== Unity WebGL 资源路径嗅探结果 =====
  // 嗅探结果：public/unity/Build 下存在压缩资源：
  // - Build.data.gz / Build.framework.js.gz / Build.wasm.gz
  // - Build.loader.js（未压缩）
  const buildBase = "/unity/Build"
  const loaderUrl = `${buildBase}/Build.loader.js`
  const dataUrl = `${buildBase}/Build.data.gz`
  const frameworkUrl = `${buildBase}/Build.framework.js.gz`
  const codeUrl = `${buildBase}/Build.wasm.gz`

  const { unityProvider, isLoaded, loadingProgression, sendMessage } = useUnityContext({
    loaderUrl,
    dataUrl,
    frameworkUrl,
    codeUrl,
  })

  const sentRef = React.useRef(false)
  const percent = Math.max(0, Math.min(100, Math.round((loadingProgression ?? 0) * 100)))

  React.useEffect(() => {
    if (!isLoaded) return
    if (sentRef.current) return
    sentRef.current = true

    if (!token || !userId || !currentRoomId || !selectedClass) {
      toast.error("缺少进入战场所需数据，将返回大厅")
      router.push("/lobby")
      return
    }

    const payload = `${token}|${userId}|${currentRoomId}|${selectedClass}`
    try {
      sendMessage("GameManager", "EnterBattle", payload)
    } catch {
      toast.error("跨端通信失败：无法向 Unity 注入战场参数")
    }
  }, [isLoaded, token, userId, currentRoomId, selectedClass, sendMessage, router])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white">
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

      {isLoaded ? (
        <>
          <div className="absolute left-4 top-4 z-20">
            <Button
              asChild
              variant="secondary"
              className="border border-white/12 bg-black/40 text-white backdrop-blur-md shadow-[0_0_0_1px_rgba(255,255,255,0.06)] hover:bg-black/55 hover:shadow-[0_0_0_1px_rgba(0,229,255,0.18),0_0_24px_rgba(142,45,226,0.14)]"
            >
              <Link href="/lobby">紧急撤离（返回大厅）</Link>
            </Button>
          </div>

          <div className="h-full w-full">
            <Unity
              unityProvider={unityProvider}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                background: "black",
              }}
            />
          </div>
        </>
      ) : (
        <div className="relative flex h-full w-full items-center justify-center">
          {/* 背景：深黑 + 赛博渐变能量场 */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-black" />
            <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_15%_30%,rgba(255,105,180,0.12),transparent_45%),radial-gradient(circle_at_60%_40%,rgba(142,45,226,0.16),transparent_50%),radial-gradient(circle_at_85%_70%,rgba(0,229,255,0.14),transparent_55%)]" />
            <div className="absolute inset-0 opacity-55 bg-[linear-gradient(45deg,rgba(255,105,180,0.10),rgba(142,45,226,0.18),rgba(0,229,255,0.10))]" />
            <div className="absolute inset-0 opacity-35 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:52px_52px]" />
          </div>

          {/* 中央 HUD */}
          <div className="relative w-full max-w-2xl px-6">
            <div className="mx-auto rounded-2xl border border-white/10 bg-black/45 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_90px_rgba(142,45,226,0.14)] backdrop-blur">
              <div className={[orbitron.className, "text-center"].join(" ")}>
                <div className="text-xs tracking-[0.35em] text-white/50">ASTER NOVA</div>
                <div
                  className={[
                    "mt-3 text-2xl font-semibold tracking-tight cyberText",
                    "drop-shadow-[0_0_18px_rgba(142,45,226,0.20)]",
                  ].join(" ")}
                >
                  ASTERONA 核心引擎启动中…
                </div>

                <div className="mt-6 text-sm text-white/65">
                  正在注入运行时数据流，请稍候
                </div>

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
                          style={{
                            opacity: i === 0 || i === 12 ? 0.35 : 0.55,
                          }}
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
                      若一直卡在加载：请把 Unity WebGL 导出的 <span className="font-mono text-white/70">Build.data / Build.framework.js / Build.wasm</span>（或对应的 <span className="font-mono text-white/70">.unityweb</span>）补齐到 <span className="font-mono text-white/70">public/unity/Build/</span>。
                    </div>
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
      )}
    </div>
  )
}

