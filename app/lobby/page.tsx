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

    const ws = new WebSocket(`ws://127.0.0.1:8081/ws?token=${encodeURIComponent(token)}`)
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

          try {
            ws.close()
          } catch {
            // ignore
          }

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

    ws.onclose = () => {
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

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-8 px-6 py-10 md:grid-cols-[1fr_1.8fr]">
        <section className="flex flex-col gap-4">
          <div className="text-xs tracking-widest text-white/50">ASTER NOVA LOBBY</div>
          <div className="text-3xl font-semibold tracking-tight">
            Welcome, <span className="text-cyan-200">{username || "Anonymous"}</span>
          </div>

          <Card className="border-white/10 bg-black/55 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_0_80px_rgba(56,189,248,0.08)] backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">当前状态</CardTitle>
              <CardDescription className="text-white/65">选择职业并开启匹配。Reach Beyond the Stars.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-white/60">UserId</span>
                <span className="font-mono text-white/85">{userId || "-"}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-white/60">Selected</span>
                <span className="font-mono text-white/85">{selectedClass}</span>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-2xl font-semibold tracking-tight">选择你的职业</div>
              <div className="mt-1 text-sm text-white/60">点击卡片切换职业，将同步写入全局状态。</div>
            </div>
            <div className="hidden text-xs text-white/40 md:block">右下角开始匹配</div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ROLES.map((role) => {
              const active = selectedClass === role.id
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedClass(role.id)}
                  className="text-left"
                >
                  <Card
                    className={[
                      "relative h-full border-white/10 bg-black/45 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05)] backdrop-blur transition",
                      "hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_0_60px_rgba(56,189,248,0.10)]",
                      active
                        ? "ring-1 ring-cyan-300/40 shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_0_80px_rgba(34,211,238,0.18)]"
                        : "",
                    ].join(" ")}
                  >
                    <div className={["pointer-events-none absolute inset-0 bg-gradient-to-br", role.accentClassName].join(" ")} />
                    <CardHeader className="relative">
                      <CardTitle className="flex items-center justify-between">
                        <span>{role.name}</span>
                        <span
                          className={[
                            "rounded-full border px-2 py-0.5 text-xs",
                            active ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/5 text-white/55",
                          ].join(" ")}
                        >
                          {active ? "已选中" : "点击选择"}
                        </span>
                      </CardTitle>
                      <CardDescription className="text-white/65">{role.tagline}</CardDescription>
                    </CardHeader>
                    <CardContent className="relative">
                      <ul className="space-y-1.5 text-sm text-white/75">
                        {role.highlights.map((h) => (
                          <li key={h} className="flex items-center gap-2">
                            <span className="inline-block size-1.5 rounded-full bg-white/30" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </button>
              )
            })}
          </div>
        </section>
      </div>

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
