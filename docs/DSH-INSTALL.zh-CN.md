# 在 DeepSeek Harness（DSH）中安装 Gamer

## 安装方式

Gamer 是 DSH 原生插件包，不是独立的 Windows EXE，也不是直接从 GitHub 源码安装。

桌面版 DSH：
1. 打开 DSH。
2. 进入侧边栏 **Plugins（插件）**。
3. 点击 **Add plugin（添加插件）**。
4. 输入 npm 包名：`@sususgh/gamer-dsh-plugin`。
5. 安装完成后重启 DSH。
6. 在侧边栏打开 **插件（Plugins）**，进入 **已安装插件（Installed plugins）**，选择 **Gamer 游戏智能体**，即可看到插件配置页。页面右上角可切换简体中文和 English。

不要填写 GitHub 仓库 URL。DSH 插件包通过 npm 分发，GitHub 仓库用于源码和开发。

## 当前功能状态

当前包提供：
- DSH 原生 Bundle 清单与插件入口。
- 插件详情页配置界面（简体中文 / English 切换）。
- Android 二维码配对状态区（当前会明确显示配对服务尚未接入，不会生成假二维码）。
- `gamer_project_status` 状态查询工具。

当前尚未提供：
- 桌面端配对服务器与真实二维码生成。
- Windows 游戏控制运行时。
- Android APK 与二维码配对服务。
- 实际屏幕采集、OCR、目标检测和视觉模型管线。
- 键鼠/触控动作执行。
- 联机攻略检索与语音运行时。

因此，安装成功表示 DSH 已加载插件，不表示已经可以自动玩游戏。

## CLI 安装（非桌面托管 profile）

对于由 CLI 管理的 profile，可运行：

```bash
npx -y @deepseek-ai/dsh plugin --profile web add @sususgh/gamer-dsh-plugin@1.0.1
```

桌面版 DSH 的 desktop profile 应在应用内 Plugins → Add plugin 安装。

## 验证

重启 DSH 后，在新会话中让模型调用 `gamer_project_status`。正确结果应显示：
- `pluginLoaded: true`
- `canControlGames: false`

若状态工具不存在，检查插件是否安装到当前 DSH profile，并确认 DSH 版本支持 npm bundle 插件。
