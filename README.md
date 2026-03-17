# 🌌 AsterNova Web Client (星界新星 - 网页大厅端)

> **"Reach Beyond the Stars"** AsterNova 采用现代化的**双端分离架构 (The Great Decoupling)**，本仓库为游戏的前端 UI 与微服务交互大厅。
前端负责所有非战斗逻辑（账号鉴权、大厅交互、职业选择、匹配调度），底层通过 WebGL 无缝挂载 Unity 核心战斗引擎。

## 🛠 技术栈 (Tech Stack)
- **核心框架**: [Next.js 14](https://nextjs.org/) (App Router) + React
- **样式方案**: [Tailwind CSS](https://tailwindcss.com/)
- **UI 组件库**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
- **状态管理**: [Zustand](https://github.com/pmndrs/zustand)
- **网络通信**: Axios (HTTP) + 原生 WebSocket (匹配引擎)
- **游戏桥接**: react-unity-webgl

## 📂 架构概览 (Architecture)
1. **鉴权层**: 与 Go 后端对接，完成 Login/Register，JWT Token 浏览器持久化。
2. **大厅层**: 纯 Web 实现的高性能 3D/2D 选角与匹配大厅。
3. **调度层**: 前端 WebSocket 连接网关完成匹配，拿到 `RoomID` 后，唤醒沉睡的 Unity 组件。
4. **战斗层 (Unity)**: 纯粹的 60fps 物理碰撞与帧同步容器。

## 🚀 快速启动 (Getting Started)

```bash
# 安装依赖
npm install

# 启动本地开发服务器
npm run dev