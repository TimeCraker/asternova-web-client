"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useGameStore } from "@/src/store/useGameStore"

type RoleOption = {
  id: string
  name: string
  tagline: string
  highlights: string[]
  accentClassName: string
}

const ROLES: RoleOption[] = [
  {
    id: "Role1_Speedster",
    name: "极速者",
    tagline: "光速突进，先手压制",
    highlights: ["高机动", "强突袭", "灵活走位"],
    accentClassName: "from-cyan-400/20 via-sky-400/10 to-transparent",
  },
  {
    id: "Role2_Cursemancer",
    name: "诅咒师",
    tagline: "侵蚀心智，持续消耗",
    highlights: ["减益叠加", "控场", "反制爆发"],
    accentClassName: "from-violet-400/20 via-fuchsia-400/10 to-transparent",
  },
  {
    id: "Role3_Reviver",
    name: "复苏者",
    tagline: "逆转战局，守护同伴",
    highlights: ["治疗增益", "续航", "节奏掌控"],
    accentClassName: "from-emerald-400/18 via-green-400/10 to-transparent",
  },
  {
    id: "Role4_Bulwark",
    name: "重装卫士",
    tagline: "坚壁不摧，正面推进",
    highlights: ["高防御", "嘲讽牵制", "阵地战"],
    accentClassName: "from-amber-400/18 via-orange-400/10 to-transparent",
  },
]

export default function LobbyPage() {
  const router = useRouter()

  const username = useGameStore((s) => s.username)
  const token = useGameStore((s) => s.token)
  const userId = useGameStore((s) => s.userId)

  const selectedClass = useGameStore((s) => s.selectedClass)
  const setSelectedClass = useGameStore((s) => s.setSelectedClass)

  const setCurrentRoomId = useGameStore((s) => s.setCurrentRoomId)

  const wsRef = React.useRef<WebSocket | null>(null)
  const matchingTimeoutRef = React.useRef<number | null>(null)
  const [matching, setMatching] = React.useState(false)
  // ===== 新增代码 START =====
  // 右侧 Edius 风格列表：用于滚动定位当前选中的职业
  const roleItemRefs = React.useRef<Record<string, HTMLButtonElement | null>>({})
  const selectedRole = React.useMemo(() => ROLES.find((r) => r.id === selectedClass) || ROLES[0], [selectedClass])
  // ===== 新增代码 END =====

  // ===== 新增代码 START =====
  // 路由守卫：未登录用户访问大厅时强制跳转到登录页并提示
  React.useEffect(() => {
    if (!token || !userId) {
      toast.error("请先登录")
      router.replace("/login")
    }
  }, [token, userId, router])
  // ===== 新增代码 END =====

  React.useEffect(() => {
    return () => {
      if (matchingTimeoutRef.current) {
        window.clearTimeout(matchingTimeoutRef.current)
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
      wsRef.current = null
    }
  }, [])

  function connectAndMatch() {
    if (matching) return
    if (!token) {
      toast.error("缺少 token，请先登录")
      router.push("/login")
      return
    }
    if (!userId) {
      toast.error("缺少 userId，请重新登录")
      router.push("/login")
      return
    }

    setMatching(true)

    const ws = new WebSocket(
      `ws://127.0.0.1:8081/ws?token=${encodeURIComponent(token)}&scope=lobby`,
    )
    wsRef.current = ws

    ws.onopen = () => {
      try {
        ws.send(JSON.stringify({ type: "match_req", user_id: userId }))
      } catch {
        toast.error("发起匹配失败：消息发送异常")
        setMatching(false)
        ws.close()
      }
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data ?? "")) as { type?: string; room_id?: string }
        if (msg?.type === "match_success" && typeof msg.room_id === "string" && msg.room_id) {
          setCurrentRoomId(msg.room_id)
          toast.success("匹配成功！正在建立战场链接...")
          // 不在这里手动 close，交给路由切换后的 cleanup 自然释放，避免“刚匹配就断链”误判

          matchingTimeoutRef.current = window.setTimeout(() => {
            router.push("/arena")
          }, 1500)
        }
      } catch {
        // ignore non-json messages
      }
    }

    ws.onerror = () => {
      toast.error("匹配连接失败，请稍后重试")
      setMatching(false)
      try {
        ws.close()
      } catch {
        // ignore
      }
    }

    ws.onclose = (ev) => {
      // eslint-disable-next-line no-console
      console.debug("[LobbyWS] closed", {
        code: ev.code,
        reason: ev.reason,
        wasClean: ev.wasClean,
      })
      wsRef.current = null
      setMatching(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(circle_at_20%_25%,black,transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(56,189,248,0.18),transparent_45%),radial-gradient(circle_at_85%_25%,rgba(168,85,247,0.16),transparent_55%),radial-gradient(circle_at_70%_80%,rgba(34,197,94,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-black" />
      </div>

      {/* ===== 新增代码 START ===== */}
      {/* Edius 风大厅：右侧为职业列表，主屏动态展示选中职业信息与动画占位 */}
      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-8 px-6 py-10 md:grid-cols-[1.6fr_0.9fr]">
        {/* 主屏：角色信息与动画占位 */}
        <section className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs tracking-widest text-white/50">ASTER NOVA LOBBY</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">
                Welcome, <span className="text-cyan-200">{username || "Anonymous"}</span>
              </div>
              <div className="mt-2 text-sm text-white/55">Reach Beyond the Stars</div>
            </div>
            <div className="text-xs text-white/40">右侧滚动选择职业</div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <Card className="border-white/10 bg-black/55 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_0_80px_rgba(56,189,248,0.08)] backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg">角色详细数据 HUD</CardTitle>
                <CardDescription className="text-white/65">
                  根据右侧选中职业，实时切换属性展示与战术要点。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className="text-white/60">UserId</span>
                  <span className="font-mono text-white/85">{userId || "-"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className="text-white/60">Selected</span>
                  <span className="font-mono text-white/85">{selectedRole?.id}</span>
                </div>
                <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-xs text-white/55">职业</div>
                  <div className="mt-1 text-base font-semibold">{selectedRole?.name}</div>
                  <div className="mt-1 text-sm text-white/65">{selectedRole?.tagline}</div>
                </div>
                <ul className="mt-3 space-y-1.5 text-sm text-white/75">
                  {selectedRole?.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2">
                      <span className="inline-block size-1.5 rounded-full bg-white/30" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* 角色动画占位 */}
            <Card className="relative overflow-hidden border-white/10 bg-black/45 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_0_120px_rgba(168,85,247,0.10)] backdrop-blur">
              <style>{`
                @keyframes ediusScan {
                  0% { transform: translateY(-120%); opacity: 0; }
                  14% { opacity: .55; }
                  100% { transform: translateY(120%); opacity: 0; }
                }
                @keyframes ediusFlow {
                  0% { transform: translateX(-30%); opacity: .18; }
                  40% { opacity: .35; }
                  100% { transform: translateX(130%); opacity: 0; }
                }
              `}</style>
              <div className={["pointer-events-none absolute inset-0 bg-gradient-to-br", selectedRole?.accentClassName || ""].join(" ")} />
              <div className="pointer-events-none absolute inset-0 opacity-35 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:52px_52px]" />
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-16"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(56,189,248,0) 0%, rgba(56,189,248,0.18) 35%, rgba(168,85,247,0.0) 100%)",
                  animation: "ediusScan 1.9s ease-in-out infinite",
                }}
              />
              <div
                className="pointer-events-none absolute left-0 top-1/2 h-2 w-28 -translate-y-1/2 rounded-full blur-sm"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(56,189,248,0), rgba(168,85,247,0.65), rgba(99,102,241,0))",
                  animation: "ediusFlow 1.15s linear infinite",
                }}
              />
              <CardHeader className="relative">
                <CardTitle className="text-lg">角色 3D / 多帧插画动画（占位）</CardTitle>
                <CardDescription className="text-white/65">
                  后续将接入多帧插画/骨骼动画资源。当前仅保留展示结构。
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex h-[380px] flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 text-center">
                  <div className="text-xs tracking-[0.35em] text-white/45">3D / FRAMES</div>
                  <div>
                    <div className="mt-2 text-2xl font-semibold">{selectedRole?.name}</div>
                    <div className="mt-2 text-sm text-white/60">占位容器：等待角色模型 / 多帧插画接入</div>
                  </div>
                  <div className="mt-2 h-px w-full max-w-[280px] bg-white/10" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 右侧：Edius 风格职业列表 */}
        <aside className="flex flex-col gap-4">
          <Card className="border-white/10 bg-black/55 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_0_90px_rgba(56,189,248,0.08)] backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">职业列表</CardTitle>
              <CardDescription className="text-white/60">滚动/点击切换职业</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1 scroll-smooth [scrollbar-width:thin] snap-y snap-mandatory">
                {ROLES.map((role) => {
                  const active = selectedClass === role.id
                  return (
                    <button
                      key={role.id}
                      type="button"
                      ref={(el) => {
                        roleItemRefs.current[role.id] = el
                      }}
                      onClick={() => {
                        setSelectedClass(role.id)
                        const el = roleItemRefs.current[role.id]
                        if (el) {
                          try {
                            el.scrollIntoView({ block: "center", behavior: "smooth" })
                          } catch {
                            // ignore
                          }
                        }
                      }}
                      className={[
                        "group relative w-full rounded-xl border px-3 py-3 text-left transition",
                        "bg-black/35 hover:bg-black/45",
                        "snap-center",
                        active
                          ? "border-cyan-300/30 shadow-[0_0_0_1px_rgba(34,211,238,0.20),0_0_44px_rgba(168,85,247,0.12)]"
                          : "border-white/10",
                      ].join(" ")}
                    >
                      <div className={["pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br opacity-70", role.accentClassName].join(" ")} />
                      <div className="relative flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{role.name}</div>
                          <div className="mt-1 text-xs text-white/60">{role.tagline}</div>
                        </div>
                        <div
                          className={[
                            "shrink-0 rounded-full border px-2 py-0.5 text-xs",
                            active ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/5 text-white/55",
                          ].join(" ")}
                        >
                          {active ? "已选中" : "选择"}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
      {/* ===== 新增代码 END ===== */}

      <div className="fixed right-6 bottom-6 z-20">
        <Button
          type="button"
          size="lg"
          disabled={matching}
          onClick={connectAndMatch}
          className={[
            "relative h-14 px-8 text-base font-semibold text-black",
            "bg-cyan-300 hover:bg-cyan-200",
            "shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_12px_40px_rgba(34,211,238,0.18)]",
            "before:absolute before:inset-0 before:rounded-lg before:bg-[conic-gradient(from_180deg_at_50%_50%,rgba(34,211,238,0.0),rgba(34,211,238,0.35),rgba(168,85,247,0.25),rgba(34,211,238,0.0))] before:opacity-60 before:blur-xl before:content-['']",
            matching ? "cursor-not-allowed" : "animate-[pulse_2.4s_ease-in-out_infinite]",
          ].join(" ")}
        >
          <span className="relative flex items-center gap-2">
            {matching ? (
              <>
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-black/25 border-t-black" />
                <span>寻找对手中...</span>
              </>
            ) : (
              <span>匹配对战</span>
            )}
          </span>
        </Button>
      </div>
    </div>
  )
}
