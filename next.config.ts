import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: "/unity/Build/:file*\\.data\\.gz",
        headers: [
          { key: "Content-Type", value: "application/octet-stream" },
          { key: "Content-Encoding", value: "gzip" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/unity/Build/:file*\\.framework\\.js\\.gz",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Content-Encoding", value: "gzip" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/unity/Build/:file*\\.wasm\\.gz",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Content-Encoding", value: "gzip" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  // ===== 新增代码 START =====
  // 通过 Next.js Rewrite 将前端 /api/proxy/:path* 请求代理到本地 Go 网关，消除浏览器的 Private Network / CORS 报错
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: "http://127.0.0.1:8081/api/v1/:path*",
      },
    ];
  },
  // ===== 新增代码 END =====
};

export default nextConfig;
