# anti-ai macOS 桌面伴生端

这个独立 Swift/AppKit Package 是 anti-ai v4.2 的正式原生展示适配器。它位于 npm
包之外，只消费 CLI 生成的隐私安全 `Desktop Snapshot v1`。

[English](./README.md) · [完整桌面指南](../../docs/desktop.zh-CN.md)

## 使用应用

下载版需要 macOS 14 或更高版本。安装 CLI、把 `anti-ai.app` 拖入“应用程序”，然后创建
私有的一次性 bridge 和首份快照：

```bash
npm install -g anti-ai
anti-ai desktop link
```

150 × 140 pt 的异变体默认可以拖动：单击显示不抢焦点的快照摘要，拖拽移动，双击进入
建议对应的 TUI 白名单区域。菜单顶层保留状态、刷新和完整 TUI；位置、展示态、动态、
中英文以及手动/自动更新统一放入“设置”。屏幕休眠时会暂停，遵循系统“减少动态效果”，
其他应用占据全屏时自动隐藏。自动检查默认关闭，只有用户明确开启后才生效。

菜单会明确区分快照缺失、不合法、版本不兼容、已过期、刷新中和刷新失败。刷新失败时
保留上一份有效本体。视觉结构由 Node 已经派生的阶段、路线、病理、配色、异色、伤疤、
嫁接信息及全部 40 种基础器官确定性组合，不在 Swift 中复制成长规则。

v4.2.0 下载版是明确的临时未公证预览版，只使用 ad-hoc 签名。首次启动被拦截后，可能
需要前往**系统设置 → 隐私与安全性 → 仍要打开**；请只从官方 GitHub Release 下载。
Sparkle 更新归档带有 Ed25519 签名，但它不能替代 Apple Developer ID 身份或公证。

## 开发与验证

需要 macOS 14 或更高版本，以及带 Swift 6.1 或更高版本的 Xcode Command Line Tools。

```bash
cd apps/macos
swift format lint --recursive --strict Sources Tests
swift test
swift run AntiAIDesktop
./scripts/measure-runtime.sh 10 1
./scripts/build-release.sh 4.2.0
```

发布脚本会构建 arm64/x86_64 通用 app、DMG 与 Sparkle 更新 ZIP，完成嵌套组件签名、
架构和体积校验，并验证可见窗口启动与进程干净退出。没有发布凭据时使用 ad-hoc 签名、
禁用更新入口，只生成本地正式候选。v4.2 预览分发必须配置 Sparkle Ed25519 密钥、签名
appcast，并显式设置 `ANTI_AI_ALLOW_UNNOTARIZED_RELEASE=1`；稳定公开分发还必须完成
Developer ID 签名、公证、staple 和真机验收，所需环境变量与门禁见完整桌面指南。

## 隐私和架构边界

桌面进程从不解析 Agent 日志，也不拥有 Scanner、结算、成长、门诊、访客、远征或行动
规则。它只能读取快照，并通过经过校验的 Node/CLI 绝对路径执行固定的一次性刷新或 TUI
动作。这里不引入 daemon、登录项、遥测、hook 或任意 Shell 执行。隔离更新器只有在
手动检查或用户明确开启后才访问 HTTPS 更新源，系统画像关闭；CLI 仍是独立 npm 安装。
