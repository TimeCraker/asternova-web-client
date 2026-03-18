import axios, { AxiosError } from "axios"

const API_BASE_URL = "http://127.0.0.1:8081/api/v1"

export const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

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

