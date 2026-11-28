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


## 启动电脑端二维码生成器（Windows / Linux）

要求：Node.js 22.13 或更高版本。电脑和手机需要连接同一个可信任的局域网。

**Windows PowerShell：**

```powershell
git clone https://github.com/sususgh/Gamer-DSH-Plugin.git
cd Gamer-DSH-Plugin\desktop-runtime
npm install
npm start
```

**Linux（Debian / Ubuntu 等）：**

```bash
git clone https://github.com/sususgh/Gamer-DSH-Plugin.git
cd Gamer-DSH-Plugin/desktop-runtime
npm install
npm start
```

启动后在电脑浏览器打开 `http://127.0.0.1:8765`，选择手机能够访问的电脑局域网地址，点击 **生成二维码**。二维码有效期为 5 分钟，可手动撤销。Windows 防火墙如弹出提示，只允许在可信的专用网络中访问。

手机相机扫码后会打开电脑的配对验证页。当前阶段实现的是**电脑端真实二维码生成与扫码落地页验证**；Android Companion 尚未实现设备认证和会话握手，因此扫码成功不代表设备已连接，也不能开始游戏控制。不要将该 HTTP 服务或端口映射到公网。

## 当前功能状态

当前包提供：
- DSH 原生 Bundle 清单与插件入口。
- 插件详情页配置界面（简体中文 / English 切换）。
- 独立电脑端配对服务：可在 Windows / Linux 上启动本地服务并生成真实二维码（见下方步骤）。
- `gamer_project_status` 状态查询工具。

当前尚未提供：
- Android Companion 的扫码客户端、设备身份提交与双端认证。
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
