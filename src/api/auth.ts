import axios, { AxiosError } from "axios"

// ===== 新增代码 START =====
// 使用 Next.js 本地代理路径，避免直接访问 127.0.0.1:8081，彻底规避浏览器 Private Network / CORS 报错
const API_BASE_URL = "/api/proxy"

export const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})
// ===== 新增代码 END =====

type ApiErrorBody = {
  error?: string
  message?: string
}

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<ApiErrorBody>
    const body = axErr.response?.data
    return (
      body?.error ||
      body?.message ||
      axErr.response?.statusText ||
      axErr.message ||
      "请求失败"
    )
  }
  if (err instanceof Error) return err.message
  return "请求失败"
}

export async function sendCode(email: string): Promise<{ message: string }> {
  const res = await authApi.post("/send_code", { email })
  return res.data as { message: string }
}

export async function register(
  username: string,
  password: string,
  email: string,
  code: string,
): Promise<{ id: number; message: string }> {
  const res = await authApi.post("/register", { username, password, email, code })
  return res.data as { id: number; message: string }
}

export async function login(
  username: string,
  password: string,
): Promise<{ message: string; token: string }> {
  const res = await authApi.post("/login", { username, password })
  return res.data as { message: string; token: string }
}

