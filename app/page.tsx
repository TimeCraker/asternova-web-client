"use client"

import { useRouter } from "next/navigation"

import { CinematicBlackHole } from "@/src/components/CinematicBlackHole"

// ===== 新增代码 START =====
// 主页蓝紫黑洞重构：倾斜 30° + 鼠标跟随 + 极简深空背景
export default function Home() {
  const router = useRouter()

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-transparent text-white">
      <style>{`
        .aster-title {
          background: linear-gradient(120deg, rgba(56,189,248,0.95), rgba(168,85,247,0.95), rgba(99,102,241,0.95));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .aster-slogan {
          color: rgba(255,255,255,0.55);
          text-shadow: 0 0 14px rgba(255,255,255,0.06);
        }
      `}</style>

      {/* ===== 新增代码 START ===== */}
      {/* 黑洞作为绝对背景：Three.js ShaderMaterial + Bloom 后期 */}
      <CinematicBlackHole
        interactive
        intensity={1}
        opacity={0.9}
        className="pointer-events-none absolute inset-0"
      />
      {/* ===== 新增代码 END ===== */}

      {/* 内容 */}
      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center px-6 text-center">
        <div className="mt-[46vh] sm:mt-[48vh]" />

        <h1 className="aster-title text-3xl font-semibold tracking-[0.22em] sm:text-4xl">ASTERNOVA STUDIO</h1>
        <p className="aster-slogan mt-3 text-sm sm:text-base">Reach Beyond the Stars</p>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="group relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-300 via-violet-400 to-indigo-400 px-10 py-3 text-sm font-semibold text-black shadow-[0_0_44px_rgba(168,85,247,0.25)] transition duration-300 hover:scale-[1.03] hover:shadow-[0_0_70px_rgba(56,189,248,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            <span className="relative z-10 flex items-center gap-2">
              <span className="text-[0.95rem]">开始自由探索（登录Login）</span>
              <span className="mt-[1px] text-xs opacity-80">↗</span>
            </span>
            <span className="pointer-events-none absolute inset-[1px] rounded-full bg-black/10 transition group-hover:bg-black/15" />
            <span className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(120deg,rgba(255,255,255,0.0),rgba(255,255,255,0.32),rgba(255,255,255,0.0))] opacity-0 blur-[1px] transition duration-500 group-hover:opacity-100 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  )
}
// ===== 新增代码 END =====
