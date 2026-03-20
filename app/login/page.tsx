"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

import { getApiErrorMessage, login, register, sendCode } from "@/src/api/auth"
import { extractUserIdFromToken } from "@/src/api/jwt"
import { useGameStore } from "@/src/store/useGameStore"
import { BluePurpleBlackhole } from "@/src/components/bluePurpleBlackhole"

export default function LoginPage() {
  const router = useRouter()

  const setToken = useGameStore((s) => s.setToken)
  const setUserId = useGameStore((s) => s.setUserId)
  const setUsername = useGameStore((s) => s.setUsername)

  const [activeTab, setActiveTab] = React.useState<"login" | "register">("login")

  const [loginUsername, setLoginUsername] = React.useState("")
  const [loginPassword, setLoginPassword] = React.useState("")
  const [loginSubmitting, setLoginSubmitting] = React.useState(false)

  const [regUsername, setRegUsername] = React.useState("")
  const [regPassword, setRegPassword] = React.useState("")
  const [regEmail, setRegEmail] = React.useState("")
  const [regCode, setRegCode] = React.useState("")
  const [codeSending, setCodeSending] = React.useState(false)
  const [regSubmitting, setRegSubmitting] = React.useState(false)

  // ===== 新增代码 START =====
  // 登录/注册表单前端校验：用户名长度与密码复杂度
  function validateUsername(name: string): string | null {
    if (!name) {
      return "用户名不能为空"
    }
    if (name.length > 10) {
      return "用户名长度不能超过 10 位"
    }
    return null
  }

  function validatePassword(pwd: string): string | null {
    if (!pwd) {
      return "密码不能为空"
    }
    const re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,20}$/
    if (!re.test(pwd)) {
      return "密码需为 6-20 位字母+数字组合"
    }
    return null
  }
  // ===== 新增代码 END =====

  async function onSubmitLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!loginUsername || !loginPassword) {
      toast.error("请输入用户名与密码")
      return
    }

    // ===== 新增代码 START =====
    const usernameErr = validateUsername(loginUsername)
    if (usernameErr) {
      toast.error(usernameErr)
      return
    }
    const passwordErr = validatePassword(loginPassword)
    if (passwordErr) {
      toast.error(passwordErr)
      return
    }
    // ===== 新增代码 END =====

    setLoginSubmitting(true)
    try {
      const res = await login(loginUsername, loginPassword)
      const userId = extractUserIdFromToken(res.token)

      setToken(res.token)
      setUserId(userId)
      setUsername(loginUsername)

      toast.success("登录成功")
      router.push("/lobby")
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setLoginSubmitting(false)
    }
  }

  async function onSendCode() {
    if (!regEmail) {
      toast.error("请先填写邮箱")
      return
    }
    setCodeSending(true)
    try {
      const res = await sendCode(regEmail)
      toast.success(res.message || "验证码已发送")
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setCodeSending(false)
    }
  }

  async function onSubmitRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!regUsername || !regPassword || !regEmail || !regCode) {
      toast.error("请完整填写注册信息")
      return
    }

    // ===== 新增代码 START =====
    const regUsernameErr = validateUsername(regUsername)
    if (regUsernameErr) {
      toast.error(regUsernameErr)
      return
    }
    const regPasswordErr = validatePassword(regPassword)
    if (regPasswordErr) {
      toast.error(regPasswordErr)
      return
    }
    // ===== 新增代码 END =====

    setRegSubmitting(true)
    try {
      const res = await register(regUsername, regPassword, regEmail, regCode)
      toast.success(res.message || "注册成功")
      setActiveTab("login")
      setLoginUsername(regUsername)
      setLoginPassword("")
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setRegSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-transparent">
      {/* ===== 新增代码 START ===== */}
      {/* 主页同款蓝紫黑洞动效：作为登录页底层背景（保持原布局） */}
      <BluePurpleBlackhole className="pointer-events-none absolute inset-0 opacity-30" intensity={0.8} interactive={false} />
      {/* ===== 新增代码 END ===== */}

      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.18),transparent_50%),radial-gradient(circle_at_40%_80%,rgba(34,197,94,0.10),transparent_45%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-black" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <Card className="border-white/10 bg-black/55 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_0_60px_rgba(56,189,248,0.10)] backdrop-blur">
          <CardHeader>
            {/* AsterNova Studio 渐变艺术字 Logo */}
            {/* ===== 新增代码 START ===== */}
            <style>{`
              .asternova-logo-text {
                background: linear-gradient(120deg, #ffb6c1, #ff6ad5, #a855f7, #60a5fa);
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
              }
            `}</style>
            <div className="mb-3">
              <div className="asternova-logo-text text-2xl font-semibold tracking-[0.18em]">
                ASTERNOVA STUDIO
              </div>
            </div>
            {/* ===== 新增代码 END ===== */}
            <CardTitle className="text-xl tracking-tight">AsterNova Access</CardTitle>
            <CardDescription className="text-white/70">
              Reach Beyond the Stars. 登录或注册以进入星际大厅。
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2 bg-white/5">
                <TabsTrigger value="login">登录</TabsTrigger>
                <TabsTrigger value="register">注册</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <form className="space-y-4" onSubmit={onSubmitLogin}>
                  <div className="space-y-2">
                    <Label htmlFor="login-username" className="text-white/80">
                      用户名
                    </Label>
                    <Input
                      id="login-username"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      autoComplete="username"
                      className="border-white/10 bg-black/40 text-white placeholder:text-white/30"
                      placeholder="输入你的用户名"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-white/80">
                      密码
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                      className="border-white/10 bg-black/40 text-white placeholder:text-white/30"
                      placeholder="输入你的密码"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-cyan-400/90 text-black hover:bg-cyan-300"
                    disabled={loginSubmitting}
                  >
                    {loginSubmitting ? "登录中..." : "登录"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-6">
                <form className="space-y-4" onSubmit={onSubmitRegister}>
                  <div className="space-y-2">
                    <Label htmlFor="reg-username" className="text-white/80">
                      用户名
                    </Label>
                    <Input
                      id="reg-username"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      autoComplete="username"
                      className="border-white/10 bg-black/40 text-white placeholder:text-white/30"
                      placeholder="为自己起一个星际代号"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-white/80">
                      密码
                    </Label>
                    <Input
                      id="reg-password"
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      autoComplete="new-password"
                      className="border-white/10 bg-black/40 text-white placeholder:text-white/30"
                      placeholder="设置一个安全的密码"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-white/80">
                      邮箱
                    </Label>
                    <Input
                      id="reg-email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      autoComplete="email"
                      className="border-white/10 bg-black/40 text-white placeholder:text-white/30"
                      placeholder="用于接收验证码"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="reg-code" className="text-white/80">
                        验证码
                      </Label>
                      <Input
                        id="reg-code"
                        value={regCode}
                        onChange={(e) => setRegCode(e.target.value)}
                        inputMode="numeric"
                        className="border-white/10 bg-black/40 text-white placeholder:text-white/30"
                        placeholder="6 位验证码"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full bg-white/10 text-white hover:bg-white/15"
                        onClick={onSendCode}
                        disabled={codeSending}
                      >
                        {codeSending ? "发送中..." : "发送验证码"}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-violet-400/90 text-black hover:bg-violet-300"
                    disabled={regSubmitting}
                  >
                    {regSubmitting ? "注册中..." : "注册"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

